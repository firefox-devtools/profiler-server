/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import supertest from 'supertest';

import crypto from 'crypto';

import { Storage as MockStorage } from '../../__mocks__/@google-cloud/storage';

import { config } from '../../src/config';
import { createApp } from '../../src/app';

beforeEach(() => MockStorage.cleanUp());
afterEach(() => MockStorage.cleanUp());

describe('publishing endpoints', () => {
  function setup() {
    const agent = supertest(createApp().callback());
    return agent.post('/compressed-store').type('text');
  }

  it('uploads data all the way to google storage when using a content length', async () => {
    const content = 'aaaa';
    const req = setup();
    await req.send(content).expect(200);

    const contentHash = crypto
      .createHash('sha1')
      .update(content)
      .digest('hex');

    expect(MockStorage.buckets).toHaveProperty(config.gcsBucket);

    const bucket = MockStorage.buckets[config.gcsBucket];
    expect(bucket.files).toHaveProperty(contentHash);

    const file = bucket.files[contentHash];
    expect(file).toHaveProperty('contents', Buffer.from(content));
    expect(file).toHaveProperty('name', contentHash);
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
    const content = 'aaaa';
    const req = setup();

    // When using the low-level API "write", Node generates a "chunked encoding"
    // request without a Content-Length. This is exactly what we want to check
    // here.
    // Unfortunately there's no easy way to assert we're in this node, we'll
    // have to rely on the heuristic.
    req.write(content);

    await req.expect(200);

    const contentHash = crypto
      .createHash('sha1')
      .update(content)
      .digest('hex');

    expect(MockStorage.buckets).toHaveProperty(config.gcsBucket);
    const bucket = MockStorage.buckets[config.gcsBucket];
    expect(bucket.files).toHaveProperty(contentHash);
    const file = bucket.files[contentHash];
    expect(file).toHaveProperty('contents', Buffer.from(content));
    expect(file).toHaveProperty('name', contentHash);
    expect(file).toHaveProperty(
      'metadata',
      expect.objectContaining({
        cacheControl: 'max-age: 365000000, immutable',
        contentEncoding: 'gzip',
        contentType: 'text/plain',
      })
    );
  });

  it('returns an error when the length is too big', async () => {
    const req = setup();
    await req.set('Content-Length', String(1024 * 1024 * 1024)).expect(413);
  });

  it('returns an error when the sent data is bigger than the length', async () => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    const req = setup();
    await req
      .set('Content-Length', String(3))
      .send('aaaa')
      .expect(400);
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );
  });

  it('returns an error when the pushed buffer is too big', async () => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    const req = setup();

    // When using the low-level API "write", Node generates a "chunked encoding"
    // request without a Content-Length. This is exactly what we want to check
    // here.
    await req.write(Buffer.alloc(33 * 1024 * 1024));

    const error = await req.then(
      () => {
        throw new Error(`The request shouldn't succeed.`);
      },
      e => e
    );

    // We don't get a 413 because the connection is reset without a response.
    expect(error.code).toBe('ECONNRESET');
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
});
