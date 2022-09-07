/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// This file contains the logic we use to access Google Cloud Storage, aka GCS.
// Especially it implements two classes for the same interface: one class access
// the real GCS backend while the other class provides a fake service, suitable
// when developing without network or without a GCS account.

import { Storage, Bucket } from '@google-cloud/storage';
import { Writable } from 'stream';

import { getLogger } from '../log';

/**
 * This is the interface we implement for outside consumption. This is very
 * simple because we don't need a lot of functionality.
 */
interface GcsStorage {
  ping(): Promise<void>;
  getWriteStreamForFile(filePath: string): Writable;
  deleteFile(filePath: string): Promise<unknown>;
}

/**
 * This class reaches the real GCS service.
 */
class RealGcsStorage implements GcsStorage {
  bucket: Bucket;

  constructor(bucket: Bucket) {
    this.bucket = bucket;
  }

  async ping(): Promise<void> {
    const [result] = await this.bucket.exists();
    if (!result) {
      throw new Error(`The bucket ${this.bucket.name} doesn't exist.`);
    }
  }

  getWriteStreamForFile(filePath: string): Writable {
    const file = this.bucket.file(filePath);

    // This uses fast-crc32c under the hood, to compute the crc32c checksum of
    // the sent data and compare with the checksum google sends back after
    // upload.
    const googleStorageStream = file.createWriteStream({
      public: true,
      resumable: false,
      gzip: false, // Our content is already gzipped
      metadata: {
        contentType: 'text/plain',
        cacheControl: 'max-age: 365000000, immutable',
        contentEncoding: 'gzip',
      },
    });
    return googleStorageStream;
  }

  deleteFile(filePath: string): Promise<unknown> {
    const file = this.bucket.file(filePath);
    return file.delete();
  }
}

/**
 * This class implements a fake service.
 */
class MockGcsStorage implements GcsStorage {
  ping() {
    return Promise.resolve();
  }

  getWriteStreamForFile() {
    // We create a Writable stream that just consumes everything.
    const sinkWriteStream = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });
    return sinkWriteStream;
  }

  deleteFile(_filePath: string): Promise<unknown> {
    return Promise.resolve();
  }
}

type GcsConfig = Readonly<{
  // If the string 'MOCKED' is passed then the mocked service is returned.
  googleAuthenticationFilePath: string,
  gcsBucket: string,
}>;

/**
 * This is the way to access one of the two implementations, depending on the
 * parameter.
 */
export function create(config: GcsConfig): GcsStorage {
  const log = getLogger('logic.gcs.create');
  const googleAuthenticationFilePath = config.googleAuthenticationFilePath;
  if (googleAuthenticationFilePath === 'MOCKED') {
    log.debug('gcs_mocked', 'Returning the mocked Storage backend.');
    return new MockGcsStorage();
  }

  const gcsBucket = config.gcsBucket;
  if (!gcsBucket) {
    throw new Error('The bucket name should not be empty');
  }

  log.debug('gcs_real', 'Returning the real Storage backend.');
  const storage = new Storage({
    keyFilename: googleAuthenticationFilePath,
  });
  const bucket = storage.bucket(gcsBucket);

  return new RealGcsStorage(bucket);
}
