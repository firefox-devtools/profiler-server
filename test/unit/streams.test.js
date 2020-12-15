/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import util from 'util';
import Stream, { PassThrough } from 'stream';
import { gzipSync } from 'zlib';

import {
  Concatenator,
  CheapJsonChecker,
  GunzipWrapper,
} from '../../src/utils/streams';

// In this test file, we're using the pipeline function, mainly because that's
// how we'll use these streams in the app code.
const pipeline = util.promisify(Stream.pipeline);
const nextTick = util.promisify(process.nextTick);
describe('CheapJsonChecker', () => {
  it('accepts normal content', async () => {
    const fixture = '{ "foo": "bar" }';
    const checker = new CheapJsonChecker();
    const input = new PassThrough();
    input.write(fixture.slice(0, 3));
    input.end(fixture.slice(3));
    await expect(pipeline(input, checker)).resolves.toBe(undefined);
  });

  it('accepts content with some space at the start', async () => {
    const fixture = '                               { "foo": "bar" }';
    const checker = new CheapJsonChecker();
    const input = new PassThrough();
    input.write(fixture.slice(0, 3));
    input.end(fixture.slice(3));
    await expect(pipeline(input, checker)).resolves.toBe(undefined);
  });

  it(`rejects if there's only space in the content`, async () => {
    const fixture = '                           ';
    const checker = new CheapJsonChecker();
    const input = new PassThrough();
    input.write(fixture);
    input.end();
    await expect(pipeline(input, checker)).rejects.toThrow(
      "The payload isn't a JSON object."
    );
  });

  it('rejects if required content is missing', async () => {
    const fixture = 'bad content';
    const checker = new CheapJsonChecker();
    const input = new PassThrough();
    input.write(fixture);
    // Note: we don't call .end() so that we test that we can find a bad content
    // before reaching the end of the stream.
    await expect(pipeline(input, checker)).rejects.toThrow(
      "The payload isn't a JSON object."
    );
  });

  it('supports unicode characters too', async () => {
    const fixture = '{ "éàçâ": "bar" }';
    const checker = new CheapJsonChecker();
    const input = new PassThrough();
    input.write(fixture.slice(0, 3)); // This should cut in the middle of a unicode character
    input.end(fixture.slice(3));
    await expect(pipeline(input, checker)).resolves.toBe(undefined);
  });

  it('supports long-running operations', async () => {
    const fixture = '{ "foo": "bar" }';
    const checker = new CheapJsonChecker();
    const input = new PassThrough();
    const pipelinePromise = pipeline(input, checker);
    input.write(fixture.slice(0, 3));
    await nextTick();
    input.end(fixture.slice(3));
    await expect(pipelinePromise).resolves.toBe(undefined);
  });
});

describe('GunzipWrapper', () => {
  it('can unzip things', async () => {
    const fixture = '{"foo": "aaaa"}';
    const payload = gzipSync(fixture);
    const gunzipStream = new GunzipWrapper();
    const concatenator = new Concatenator();
    const pipelinePromise = pipeline(gunzipStream, concatenator);

    gunzipStream.write(payload);
    gunzipStream.end();

    await pipelinePromise;
    expect(concatenator.transferContents().toString()).toBe(fixture);
  });

  it('wraps gzip errors', (done) => {
    const payload = '{"foo": "aaaa"}';
    const gunzipStream = new GunzipWrapper();
    gunzipStream.resume();
    gunzipStream.on('end', () =>
      done(new Error('We should have had an error.'))
    );
    gunzipStream.on('error', (err) => {
      expect(err.name).toBe('BadRequestError');
      expect(err.message).toMatch(/The payload isn't gzip-compressed/);
      done();
    });

    gunzipStream.write(payload);
    gunzipStream.end();
  });

  it('errors for truncated gzip streams too', (done) => {
    const fixture = '{"foo": "aaaa"}';
    const payload = gzipSync(fixture);
    const gunzipStream = new GunzipWrapper();
    gunzipStream.resume();
    gunzipStream.on('end', () =>
      done(new Error('We should have had an error.'))
    );
    gunzipStream.on('error', (err) => {
      expect(err.name).toBe('BadRequestError');
      expect(err.message).toMatch(/The payload isn't gzip-compressed/);
      expect(err.message).toMatch(/unexpected end of file/);
      done();
    });

    gunzipStream.write(payload.slice(0, fixture.length - 5));
    gunzipStream.end();
  });
});
