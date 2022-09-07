/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import supertest from 'supertest';
import nock from 'nock';

import { config } from '../../src/config';
import { createApp } from '../../src/app';
import { ACCEPT_VALUE_MIME } from '../../src/middlewares/versioning';
import {
  checkSecurityHeaders,
  checkCorsHeader,
} from './utils/check-security-headers';

const BITLY_HOSTNAME = 'https://api-ssl.bitly.com';

describe('shorten url', () => {
  function getPreconfiguredRequest() {
    const acceptHeader = ACCEPT_VALUE_MIME + ';version=1';
    const agent = supertest(createApp().callback());
    return agent.post('/shorten').accept(acceptHeader).type('json');
  }

  function setup({
    longUrl,
    shortUrl,
  }: Partial<{ longUrl: string; shortUrl: string }> = {}) {
    const nockScope = nock(BITLY_HOSTNAME, {
      reqheaders: { authorization: `Bearer ${config.bitlyToken}` },
    })
      .post('/v4/shorten', { long_url: longUrl })
      .reply(201, { link: shortUrl });

    const request = getPreconfiguredRequest();
    return { request, nockScope };
  }

  it('calls the underlying service to shorten an url', async () => {
    const longUrl = 'https://profiler.firefox.com/public/FAKEHASH/calltree';
    const shortUrl = 'https://share.firefox.dev/BITLYHASH';

    const { request, nockScope } = setup({ longUrl, shortUrl });

    await request.send({ longUrl }).expect(200, { shortUrl });
    nockScope.done();
  });

  it('rejects with an error if the request is badly formed', async () => {
    // Silence the error reporter.
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const { request, nockScope } = setup();

    // Not a JSON
    await request.send('a').expect(400);

    // An error has been output to the console.
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );

    // There's been no request to the underlying service.
    expect(nockScope.isDone()).toBe(false);
  });

  it('rejects with an error if the request does not have the expected properties', async () => {
    // Silence the error reporter.
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const { request, nockScope } = setup();

    // A JSON, but without the expected properties.
    await request.send({ foo: 'bar' }).expect(400);

    // An error has been output to the console.
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );

    // There's been no request to the underlying service.
    expect(nockScope.isDone()).toBe(false);
  });

  it(`rejects with an error when the request isn't for the profiler domain`, async () => {
    // Silence the error reporter.
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const { request, nockScope } = setup();

    // A JSON, but without the expected properties.
    await request.send({ longUrl: 'https://google.fr' }).expect(400);

    // An error has been output to the console.
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );

    // There's been no request to the underlying service.
    expect(nockScope.isDone()).toBe(false);
  });

  it('rejects with an error when bitly answers an error', async () => {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const errorMessage = 'This request is invalid.';
    nock(BITLY_HOSTNAME, {
      reqheaders: { authorization: `Bearer ${config.bitlyToken}` },
    })
      .post('/v4/shorten')
      .reply(400, {
        message: 'BAD_REQUEST',
        errors: [],
        resource: 'bitlinks',
        description: errorMessage,
      });

    const request = getPreconfiguredRequest();
    const longUrl = 'https://profiler.firefox.com/public/FAKEHASH/calltree';
    await request.send({ longUrl }).expect(500, new RegExp(errorMessage));
  });

  it('implements security headers', async () => {
    const longUrl = 'https://profiler.firefox.com/public/FAKEHASH/calltree';
    const shortUrl = 'https://share.firefox.dev/BITLYHASH';
    const corsHeaderValue = 'http://example.org';

    let { request } = setup({ longUrl, shortUrl });
    request
      .set('Origin', corsHeaderValue)
      .set('Access-Control-Request-Method', 'POST')
      .send({ longUrl });
    request = checkSecurityHeaders(request);
    request = checkCorsHeader(request, corsHeaderValue);
    await request;
  });
});

describe('expand url', () => {
  function getPreconfiguredRequest() {
    const acceptHeader = ACCEPT_VALUE_MIME + ';version=1';
    const agent = supertest(createApp().callback());
    return agent.post('/expand').accept(acceptHeader).type('json');
  }

  function setup({
    longUrl,
    shortUrl,
  }: Partial<{ longUrl: string; shortUrl: string }> = {}) {
    if (!shortUrl) {
      shortUrl = '';
    }

    const nockScope = nock(BITLY_HOSTNAME, {
      reqheaders: { authorization: `Bearer ${config.bitlyToken}` },
    })
      .post('/v4/expand', { bitlink_id: shortUrl.replace(/^https:\/\//, '') })
      .reply(201, { long_url: longUrl });

    const request = getPreconfiguredRequest();
    return { request, nockScope };
  }

  it('calls the underlying service to expand the url', async () => {
    const shortUrl = 'https://share.firefox.dev/BITLYHASH';
    const longUrl = 'https://profiler.firefox.com/public/FAKEHASH/calltree';

    const { request, nockScope } = setup({ longUrl, shortUrl });

    await request.send({ shortUrl }).expect(200, { longUrl });
    nockScope.done();
  });

  it('rejects with an error if the request is badly formed', async () => {
    // Silence the error reporter.
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const { request, nockScope } = setup();

    // Not a JSON
    await request.send('a').expect(400);

    // An error has been output to the console.
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );

    // There's been no request to the underlying service.
    expect(nockScope.isDone()).toBe(false);
  });

  it('rejects with an error if the request does not have the expected properties', async () => {
    // Silence the error reporter.
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const { request, nockScope } = setup();

    // A JSON, but without the expected properties.
    await request.send({ foo: 'bar' }).expect(400);

    // An error has been output to the console.
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );

    // There's been no request to the underlying service.
    expect(nockScope.isDone()).toBe(false);
  });

  it(`rejects with an error when the expanded url isn't in the profiler domain`, async () => {
    // Silence the error reporter.
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const shortUrl = 'https://share.firefox.dev/BITLYHASH';
    const longUrl = 'https://www.example.org';

    const { request, nockScope } = setup({ longUrl, shortUrl });

    // The result of this request isn't part of the profiler domain, so it
    // returns an error.
    await request.send({ shortUrl }).expect(400);

    // An error has been output to the console.
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('server_error')
    );

    // There's been a request to the underlying service because we can't avoid it.
    nockScope.done();
  });

  it('rejects with an error when bitly answers an error', async () => {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);

    const errorMessage = 'This request is invalid.';
    nock(BITLY_HOSTNAME, {
      reqheaders: { authorization: `Bearer ${config.bitlyToken}` },
    })
      .post('/v4/expand')
      .reply(400, {
        message: 'BAD_REQUEST',
        errors: [],
        resource: 'bitlinks',
        description: errorMessage,
      });

    const request = getPreconfiguredRequest();
    const shortUrl = 'https://share.firefox.dev/BITLYHASH';
    await request.send({ shortUrl }).expect(500, new RegExp(errorMessage));
  });

  it('implements security headers', async () => {
    const longUrl = 'https://profiler.firefox.com/public/FAKEHASH/calltree';
    const shortUrl = 'https://share.firefox.dev/BITLYHASH';
    const corsHeaderValue = 'http://example.org';

    let { request } = setup({ longUrl, shortUrl });
    request
      .set('Origin', corsHeaderValue)
      .set('Access-Control-Request-Method', 'POST')
      .send({ shortUrl });
    request = checkSecurityHeaders(request);
    request = checkCorsHeader(request, corsHeaderValue);
    await request;
  });
});
