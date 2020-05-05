/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import supertest from 'supertest';

import { createApp } from '../../src/app';
import { checkSecurityHeaders } from './utils/check-security-headers';

describe('/ route', () => {
  function setup() {
    const agent = supertest(createApp().callback());
    return { request: agent.get('/') };
  }

  it('returns a successful result', async () => {
    const { request } = setup();
    await request.expect(200);
  });

  it('implements security headers', async () => {
    let { request } = setup();
    request = checkSecurityHeaders(request);
    await request;
  });
});
