/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import fs from 'fs';
import { config, loadConfigForTestsOnly as loadConfig } from '../../src/config';

describe('config.js', () => {
  it('returns default values', () => {
    expect(config).toEqual({
      env: 'test',
      httpPort: 5252,
      gcsBucket: 'profile-store',
      googleAuthenticationFilePath: '',
      jwtSecret: 'secret',
      bitlyToken: 'FAKE_TOKEN_FOR_TESTS',
    });
    expect(loadConfig()).toEqual({
      env: 'test',
      httpPort: 5252,
      gcsBucket: 'profile-store',
      googleAuthenticationFilePath: '',
      jwtSecret: 'secret',
      bitlyToken: 'FAKE_TOKEN_FOR_TESTS',
    });
  });

  it('configures other values from environment variables', () => {
    process.env.PORT = '12345';
    expect(loadConfig().httpPort).toEqual(12345);
    delete process.env.PORT;
  });

  it(`when not in tests throws if there's no jwt secret specified`, () => {
    process.env.NODE_ENV = 'production';
    expect(() => loadConfig()).toThrow();
    process.env.NODE_ENV = 'test';
  });

  it('accepts mocked google authentication paths', () => {
    process.env.GCS_AUTHENTICATION_PATH = 'MOCKED';
    expect(loadConfig().googleAuthenticationFilePath).toEqual('MOCKED');
    delete process.env.GCS_AUTHENTICATION_PATH;
  });

  it('accepts valid google authentication paths', () => {
    const filePath = '/path/to/file';
    jest.spyOn(fs, 'accessSync').mockReturnValue();
    process.env.GCS_AUTHENTICATION_PATH = filePath;
    expect(loadConfig().googleAuthenticationFilePath).toEqual(filePath);
    delete process.env.GCS_AUTHENTICATION_PATH;
  });

  it('rejects google authentication paths that are not readable', () => {
    const filePath = '/path/to/file';
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    jest.spyOn(fs, 'accessSync').mockImplementation(() => {
      throw new Error();
    });
    process.env.GCS_AUTHENTICATION_PATH = filePath;
    expect(() => loadConfig()).toThrow(
      'The authentication file is missing or not readable.'
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL')
    );
    delete process.env.GCS_AUTHENTICATION_PATH;
  });
});
