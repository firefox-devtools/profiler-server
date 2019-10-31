/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// In this router is implemented the publishing operation. After doing various
// checks the data is uploaded to Google Cloud Storage.

import Router from '@koa/router';
import Stream from 'stream';
import util from 'util';

import { getLogger } from '../log';
import { config } from '../config';
import { create as gcsStorageCreate } from '../logic/gcs';
import {
  HasherPassThrough,
  LengthCheckerPassThrough,
  Concatenator,
} from '../utils/streams';

const MAX_BODY_LENGTH = 32 * 1024 * 1024; // 32MB

export function publishRoutes() {
  const log = getLogger('routes.publish');

  const router = new Router();

  router.post('/compressed-store', async ctx => {
    log.verbose('/compressed-store');
    const expectedLength = ctx.request.length;

    if (expectedLength !== undefined && expectedLength > MAX_BODY_LENGTH) {
      log.verbose(
        'length-header-check',
        'The length specifided in the header Content-Length is too big.'
      );
      ctx.status = 413;
      return;
    }

    const hasherTransform = new HasherPassThrough();
    const lengthChecker = new LengthCheckerPassThrough(MAX_BODY_LENGTH);
    const concatener = new Concatenator();

    const pipeline = util.promisify(Stream.pipeline);
    await pipeline(ctx.req, lengthChecker, hasherTransform, concatener);

    const storage = gcsStorageCreate(config);
    const hash = hasherTransform.sha1();

    const googleStorageStream = storage.getWriteStreamForFile(hash);

    // We can't use Stream.finished here because of a problem with Google's
    // library. For more information, you can see
    // https://github.com/googleapis/nodejs-storage/issues/937
    await new Promise((resolve, reject) => {
      const fullContent = concatener.transferContents();
      googleStorageStream.once('error', reject);
      googleStorageStream.once('finish', resolve);
      googleStorageStream.end(fullContent);
    });
    googleStorageStream.destroy();

    // This should be fine in this case.
    // eslint-disable-next-line require-atomic-updates
    ctx.body = hash;
  });

  return router;
}
