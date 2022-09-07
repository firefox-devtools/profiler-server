/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import supertest from 'supertest';

import { createApp } from '../../src/app';
import { checkSecurityHeaders } from './utils/check-security-headers';

describe('cspreport endpoint', () => {
  function getPreconfiguredRequest() {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const agent = supertest(createApp().callback()).post('/__cspreport__');
    return agent;
  }

  it('logs valid reports', async () => {
    // This sample comes from https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only#Sample_violation_report
    const validReport = {
      'csp-report': {
        'document-uri': 'http://example.com/signup.html',
        referrer: '',
        'blocked-uri': 'http://example.com/css/style.css',
        'violated-directive': 'style-src cdn.example.com',
        'original-policy':
          "default-src 'none'; style-src cdn.example.com; report-uri /_/csp-reports",
        disposition: 'report',
      },
    };

    let req = getPreconfiguredRequest();
    req = req.send(validReport).expect(204);
    req = checkSecurityHeaders(req);
    await req;

    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify(validReport['csp-report']))
    );
  });

  it('errors if there is an invalid report', async () => {
    const invalidReport = { foo: 'bar' };
    const req = getPreconfiguredRequest();
    await req
      .send(invalidReport)
      .expect(400, `The request misses a 'csp-report' field!`);
  });

  it('errors if the input is not json', async () => {
    const req = getPreconfiguredRequest();
    await req.send('a').expect(400, `The body couldn't be parsed as JSON.`);
  });

  it('errors early for long bodies', async () => {
    const req = getPreconfiguredRequest();
    await req
      .send(Buffer.alloc(2 * 1024 * 1024))
      .expect(413, 'request entity too large');
  });
});
