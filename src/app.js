/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import Koa from 'koa';

import routes from './routes';

export function createApp() {
  const app = new Koa();

  // Adding the main endpoints for this app.
  // koa-router exposes 2 middlewares:
  // - the result of routes() returns the configured routes.
  // - the result of allowedMethods() configures the OPTIONS verb.
  const router = routes();
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
