/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import supertest, { Response } from 'supertest';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { gzipSync } from 'zlib';

import { Storage as MockStorage } from '../../__mocks__/@google-cloud/storage';

import { config } from '../../src/config';
import { createApp } from '../../src/app';
import { ACCEPT_VALUE_MIME } from '../../src/middlewares/versioning';
import {
  checkSecurityHeaders,
  checkCorsHeader,
} from './utils/check-security-headers';

beforeEach(() => MockStorage.cleanUp());
afterEach(() => MockStorage.cleanUp());

function verifyAndDecodeJwtToken(res: Response): string {
  if (!res.text) {
    throw new Error(
      `There was no 'text' property in the response, which shouldn't happen.`
    );
  }

  const token = res.text;
  const secret = config.jwtSecret;
  const decodedPayload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
  }) as JwtPayload;
  const profileToken = decodedPayload.profileToken;

  // The token is 39 characters long, that are either letters (lowercase)
  // or digits.
  expect(profileToken).toMatch(/^[abcdefghjkmnpqrstvwxyz0-9]{39}$/);

  return profileToken;
}

// This is the payload we'll send in most of the requests in this test.
const BASIC_PAYLOAD = gzipSync('{"foo": "aaaa"}');

describe('publishing endpoints', () => {
  function getPreconfiguredRequest() {
    const acceptHeader = ACCEPT_VALUE_MIME + ';version=1';
    const agent = supertest(createApp().callback());
    return agent.post('/compressed-store').accept(acceptHeader).type('text');
  }

  function expectBucketHasProfile(profileToken: string) {
    // Do we have the bucket configured in our config file?
    expect(MockStorage.buckets).toHaveProperty(config.gcsBucket);

    const bucket = MockStorage.buckets[config.gcsBucket];

    // Do we have a file whose name is the hash in that bucket?
    expect(bucket.files).toHaveProperty(profileToken);

    const file = bucket.files[profileToken];

    // Let's check that file's content, name and metadata information.
    expect(file).toHaveProperty('contents', Buffer.from(BASIC_PAYLOAD));
    expect(file).toHaveProperty('name', profileToken);
    expect(file).toHaveProperty(
      'metadata',
      expect.objectContaining({
        cacheControl: 'max-age: 365000000, immutable',
        contentEncoding: 'gzip',
        contentType: 'text/plain',
      })
    );
  }

  it('uploads data all the way to google storage when using a content length', async () => {
    // `getPreconfiguredRequest` returns a request already configured with the
    // right path and content type.
    const req = getPreconfiguredRequest();

    // This checks that we get a 200 status from the server and that it returns
    // the hash.
    const res = await req.send(BASIC_PAYLOAD).expect(200);
    const profileToken = verifyAndDecodeJwtToken(res);

    // Now we'll look at our mocked GCS library and check it's been called
    // properly.
    expectBucketHasProfile(profileToken);
  });

  it('uploads data all the way to google storage when using chunked encoding', async () => {
    // Except the use of `write` below, this test follows the same scenario and
    // checks the same things as the test above. Please refer to the test above
    // for more information.
    const req = getPreconfiguredRequest();

    // When using the low-level API "write", Node generates a "chunked encoding"
    // request without a Content-Length. This is exactly what we want to check
    // here.
    // Unfortunately there's no easy way to assert we're in this node, we'll
    // have to rely on the heuristic.
    req.write(BASIC_PAYLOAD);

    const res = await req.expect(200);
    const profileToken = verifyAndDecodeJwtToken(res);

    expectBucketHasProfile(profileToken);
  });

  it('returns an error when the length header is too big', async () => {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);
    const req = getPreconfiguredRequest();
    await req
      .set('Content-Length', String(1024 * 1024 * 1024))
      .expect(413, /The length is bigger than the configured maximum/);
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );
  });

  it('returns an error when the pushed buffer is too big', async () => {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);
    const req = getPreconfiguredRequest();

    // When using the low-level API "write", Node generates a "chunked encoding"
    // request without a Content-Length. This is exactly what we want to check
    // here.
    // We generate a Buffer of ~51MB, but our limit is 50MB.
    const payload = gzipSync(`{"foo": "${'#'.repeat(51 * 1024 * 1024)}"}`, {
      level: 0,
    });
    await req.write(payload);
    await req.expect(413, /The length is bigger than the configured maximum/);

    // This check asserts that we get the error using the
    // LengthCheckerPassThrough transform. This asserts that we stop the stream
    // early even without a Content-Length header.
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('length-checker-length-error')
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );
  });

  it('returns an error when the pushed buffer does not look like JSON', async () => {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);
    const req = getPreconfiguredRequest();

    const payload = gzipSync('aaaa');
    await req.send(payload).expect(400, /The payload isn't a JSON object/);

    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );
  });

  it('returns an error when the pushed buffer is not gzip-compressed', async () => {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);
    const req = getPreconfiguredRequest();
    await req.send('aaaa').expect(400, /The payload isn't gzip-compressed/);

    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );
  });

  it('implements security headers', async () => {
    const corsHeaderValue = 'http://example.org';
    let req = getPreconfiguredRequest()
      .set('Origin', corsHeaderValue)
      .send(BASIC_PAYLOAD)
      .expect(200);
    req = checkSecurityHeaders(req);
    req = checkCorsHeader(req, corsHeaderValue);
    await req;
  });

  it('implements preflight CORS requests', async () => {
    const corsHeaderValue = 'http://example.org';

    const agent = supertest(createApp().callback());
    let req = agent
      .options('/compressed-store')
      .set('Origin', corsHeaderValue)
      .set('Access-Control-Request-Method', 'POST')
      .send();

    req = checkCorsHeader(req, corsHeaderValue);
    await req;
  });
});

