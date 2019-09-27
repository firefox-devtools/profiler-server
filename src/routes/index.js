/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import Router from '@koa/router';
import { dockerFlowRoutes } from './dockerflow';

export default function() {
  const router = new Router();
  router.get('/', ctx => {
    ctx.body = 'Hello world!';
  });

  router.use(dockerFlowRoutes().routes());
  return router;
}
