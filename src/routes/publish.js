/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// In this router is implemented the publishing operation. After doing various
// checks the data is uploaded to Google Cloud Storage.

import Router from '@koa/router';
import Stream from 'stream';
import { promisify } from 'util';

import { getLogger } from '../log';
import { config } from '../config';
import { create as gcsStorageCreate } from '../logic/gcs';
import * as Jwt from '../logic/jwt';
import {
  HasherPassThrough,
  LengthCheckerPassThrough,
  Concatenator,
  CheapJsonChecker,
  forwardErrors,
  GunzipWrapper,
} from '../utils/streams';
import { PayloadTooLargeError } from '../utils/errors';

const MAX_BODY_LENGTH = 50 * 1024 * 1024; // 50MB

export function publishRoutes() {
  const log = getLogger('routes.publish');

  const router = new Router();

  router.post('/compressed-store', async (ctx) => {
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
    // The payload should "look like" a json object.
    const jsonChecker = new CheapJsonChecker();
    const gunzipStream = new GunzipWrapper();
    const concatener = new Concatenator();

    // The "pipeline" utility conveniently destroys all streams when there's an
    // error. However the HTTP request isn't part of the pipeline because we
    // don't want to destroy it. Indeed if it's destroyed, the socket is closed
    // and we can't send a nice error to the caller.
    const pipeline = promisify(Stream.pipeline);
    const finished = promisify(Stream.finished);

    // We create 2 interconnected pipelines:
    //
    //     request
    //        |
    //  lengthChecker --- gunzipStream --- jsonChecker
    //        |
    // hasherTransform
    //        |
    //   concatener
    //
    // These streams' possible errors are handled partly by nodejs' pipeline
    // function, and some special error handlers to forward errors between
    // pipelines.

    // 1. First and main pipeline
    const pipelinePromise = pipeline(
      lengthChecker,
      hasherTransform,
      concatener
    );

    // 2. "Gunzip and check" json pipeline
    // This pipeline will stop quite early, once we know this looks like a json.
    // When it ends we'll just unpipe.
    // We don't use the `pipeline` utility because with it we get some
    // "premature close" errors when the length checker errors out.
    lengthChecker.pipe(gunzipStream);
    gunzipStream.pipe(jsonChecker);
    const jsonCheckerPromise = finished(jsonChecker);

    // Stop the flow by unpiping when we're done checking the JSON.
    jsonChecker.on('finish', () => {
      log.verbose(
        'json-checker-pipeline-done',
        'The stream pipeline to check the json content is finished.'
      );

      // Note this is important to unpipe, because jsonChecker stopped consuming
      // the data, and so if we don't stop the flow, the main pipeline will also
      // stop flowing once the buffers in the second pipeline are full.
      lengthChecker.unpipe(gunzipStream);
      gunzipStream.destroy();
    });

    // Forward errors between streams in the second pipeline, as well as the
    // first pipeline through lengthChecker.
    // Note that errors inside the first pipeline are forwarded thanks to the
    // `pipeline` thingie.
    forwardErrors(lengthChecker, gunzipStream, jsonChecker);

    // The HTTP Request is piped directly to the first stream in the pipeline.
    // We do no error handling here: simply if there's an error (either expected
    // or unexpected) and lengthChecker is destroyed, the request won't flow
    // anymore. The request's destroy should be properly handled by Koa or node.
    ctx.req.pipe(lengthChecker);

    // We still wait for the end of both pipelines before moving forward.
    // If there's an error (either expected or unexpected) it will bubble up to
    // Koa which will expose it appropriately to the caller.
    await Promise.all([pipelinePromise, jsonCheckerPromise]);

    // Step 2: Upload the data to Google Cloud Storage.
    // All data chunks have been stored in the concatener, that we'll read from
    // to feed the google write stream.
    const storage = gcsStorageCreate(config);
    const hash = hasherTransform.sha1();
    const googleStorageStream = storage.getWriteStreamForFile(hash);

    // We don't use `pipeline` because we want to cleanly unpipe and cleanup
    // when the request is aborted.
    concatener.pipe(googleStorageStream);

    // We can't use Stream.finished here either because of a problem with Google's
    // library. For more information, you can see
    // https://github.com/googleapis/nodejs-storage/issues/937
    await new Promise((resolve, reject) => {
      googleStorageStream.once('error', reject);
      googleStorageStream.once('finish', resolve);
    });
    googleStorageStream.destroy();
    concatener.destroy();

    const jwtToken = Jwt.generateToken({ profileToken: hash });

    ctx.body = jwtToken;
  });

  return router;
}
