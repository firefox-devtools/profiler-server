/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// This router implements a very simple route for /, so that we can more easily
// test the server through tools like the Mozilla Observatory.

import Router from '@koa/router';
import { getLogger } from '../log';

export function rootRoutes() {
  const log = getLogger('routes.root');
  const router = new Router();

  router.get('/', async (ctx) => {
    log.verbose('/');

    // Let's output a minimal (valid!) HTML document with a link to our repository.
    ctx.body = `
      <!doctype html>
      <html lang='en'>
      <meta charset='utf-8'>
      <title>Firefox Profiler Server</title>
      This is the Firefox Profiler server.
      See <a href='https://github.com/firefox-devtools/profiler-server'>https://github.com/firefox-devtools/profiler-server</a>
      for more information.
    `;
  });

  router.get('/contribute.json', async (ctx) => {
    ctx.status = 301; // Permanent Redirect
    ctx.redirect('https://profiler.firefox.com/contribute.json');
  });

  return router;
}
