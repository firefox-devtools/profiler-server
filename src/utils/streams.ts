/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file holds various utilities about streams.

import { Transform, Writable, Readable } from 'stream';
import { createGunzip, Gunzip } from 'zlib';
import { isJsonSlabsFile, MAGIC_LENGTH as JSLB_MAGIC_LENGTH } from 'json-slabs';

import { getLogger, Logger } from '../log';
import { BadRequestError, PayloadTooLargeError } from './errors';

/**
 * This transform's sole goal is to check that the size of the streamed data
 * stays within some limit.
 */
export class LengthCheckerPassThrough extends Transform {
  log: Logger = getLogger('LengthCheckerPassThrough');
  maxLength: number;
  length = 0;

  constructor(maxLength: number) {
    super();
    this.maxLength = maxLength;
  }

  _transform(
    chunk: string | Buffer,
    encoding: string,
    callback: (error?: Error) => unknown
  ) {
    this.length += chunk.length;
    this.log.verbose(
      'length-checker-length',
      `Added chunk's length is ${chunk.length}, current length is ${this.length}`
    );

    if (this.length > this.maxLength) {
      // Using debug instead of verbose will make it possible to assert it in
      // tests that we actually checked the length through this class.
      this.log.debug('length-checker-length-error');
      callback(new PayloadTooLargeError(this.maxLength));
      return;
    }

    this.push(chunk);
    callback();
  }
}

/**
 * This writable stream keeps all received chunks until the stream is closed.
 * Then the chunks are concatenated into a unique Buffer that can be retrieved.
 *
 * This is used in tests only.
 */
export class Concatenator extends Writable {
  log: Logger = getLogger('Concatenator');
  chunks: Buffer[] = [];
  contents: Buffer | null = null;

  constructor() {
    super({
      // This stream needs to be explicitely destroyed.
      autoDestroy: false,
    });
  }

  _write(
    chunk: string | Buffer,
    encoding: string,
    callback: (error?: Error) => unknown
  ) {
    if (!(chunk instanceof Buffer)) {
      callback(new Error(`This stream doesn't support strings.`));
      return;
    }

    this.chunks.push(chunk);
    callback();
  }

  _destroy(err: Error | null, callback: (error?: Error | null) => unknown) {
    this.log.trace('_destroy()');
    this.chunks.length = 0;
    this.contents = null;

    // Passthrough the error information, if present.
    callback(err);
  }

  _final(callback: (error?: Error) => unknown) {
    this.log.trace('_final()');
    this.contents = Buffer.concat(this.chunks);
    this.chunks.length = 0;
    callback();
  }

  transferContents(): Buffer {
    this.log.trace('transferContents()');
    const contents = this.contents;
    if (contents === null) {
      throw new Error(
        `Can't transfer before the stream has been ended or after it's been destroyed.`
      );
    }
    this.contents = null;
    return contents;
  }
}

// This Transform cheaply checks that a gzipped stream looks like a JSON object
// or a JSLB (JsonSlabs binary container) file. See https://www.npmjs.com/package/json-slabs.
export class CheapContentChecker extends Writable {
  log: Logger = getLogger('CheapContentChecker');
  // Buffer of leading bytes collected for the initial JSLB magic sniff. Once
  // it reaches JSLB_MAGIC_LENGTH bytes we decide, and either accept as JSLB or
  // fall through to a JSON check.
  headerBuffer: Buffer = Buffer.alloc(0);
  // Set once we know the stream isn't a JSLB file; from that point on we only
  // scan subsequent chunks for the JSON opening.
  jslbRuledOut = false;
  checkEnded = false;

  errorMessage = `The payload isn't a JSON object or a JSLB file.`;

