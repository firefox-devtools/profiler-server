/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import Router from '@koa/router';
import cors from '@koa/cors';

import { dockerFlowRoutes } from './dockerflow';
import { publishRoutes } from './publish';
import { cspReportRoutes } from './cspReport';

import { versioning } from '../middlewares';

export function routes() {
  const router = new Router();
  router.use(dockerFlowRoutes().routes());
  router.use(cspReportRoutes().routes());

  // Versioning and CORS applies only to API routes, that's why we specify it here.
  router.use(versioning(1));
  // We use the default configuration for cors, that is we allow all origins and
  // all methods.
  router.use(cors());
  router.use(publishRoutes().routes());
  return router;
}
