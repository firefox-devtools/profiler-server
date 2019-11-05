/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import Router from '@koa/router';
import { dockerFlowRoutes } from './dockerflow';

export function routes() {
  const router = new Router();
  router.use(dockerFlowRoutes().routes());
  return router;
}
