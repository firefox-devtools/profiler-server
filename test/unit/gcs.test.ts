/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Writable } from 'stream';

import { Storage as MockStorage } from '../../__mocks__/@google-cloud/storage';
import { Bucket } from '@google-cloud/storage';

import { create as gcsStorageCreate } from '../../src/logic/gcs';

beforeEach(() => MockStorage.cleanUp());
afterEach(() => MockStorage.cleanUp());

describe('logic/gcs', () => {
  it('creates a mock service when using the value "MOCKED"', async () => {
    jest.spyOn(Bucket.prototype, 'exists');
    jest.spyOn(Bucket.prototype, 'file');
    const storage = gcsStorageCreate({
      googleAuthenticationFilePath: 'MOCKED',
      gcsBucket: '',
    });

    // This call shouldn't throw nor timeout.
    await storage.ping();
    expect(Bucket.prototype.exists).not.toHaveBeenCalled();

    expect(storage.getWriteStreamForFile('filepath')).toBeInstanceOf(Writable);
    expect(Bucket.prototype.file).not.toHaveBeenCalled();
  });

  it('will call the real service when no configuration file path is passed to the library', async () => {
    jest.spyOn(Bucket.prototype, 'exists');
    jest.spyOn(Bucket.prototype, 'file');

    const storage = gcsStorageCreate({
      googleAuthenticationFilePath: '',
      gcsBucket: 'profile-store',
    });

    await storage.ping();
    expect(Bucket.prototype.exists).toHaveBeenCalled();

    expect(storage.getWriteStreamForFile('filepath')).toBeInstanceOf(Writable);
    expect(Bucket.prototype.file).toHaveBeenCalledWith('filepath');
  });

  it('will call the real service when a configuration file path is passed to the library', async () => {
    jest.spyOn(Bucket.prototype, 'exists');
    jest.spyOn(Bucket.prototype, 'file');

    const storage = gcsStorageCreate({
      googleAuthenticationFilePath: '/file/path',
      gcsBucket: 'profile-store',
    });

    await storage.ping();
    expect(Bucket.prototype.exists).toHaveBeenCalled();

    expect(storage.getWriteStreamForFile('filepath')).toBeInstanceOf(Writable);
    expect(Bucket.prototype.file).toHaveBeenCalledWith('filepath');
  });
});
