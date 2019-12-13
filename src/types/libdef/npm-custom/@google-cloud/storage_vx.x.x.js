/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// In this file we type only the API we use in the project. If we use more API
// later this will need to be completed.

declare module '@google-cloud/storage' {
  // Source: https://googleapis.dev/nodejs/storage/latest/global.html#CreateWriteStreamOptions
  declare type CreateWriteStreamOptions = {|
    configPath: string,
    contentType: string,
    gzip: boolean | 'auto',
    metadata: { ... },
    offset: number,
    predefinedAcl: string,
    private: boolean,
    public: boolean,
    resumable: boolean,
    uri: string,
    userProject: string,
    validation: 'md5' | 'crc32c' | false,
  |};
  // Source: https://googleapis.dev/nodejs/storage/latest/File.html
  declare export class File {
    constructor(
      bucket: Bucket,
      name: string,
      options?: $Shape<{|
        encryptionKey: string,
        generation: number,
        kmsKeyName: string,
        userProject: string,
      |}>
    ): File;

    // Source: https://googleapis.dev/nodejs/storage/latest/File.html#createWriteStream
    createWriteStream(
      options?: $Shape<CreateWriteStreamOptions>
    ): stream$Writable;
  }

  // Source: https://googleapis.dev/nodejs/storage/latest/Bucket.html
  declare export class Bucket {
    name: string;

    constructor(
      storage: Storage,
      name: string,
      options?: $Shape<{| userProject: string |}>
    ): Bucket;

    // Source: https://googleapis.dev/nodejs/storage/latest/Bucket.html#exists
    exists(
      options?: $Shape<{| userProject: string |}>,
      callback?: (err: ?Error, exists: boolean) => mixed
    ): Promise<[boolean]>;

    // Source: https://googleapis.dev/nodejs/storage/latest/Bucket.html#file
    file(
      name: string,
      options?: $Shape<{|
        generation: string | number,
        encryptionKey: string,
        kmsKeyName: string,
      |}>
    ): File;
  }

  // Source: https://googleapis.dev/nodejs/storage/latest/global.html#StorageOptions
  declare type StorageOptions = {|
    projectId: string,
    keyFilename: string,
    email: string,
    credentials: $Shape<{|
      client_email: string,
      private_key: string,
    |}>,
    autoRetry: boolean,
    maxRetries: number,
    promise: typeof Promise,
  |};

  // Source: https://googleapis.dev/nodejs/storage/latest/Storage.html
  declare export class Storage {
    constructor(options: ?$Shape<StorageOptions>): Storage;

    // Source: https://googleapis.dev/nodejs/storage/latest/Storage.html#bucket
    bucket(
      name: string,
      options?: $Shape<{| kmsKeyName: string, userProject: string |}>
    ): Bucket;
  }
}
