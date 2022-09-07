/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import Koa from 'koa';
import helmet from 'koa-helmet';

import { config } from './config';
import { getLogger, logLevel } from './log';
import { configureRoutes } from './routes';
import { reportTo } from './middlewares';

const log = getLogger('app');

export function createApp() {
  const app = new Koa();

  // attach general utils.
  app.on('error', (err) => {
    log.error('server_error', { error: err, stack: err.stack });
  });

  if (config.env === 'development' || logLevel === 'verbose') {
    // For now we use this logger only for development because it's a bit
    // costly. It's disabled in tests but can be enabled when configuring the
    // environment variable LOG_LEVEL to "verbose".
    // In production we should be able to have the logs of requests from
    // the server frontend instead.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    app.use(require('koa-logger')());
  }

  app.use(
    reportTo([
      {
        group: 'cspreport',
        maxAge: 365 * 24 * 60 * 60, // 1 year
        // The URL here should be identical to the URL we specify in the CSP policy below.
        endpoints: [{ url: '/__cspreport__' }],
      },
    ])
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        // because this is an API server and shouldn't be used as a webpage,
        // everything is locked down as much as possible, following the
        // checklist at https://github.com/mozilla-services/websec-check.
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'self'"],
          // This URI is what the checklist (see link above) suggests.
          reportUri: '/__cspreport__',
          reportTo: 'cspreport',
        },
      },
      hsts: {
        // 2 years according to https://wiki.mozilla.org/Security/Server_Side_TLS
        maxAge: 2 * 365 * 24 * 60 * 60,
      },
      frameguard: { action: 'deny' },
    })
  );

  configureRoutes(app);

  return app;
}