describe('API versioning', () => {
  function getPreconfiguredRequest() {
    // In these tests we'll generate errors, which triggers a lot of output from
    // the log. Let's silence that.
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const agent = supertest(createApp().callback());
    return agent.post('/compressed-store').type('text');
  }

  it('returns an error when no `accept` header is specified', async () => {
    const req = getPreconfiguredRequest();
    await req.send('a').expect(400, `The header 'Accept' is missing.`);
  });

  it('returns an error when an invalid `accept` header is specified', async () => {
    const req = getPreconfiguredRequest().accept('invalid/mime-type');
    await req
      .send('a')
      .expect(
        406,
        `The header 'Accept' should have the value application/vnd.firefox-profiler+json; version=1`
      );
  });

  it('returns an error when an `accept` header is specified with an unsupported version', async () => {
    const req = getPreconfiguredRequest().accept(
      ACCEPT_VALUE_MIME + ';version=2'
    );
    await req
      .send('a')
      .expect(
        406,
        `The header 'Accept' should have the value application/vnd.firefox-profiler+json; version=1`
      );
  });

  it('returns an error when an accept header is specified without a version at all', async () => {
    const req = getPreconfiguredRequest().accept(ACCEPT_VALUE_MIME);
    await req
      .send('a')
      .expect(
        406,
        `The header 'Accept' should have the value application/vnd.firefox-profiler+json; version=1`
      );
  });

  it('returns an error when an accept header is specified with several unacceptable values', async () => {
    const req = getPreconfiguredRequest().accept(
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    );
    await req
      .send('a')
      .expect(
        406,
        `The header 'Accept' should have the value application/vnd.firefox-profiler+json; version=1`
      );
  });

  it('accepts the request when there is the expected value among several values', async () => {
    const req = getPreconfiguredRequest().accept(
      `image/webp,${ACCEPT_VALUE_MIME};version=1`
    );

    const res = await req.send(BASIC_PAYLOAD).expect(200);
    verifyAndDecodeJwtToken(res);
  });

  it('accepts the request even if the version is specified with spaces before the parameter', async () => {
    const req = getPreconfiguredRequest().accept(
      ACCEPT_VALUE_MIME + '; version=1'
    );

    const res = await req.send(BASIC_PAYLOAD).expect(200);
    verifyAndDecodeJwtToken(res);
  });
});
