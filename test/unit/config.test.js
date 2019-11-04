/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import fs from 'fs';

describe('config.js', () => {
  beforeEach(() => {
    // Reseting the modules forces Jest to fully reload the "config" module.
    jest.resetModules();
  });

  it('returns default values', () => {
    const { config } = require('../../src/config');
    expect(config).toEqual({
      env: 'test',
      httpPort: 4243,
    });
  });

  it('configures other values from environment variables', () => {
    process.env.PORT = '12345';
    const { config } = require('../../src/config');
    expect(config.httpPort).toEqual(12345);
    delete process.env.PORT;
  });

  it('configures other values from a local file', () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(fs, 'readFileSync').mockImplementation(() =>
      JSON.stringify({
        httpPort: '12345',
      })
    );
    const { config } = require('../../src/config');
    expect(config.httpPort).toEqual(12345);
    process.env.NODE_ENV = 'test';
  });
});
