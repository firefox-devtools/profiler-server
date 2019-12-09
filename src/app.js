/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import Koa from 'koa';
import helmet from 'koa-helmet';

import { config } from './config';
import { getLogger, logLevel } from './log';
import { routes } from './routes';
import { reportTo } from './middlewares';

const log = getLogger('app');

export function createApp() {
  const app = new Koa();

  // attach general utils.
  app.on('error', err => {
    log.error('server_error', { error: err, stack: err.stack });
  });

  if (config.env === 'development' || logLevel === 'verbose') {
    // For now we use this logger only for development because it's a bit
    // costly. It's disabled in tests but can be enabled when configuring the
    // environment variable LOG_LEVEL to "verbose".
    // In production we should be able to have the logs of requests from
    // the server frontend instead.
    app.use(require('koa-logger')());
  }

  app.use(
    reportTo([
      {
        group: 'cspreport',
        maxAge: 365 * 24 * 60 * 60,
        endpoints: [{ url: '/__cspreport__' }],
      },
    ])
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          reportUri: '/__cspreport__',
          reportTo: 'cspreport',
        },
      },
      hsts: {
        maxAge: 31536000, // 1year
      },
    })
  );

  // Adding the main endpoints for this app.
  // koa-router exposes 2 middlewares:
  // - the result of routes() returns the configured routes.
  // - the result of allowedMethods() configures the OPTIONS verb.
  const router = routes();
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
