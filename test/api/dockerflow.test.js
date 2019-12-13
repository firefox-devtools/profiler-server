/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import request from 'supertest';
import fs from 'fs';
import { Bucket } from '@google-cloud/storage';

import { createApp } from '../../src/app';
import { checkSecurityHeaders } from './utils/check-security-headers';

describe('dockerflow endpoints', () => {
  function setup() {
    const agent = request(createApp().callback());
    return agent;
  }

  it('answers to the heartbeat', async () => {
    jest.spyOn(Bucket.prototype, 'exists');
    const agent = setup();
    await agent.get('/__heartbeat__').expect(200);
    expect(Bucket.prototype.exists).toHaveBeenCalled();
  });

  it('answers an error to the heartbeat if the bucket does not exist', async () => {
    jest
      .spyOn(Bucket.prototype, 'exists')
      .mockReturnValue(Promise.resolve([false]));
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    const agent = setup();
    await agent.get('/__heartbeat__').expect(500);
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );
  });

  it('answers an error to the heartbeat if the 3rd party server is down', async () => {
    jest.spyOn(Bucket.prototype, 'exists').mockImplementation(() => {
      throw new Error('3rd party server error');
    });
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    const agent = setup();
    await agent.get('/__heartbeat__').expect(500);
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );
  });

  it('answers to the live balancer heartbeat', async () => {
    const agent = setup();
    await agent.get('/__lbheartbeat__').expect(200);
  });

  it('answers to the version endpoint when the file is absent', async () => {
    const error = new Error("Can't find the requested file.");
    (error: any).code = 'ENOENT';

    jest.spyOn(fs.promises, 'readFile').mockRejectedValue(error);
    // mozlog writes to stdout, let's catch it
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});

    const agent = setup();
    await agent.get('/__version__').expect(500);

    expect(fs.promises.readFile).toHaveBeenCalledWith('version.json');
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );
  });

  it('answers to the version endpoint when the file is present', async () => {
    const fixture = require('./fixtures/version.json');
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(fixture);
    const agent = setup();
    const response = await agent
      .get('/__version__')
      .expect('Content-Type', /^application\/json/)
      .expect(200);

    expect(fs.promises.readFile).toHaveBeenCalledWith('version.json');
    expect(response.body).toEqual(fixture);
  });

  it('all endpoints uses security headers', async () => {
    const fixture = require('./fixtures/version.json');
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(fixture);

    const agent = setup();
    await checkSecurityHeaders(agent.get('/__heartbeat__'));
    await checkSecurityHeaders(agent.get('/__lbheartbeat__'));
    await checkSecurityHeaders(agent.get('/__version__'));
  });
});
