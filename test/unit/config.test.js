/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import { config, loadConfigForTestsOnly as loadConfig } from '../../src/config';

describe('config.js', () => {
  it('returns default values', () => {
    expect(config).toEqual({
      env: 'test',
      httpPort: 5252,
      gcsBucket: 'profile-store',
      googleAuthenticationFilePath: '',
    });
    expect(loadConfig()).toEqual({
      env: 'test',
      httpPort: 5252,
      gcsBucket: 'profile-store',
      googleAuthenticationFilePath: '',
    });
  });

  it('configures other values from environment variables', () => {
    process.env.PORT = '12345';
    expect(loadConfig().httpPort).toEqual(12345);
    delete process.env.PORT;
  });
});
