/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// In this router is implemented the publishing operation. After doing various
// checks the data is uploaded to Google Cloud Storage.

import Router from '@koa/router';
import Stream from 'stream';
import { promisify } from 'util';
import crypto from 'crypto';
import events from 'events';

import { getLogger } from '../log';
import { config } from '../config';
import { create as gcsStorageCreate } from '../logic/gcs';
import * as Jwt from '../logic/jwt';
import {
  LengthCheckerPassThrough,
  CheapJsonChecker,
  forwardErrors,
  GunzipWrapper,
} from '../utils/streams';
import { encode as toBase32 } from '../utils/base32';
import { PayloadTooLargeError } from '../utils/errors';

const MAX_BODY_LENGTH = 50 * 1024 * 1024; // 50MB

const randomBytes = promisify(crypto.randomBytes);

async function generateTokenForProfile(): Promise<string> {
  // We're especially interested in avoiding collision, but also interested that
  // we can't easily find a random profile by exhaustively crawling the token
  // space. That's why we use the number of 24 bytes (192
  // bits).
  // * This should be more then enough to avoid collisions, according to the Wikipedia page about UUID:
  //   https://en.wikipedia.org/wiki/Universally_unique_identifier#Collisions
  // * This should be also enough for crawlers, even if 32 bytes is usually
  //   recommended, because we'll expire the data soon, most uploaded profiles
  //   are sanitized by default, and only a fraction have useful information for
  //   an attacker.
  const randomBuffer = await randomBytes(24);
  return toBase32(randomBuffer);
}

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

    const profileToken = await generateTokenForProfile();

    const lengthChecker = new LengthCheckerPassThrough(MAX_BODY_LENGTH);
    // The payload should "look like" a json object.
    const jsonChecker = new CheapJsonChecker();
    const gunzipStream = new GunzipWrapper();

    const storage = gcsStorageCreate(config);
    const googleStorageStream = storage.getWriteStreamForFile(profileToken);

    // The "pipeline" utility conveniently destroys all streams when there's an
    // error. However the HTTP request isn't part of the pipeline because we
    // don't want to destroy it. Indeed if it's destroyed, the socket is closed
    // and we can't send a nice error to the caller.
    const pipeline = promisify(Stream.pipeline);

    // We create 2 interconnected pipelines:
    //
    //       request
    //          |
    //    lengthChecker --- gunzipStream --- jsonChecker
    //          |
    // googleStorageStream
    //
    // These streams' possible errors are handled partly by nodejs' pipeline
    // function, and some special error handlers to forward errors between
    // pipelines.

    // 1. First and main pipeline
    const pipelinePromise = pipeline(lengthChecker, googleStorageStream);

    // 2. "Gunzip and check" json pipeline
    // This pipeline will stop quite early, once we know this looks like a json.
    // When it ends we'll just unpipe.
    // We don't use the `pipeline` utility because with it we get some
    // "premature close" errors when the length checker errors out.
    lengthChecker.pipe(gunzipStream);
    gunzipStream.pipe(jsonChecker);

    const jsonCheckerPromise = events
      .once(jsonChecker, 'profiler:checkEnded')
      .then(() => {
        log.verbose(
          'json-checker-pipeline-done',
          'The stream pipeline to check the json content is finished.'
        );

        gunzipStream.unpipe(jsonChecker);
        lengthChecker.unpipe(gunzipStream);
        jsonChecker.destroy();
        gunzipStream.destroy();
      });

    // Forward errors between streams in the second pipeline, as well as the
    // first pipeline through lengthChecker. We want errors to be forwarded so
    // that the main pipeline is interrupted too.
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

    const jwtToken = Jwt.generateToken({ profileToken });

    ctx.body = jwtToken;
  });

  return router;
}
