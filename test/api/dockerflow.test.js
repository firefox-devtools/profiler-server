/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import request from 'supertest';
import fs from 'fs';

import { createApp } from '../../src/app';

describe('dockerflow endpoints', () => {
  function setup() {
    const agent = request(createApp().callback());
    return agent;
  }

  it('answers to the heartbeat', async () => {
    const agent = setup();
    await agent.get('/__heartbeat__').expect(200);
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

    expect(process.stdout.write).toHaveBeenCalled();
  });

  it('answers to the version endpoint when the file is present', async () => {
    const fixture = require('./fixtures/version.json');
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(fixture);
    const agent = setup();
    const response = await agent
      .get('/__version__')
      .expect('Content-Type', /^application\/json/)
      .expect(200);

    expect(response.body).toEqual(fixture);
  });
});
