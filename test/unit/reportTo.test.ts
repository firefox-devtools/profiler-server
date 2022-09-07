/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Koa from 'koa';
import supertest from 'supertest';

import { reportTo } from '../../src/middlewares';

describe('reportTo middleware', () => {
  function setupAndReturnRequest() {
    const app = new Koa();

    app.use(
      reportTo([
        {
          group: 'endpoint',
          maxAge: 365 * 24 * 60 * 60,
          endpoints: [{ url: '/cspreport' }],
        },
      ])
    );

    app.use((ctx) => {
      ctx.body = 'hello world';
    });

    const agent = supertest(app.callback());
    return agent;
  }

  it('sets the header properly', async () => {
    const request = setupAndReturnRequest();

    await request
      .get('/')
      .expect(200)
      .expect(
        'Report-To',
        '{"group":"endpoint","max_age":31536000,"endpoints":[{"url":"/cspreport"}]}'
      );
  });
});
