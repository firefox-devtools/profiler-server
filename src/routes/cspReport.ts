/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Router from '@koa/router';
import body from 'koa-json-body';

import { getLogger } from '../log';
import { BadRequestError } from '../utils/errors';

// In this router we implement the service to handle csp reports.
export function cspReportRoutes() {
  const log = getLogger('routes.csp_report');

  const router = new Router();
  router.post('/__cspreport__', body(), async (ctx) => {
    if (!ctx.request.body) {
      // Send a "Bad Request" error if the body could not be parsed.
      throw new BadRequestError(`The body couldn't be parsed as JSON.`);
    }

    const cspReport = ctx.request.body['csp-report'];
    if (!cspReport) {
      // Send a "Bad Request" error as well if it doesn't look like a valid CSP report.
      throw new BadRequestError(`The request misses a 'csp-report' field!`);
    }

    // Otherwise, just log the request
    log.info('body', cspReport);
    ctx.status = 204; // No Content
  });

  return router;
}
