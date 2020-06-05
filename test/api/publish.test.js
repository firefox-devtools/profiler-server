/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

import crypto from 'crypto';
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

function verifyAndDecodeJwtToken(res) {
  const token = res.text;
  const secret = config.jwtSecret;
  const decodedPayload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  res.text = decodedPayload.profileToken;
}

// This is the payload we'll send in most of the requests in this test.
const BASIC_PAYLOAD = gzipSync('{"foo": "aaaa"}');
// This is the hash for the content. It's returned by the API and used as a
// file path in GCS.
const BASIC_PAYLOAD_HASH = crypto
  .createHash('sha1')
  .update(BASIC_PAYLOAD)
  .digest('hex');

describe('publishing endpoints', () => {
  function getPreconfiguredRequest() {
    const acceptHeader = ACCEPT_VALUE_MIME + ';version=1';
    const agent = supertest(createApp().callback());
    return agent.post('/compressed-store').accept(acceptHeader).type('text');
  }

  it('uploads data all the way to google storage when using a content length', async () => {
    // `getPreconfiguredRequest` returns a request already configured with the
    // right path and content type.
    const req = getPreconfiguredRequest();

    // This checks that we get a 200 status from the server and that it returns
    // the hash.
    await req
      .send(BASIC_PAYLOAD)
      .expect(200)
      .expect(verifyAndDecodeJwtToken)
      .expect(BASIC_PAYLOAD_HASH);

    // Now we'll look at our mocked GCS library and check it's been called
    // properly.

    // Do we have the bucket configured in our config file?
    expect(MockStorage.buckets).toHaveProperty(config.gcsBucket);

    const bucket = MockStorage.buckets[config.gcsBucket];

    // Do we have a file whose name is the hash in that bucket?
    expect(bucket.files).toHaveProperty(BASIC_PAYLOAD_HASH);

    const file = bucket.files[BASIC_PAYLOAD_HASH];

    // Let's check that file's content, name and metadata information.
    expect(file).toHaveProperty('contents', Buffer.from(BASIC_PAYLOAD));
    expect(file).toHaveProperty('name', BASIC_PAYLOAD_HASH);
    expect(file).toHaveProperty(
      'metadata',
      expect.objectContaining({
        cacheControl: 'max-age: 365000000, immutable',
        contentEncoding: 'gzip',
        contentType: 'text/plain',
      })
    );
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

    await req
      .expect(200)
      .expect(verifyAndDecodeJwtToken)
      .expect(BASIC_PAYLOAD_HASH);

    expect(MockStorage.buckets).toHaveProperty(config.gcsBucket);
    const bucket = MockStorage.buckets[config.gcsBucket];

    expect(bucket.files).toHaveProperty(BASIC_PAYLOAD_HASH);
    const file = bucket.files[BASIC_PAYLOAD_HASH];

    expect(file).toHaveProperty('contents', Buffer.from(BASIC_PAYLOAD));
    expect(file).toHaveProperty('name', BASIC_PAYLOAD_HASH);
    expect(file).toHaveProperty(
      'metadata',
      expect.objectContaining({
        cacheControl: 'max-age: 365000000, immutable',
        contentEncoding: 'gzip',
        contentType: 'text/plain',
      })
    );
  });

  it('returns an error when the length header is too big', async () => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    const req = getPreconfiguredRequest();
    await req
      .set('Content-Length', String(1024 * 1024 * 1024))
      .expect(413, /The length is bigger than the configured maximum/);
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );
  });

  it('returns an error when the pushed buffer is too big', async () => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
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
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});

    const agent = supertest(createApp().callback());
    return agent.post('/compressed-store').type('text');
  }

  it('returns an error when no `accept` header is specified', async () => {
    const req = getPreconfiguredRequest();
    await req.send('a').expect(400, `The header 'Accept' is missing.`);
  });

  it('returns an error when an invalid `accept` header is specified', async () => {
    const req = getPreconfiguredRequest().accept('INVALID_VALUE');
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
    await req
      .send(BASIC_PAYLOAD)
      .expect(200)
      .expect(verifyAndDecodeJwtToken)
      .expect(BASIC_PAYLOAD_HASH);
  });

  it('accepts the request even if the version is specified with spaces before the parameter', async () => {
    const req = getPreconfiguredRequest().accept(
      ACCEPT_VALUE_MIME + '; version=1'
    );
    await req
      .send(BASIC_PAYLOAD)
      .expect(200)
      .expect(verifyAndDecodeJwtToken)
      .expect(BASIC_PAYLOAD_HASH);
  });
});
