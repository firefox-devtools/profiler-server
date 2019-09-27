/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// In this router we implement the services required by the dockerflow mozilla
// best practices, as described in https://github.com/mozilla-services/Dockerflow.

import Router from '@koa/router';

export function dockerFlowRoutes() {
  const router = new Router();

  // "Respond to /__heartbeat__ with a HTTP 200 or 5xx on error. This should
  // check backing services like a database for connectivity and may respond
  // with the status of backing services and application components as a JSON
  // payload."
  router.get('/__heartbeat__', ctx => {
    // TODO Later we'll need to ping back-end services like google storage.
    ctx.body = 'OK';
  });

  //
  // "Respond to /__lbheartbeat__ with an HTTP 200. This is for load balancer
  // checks and should not check backing services."
  router.get('/__lbheartbeat__', ctx => {
    ctx.body = 'OK';
  });

  return router;
}
