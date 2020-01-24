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
import { PayloadTooLargeError } from '../utils/errors';

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
        'The length specified in the header Content-Length is too big.'
      );
      throw new PayloadTooLargeError(MAX_BODY_LENGTH);
    }

    const hasherTransform = new HasherPassThrough();
    const lengthChecker = new LengthCheckerPassThrough(MAX_BODY_LENGTH);
    const concatener = new Concatenator();

    // The "pipeline" utility conveniently destroys all streams when there's an
    // error. However the HTTP request isn't part of the pipeline because we
    // don't want to destroy it. Indeed if it's destroyed, the socket is closed
    // and we can't send a nice error to the caller.
    const pipeline = util.promisify(Stream.pipeline);
    const pipelinePromise = pipeline(
      lengthChecker,
      hasherTransform,
      concatener
    );

    // The HTTP Request is piped directly to the first stream in the pipeline.
    // We do no error handling here: simply if there's an error (either expected
    // or unexpected) and lengthChecker is destroyed, the request won't flow
    // anymore. The request's destroy should be properly handled by Koa or node.
    ctx.req.pipe(lengthChecker);

    // We still wait for the end of the pipeline before moving forward.
    // If there's an error (either expected or unexpected) it will bubble up to
    // Koa which will expose it appropriately to the caller.
    await pipelinePromise;

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

    // Eslint thinks that ctx.body is assigned a value that depends on a
    // previous value of ctx.body, which could be unsafe when using `await`. But
    // here this is obvously wrong, so let's disable the rule.
    // eslint-disable-next-line require-atomic-updates
    ctx.body = hash;
  });

  return router;
}
