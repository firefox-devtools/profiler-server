/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import request from 'supertest';
import nock from 'nock';
import fs from 'fs';
import { Bucket } from '@google-cloud/storage';

import { config } from '../../src/config';
import { createApp } from '../../src/app';
import { checkSecurityHeaders } from './utils/check-security-headers';

describe('dockerflow endpoints', () => {
  const BITLY_HOSTNAME = 'https://api-ssl.bitly.com';

  function setup() {
    const agent = request(createApp().callback());
    return agent;
  }

  function setupForHeartbeat({
    failBitly,
  }: Partial<{
    failBitly: boolean;
  }> = {}) {
    const nockInterceptor = nock(BITLY_HOSTNAME, {
      reqheaders: { authorization: `Bearer ${config.bitlyToken}` },
    }).get('/v4/user');

    let nockScope;
    if (failBitly) {
      nockScope = nockInterceptor.reply(503, {
        message: 'TEMPORARY_UNAVAILABLE',
        errors: [{}],
        resource: 'user',
        description: 'The resource is temporary unavailable.',
      });
    } else {
      nockScope = nockInterceptor.reply(200, {
        default_group_guid: 'string',
        name: 'string',
        created: 'string',
        is_active: true,
        modified: 'string',
        is_sso_user: true,
        is_2fa_enabled: true,
        login: 'string',
        emails: [
          {
            is_primary: true,
            is_verified: true,
            email: 'string',
          },
        ],
      });
    }

    const agent = setup();

    return { agent, nockScope };
  }

  describe('__heartbeat__', () => {
    it('answers to the heartbeat', async () => {
      jest.spyOn(Bucket.prototype, 'exists');
      const { agent, nockScope } = setupForHeartbeat();
      await agent.get('/__heartbeat__').expect(200);
      expect(Bucket.prototype.exists).toHaveBeenCalled();
      nockScope.done();
    });

    it('answers an error to the heartbeat if the bucket does not exist', async () => {
      // We can't use jest.spyOn here because of a typescript issue with jest.
      // When we use jest.spyOn, the typescript compiler complains that the
      // mock return value must be void. This is happening because apparently
      // typescript doesn't understand the overloaded Bucket.prototype.exists method.
      const bucketExists = Bucket.prototype.exists;
      Bucket.prototype.exists = jest
        .fn()
        .mockReturnValue(Promise.resolve([false]));
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((_: string | Uint8Array) => true);

      const { agent } = setupForHeartbeat();
      await agent.get('/__heartbeat__').expect(500);
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('server_error')
      );

      // Reset the mock function to its real implementation.
      Bucket.prototype.exists = bucketExists;
    });

    it('answers an error to the heartbeat if google server server is down', async () => {
      jest.spyOn(Bucket.prototype, 'exists').mockImplementation(() => {
        throw new Error('3rd party server error');
      });
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((_: string | Uint8Array) => true);
      const { agent } = setupForHeartbeat();
      await agent.get('/__heartbeat__').expect(500);
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('server_error')
      );
    });

    it('answers an error to the heartbeat if bitly is down', async () => {
      // Silence out server errors
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((_: string | Uint8Array) => true);
      const { agent, nockScope } = setupForHeartbeat({ failBitly: true });
      await agent.get('/__heartbeat__').expect(500, /temporary unavailable/);
      nockScope.done();
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('server_error')
      );
    });
  });

  describe('__lbheartbeat__', () => {
    it('answers to the live balancer heartbeat', async () => {
      const agent = setup();
      await agent.get('/__lbheartbeat__').expect(200);
    });
  });

  describe('__version__', () => {
    it('answers to the version endpoint when the file is absent', async () => {
      const error = new Error("Can't find the requested file.");
      (error as any).code = 'ENOENT';

      jest.spyOn(fs.promises, 'stat').mockRejectedValue(error);
      jest.spyOn(fs.promises, 'readFile').mockRejectedValue(error);
      // mozlog writes to stdout, let's catch it
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((_: string | Uint8Array) => true);

      const agent = setup();
      await agent.get('/__version__').expect(500);

      expect(fs.promises.stat).toHaveBeenCalledWith('version.json');
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('server_error')
      );
    });

    it('answers to the version endpoint when the file is present', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fixture = require('./fixtures/version.json');
      const fakeLastModifiedDate = new Date('Thu, 01 May 2020 10:20:15 GMT');
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(fixture);
      jest
        .spyOn(fs.promises, 'stat')
        // @ts-expect-error Other fields are not included for this test.
        .mockResolvedValue({ mtime: fakeLastModifiedDate });
      const agent = setup();
      const response = await agent
        .get('/__version__')
        .expect('Content-Type', /^application\/json/)
        .expect('Last-Modified', fakeLastModifiedDate.toUTCString())
        .expect(200);

      expect(fs.promises.readFile).toHaveBeenCalledWith('version.json');
      expect(response.body).toEqual(fixture);
    });
  });

  it('all endpoints uses security headers', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fixture = require('./fixtures/version.json');
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(fixture);
    // @ts-expect-error Other fields are not included for this test.
    jest.spyOn(fs.promises, 'stat').mockResolvedValue({ mtime: new Date() });

    const { agent } = setupForHeartbeat();
    await checkSecurityHeaders(agent.get('/__heartbeat__'));
    await checkSecurityHeaders(agent.get('/__lbheartbeat__'));
    await checkSecurityHeaders(agent.get('/__version__'));
  });
});
