/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import Koa from 'koa';

import { config } from './config';
import { getLogger } from './log';
import { routes } from './routes';

const log = getLogger('app');

export function createApp() {
  const app = new Koa();

  // attach general utils.
  app.on('error', err => {
    log.error('server_error', { error: err, stack: err.stack });
  });

  if (config.env === 'development') {
    // For now we use this logger only for development because it's a bit
    // costly. In production we should be able to have the logs of requests from
    // the server frontend instead.
    app.use(require('koa-logger')());
  }

  // Adding the main endpoints for this app.
  // koa-router exposes 2 middlewares:
  // - the result of routes() returns the configured routes.
  // - the result of allowedMethods() configures the OPTIONS verb.
  const router = routes();
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
