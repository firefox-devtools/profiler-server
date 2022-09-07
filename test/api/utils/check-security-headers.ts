/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import { Test } from 'supertest';

export function checkSecurityHeaders(request: Test) {
  if ((request as any).called) {
    throw new Error(
      `This function needs to be called before the 'await' line so that the request is still pending.`
    );
  }
  return request
    .expect(
      'Content-Security-Policy',
      `default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'self';report-uri /__cspreport__;report-to cspreport`
    )
    .expect(
      'Report-To',
      `{"group":"cspreport","max_age":31536000,"endpoints":[{"url":"/__cspreport__"}]}`
    )
    .expect('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
    .expect('X-DNS-Prefetch-Control', 'off')
    .expect('X-Frame-Options', 'DENY')
    .expect('X-Download-Options', 'noopen')
    .expect('X-Content-Type-Options', 'nosniff');
}

export function checkCorsHeader(request: Test, expectedValue: string) {
  if ((request as any).called) {
    throw new Error(
      `This function needs to be called before the 'await' line so that the request is still pending.`
    );
  }
  return request.expect('Access-Control-Allow-Origin', expectedValue);
}
