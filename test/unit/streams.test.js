/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import util from 'util';
import Stream, { PassThrough } from 'stream';
import { gzipSync } from 'zlib';

import {
  CheapJsonChecker,
} from '../../src/utils/streams';

// In this test file, we're using the pipeline function, mainly because that's
// how we'll use these streams in the app code.
const pipeline = util.promisify(Stream.pipeline);
const nextTick = util.promisify(process.nextTick);
describe('EarlyContentChecker', () => {
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