  // Returns true if this chunk finished the check (with success or error), so
  // the caller shouldn't do further processing.
  private _scanForJsonOpening(
    bytes: Buffer,
    callback: (error?: Error) => void
  ): boolean {
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      // ASCII whitespace allowed by JSON (space, tab, LF, CR).
      if (byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d) {
        continue;
      }
      if (byte === 0x7b /* `{` */) {
        this.log.verbose('content-found', 'This stream looks like a JSON.');
        this.checkEnded = true;
        this.emit('profiler:checkEnded');
        callback();
        return true;
      }
      this.log.verbose(
        'content-error',
        'This stream does not look like JSON or JSLB.'
      );
      callback(new BadRequestError(this.errorMessage));
      return true;
    }
    return false;
  }

  _write(
    chunk: string | Buffer,
    encoding: string,
    callback: (error?: Error) => void
  ) {
    if (!(chunk instanceof Buffer)) {
      callback(new Error(`This stream doesn't support strings.`));
      return;
    }

    if (this.checkEnded || chunk.length === 0) {
      callback();
      return;
    }

    if (!this.jslbRuledOut) {
      // Accumulate the first JSLB_MAGIC_LENGTH bytes so we can call
      // isJsonSlabsFile with the required minimum.
      const need = JSLB_MAGIC_LENGTH - this.headerBuffer.length;
      const take = Math.min(need, chunk.length);
      this.headerBuffer = Buffer.concat([
        this.headerBuffer,
        chunk.subarray(0, take),
      ]);

      if (this.headerBuffer.length < JSLB_MAGIC_LENGTH) {
        this.log.verbose(
          'content-not-found',
          'Still accumulating bytes to sniff the content type.'
        );
        callback();
        return;
      }

      if (isJsonSlabsFile(this.headerBuffer)) {
        this.log.verbose('content-found', 'This stream looks like a JSLB.');
        this.checkEnded = true;
        this.emit('profiler:checkEnded');
        callback();
        return;
      }

      // Not JSLB. Scan the accumulated header bytes for a JSON opening; if
      // they're all whitespace, keep scanning subsequent chunks.
      this.jslbRuledOut = true;
      if (this._scanForJsonOpening(this.headerBuffer, callback)) {
        return;
      }

      // headerBuffer was all whitespace; scan the rest of the current chunk.
      const rest = chunk.subarray(take);
      if (rest.length > 0 && this._scanForJsonOpening(rest, callback)) {
        return;
      }
      callback();
      return;
    }

    if (this._scanForJsonOpening(chunk, callback)) {
      return;
    }
    this.log.verbose(
      'content-not-found',
      'We still do not know if this is a JSON.'
    );
    callback();
  }

  // This is called when all the data has been given to _write and the
  // stream is ended.
  _final(callback: (error?: Error) => void) {
    this.log.trace('_final()');
    if (this.checkEnded) {
      callback();
      return;
    }

    // The stream ended before we could accumulate JSLB_MAGIC_LENGTH bytes, so
    // we can't be sure it's not JSLB. But since a JSLB file needs at least
    // FIXED_HEADER_SIZE bytes (>= MAGIC_LENGTH), a shorter payload can only be
    // valid as JSON. Try to find a JSON opening in the bytes we have.
    if (!this.jslbRuledOut && this.headerBuffer.length > 0) {
      if (this._scanForJsonOpening(this.headerBuffer, callback)) {
        return;
      }
    }

    // If we're coming here, this means we never finished checking. Let's
    // happily throw, then!
    callback(new BadRequestError(this.errorMessage));
  }
}

// This simple wrapper simply encapsulates the native gunzip stream and rewrite
// errors to make them more compatible with our code and koa's error handling.
export class GunzipWrapper extends Transform {
  gunzipStream: Gunzip = createGunzip();

  constructor() {
    super();
    this.gunzipStream.on('error', (err) => {
      this.emit(
        'error',
        new BadRequestError(`The payload isn't gzip-compressed (${err}).`)
      );
    });
    this.gunzipStream.on('data', (data) => {
      this.push(data);
    });
  }

  _transform(
    chunk: string | Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error) => unknown
  ) {
    const shouldWriteMore = this.gunzipStream.write(chunk, encoding);
    if (shouldWriteMore) {
      callback();
    } else {
      this.gunzipStream.once('drain', callback);
    }
  }

  _flush(callback: (error?: Error) => unknown) {
    this.gunzipStream.end();
    // It's important to wait for the end event in case ending the gzip stream
    // brings more errors.
    this.gunzipStream.once('end', callback);
  }

  _destroy(err: Error | null, callback: (error: Error | null) => unknown) {
    this.gunzipStream.destroy(err || undefined);
    callback(err);
  }
}

// This tool simply forward an error happening on a stream to other streams, by
// destroying them.
export function forwardErrors(
  ...streams: ReadonlyArray<Readable | Writable>
): void {
  const log = getLogger('utils.streams.forwardErrors');
  streams.forEach((stream, i) => {
    // Note that we leave the "error" handler even after we receive one.
    //
    // The reason is that a stream can output errors several times, and if a
    // stream outputs an error but there's no error handler, node forcefully
    // crashes (mozlog generates instead a critical log, and jest fails tests).
    //
    // When we call "destroy" on the other streams they themselves emit errors,
    // and so we call "destroy" on all streams again.
    // The "destroy" function itself has a mechanism that writable strams won't
    // emit an error more than once through destroy, but some error cases of
    // some streams don't take part to this mechanism (eg: errors when
    // ungzipping). As a result errors can be emitted twice through this
    // mechanism.
    //
    // We could try to remember which stream we handled already, but this is
    // simpler.
    stream.on('error', (err) => {
      log.verbose('error', `stream ${i} received an error ${err.toString()}`);
      streams.forEach((stream) => {
        stream.destroy(err);
      });
    });
  });
}
