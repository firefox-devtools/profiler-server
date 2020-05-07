/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// This router implements the url shortening functionality, using bitly.

import Router from '@koa/router';
import body from 'koa-json-body';

import { shortenUrl, expandUrl } from '../logic/shorten-url';
import { getLogger } from '../log';
import { BadRequestError } from '../utils/errors';

export function shortenRoutes() {
  const log = getLogger('routes.shorten');
  const router = new Router();

  router.post('/shorten', body(), async (ctx) => {
    log.verbose('/shorten');

    if (!ctx.request.body) {
      // Send a "Bad Request" error if the body could not be parsed.
      throw new BadRequestError(`The body couldn't be parsed as JSON.`);
    }

    const { longUrl } = ctx.request.body;
    if (!longUrl) {
      throw new BadRequestError(`The property 'longUrl' is missing.`);
    }

    if (!longUrl.startsWith('https://profiler.firefox.com/')) {
      throw new BadRequestError(
        `Only profiler URLs are allowed by this service.`
      );
    }

    const shortUrl = await shortenUrl(longUrl);
    ctx.body = { shortUrl };
  });

  router.post('/expand', body(), async (ctx) => {
    log.verbose('/expand');
    if (!ctx.request.body) {
      // Send a "Bad Request" error if the body could not be parsed.
      throw new BadRequestError(`The body couldn't be parsed as JSON.`);
    }

    const { shortUrl } = ctx.request.body;
    if (!shortUrl) {
      throw new BadRequestError(`The property 'shortUrl' is missing.`);
    }

    const longUrl = await expandUrl(shortUrl);

    // The backend call has been made already, but still we want to discourage
    // malicious users from using this API to expand any URL.
    if (!longUrl.startsWith('https://profiler.firefox.com/')) {
      throw new BadRequestError(
        `Only profiler URLs are allowed by this service.`
      );
    }

    ctx.body = { longUrl };
  });

  return router;
}
