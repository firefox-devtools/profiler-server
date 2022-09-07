/*
Copyright (C) 2011 by Isaac Wolkerstorfer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
*/
// This implementation comes from the project
// https://github.com/agnoster/base32-js, from this revision:
// https://raw.githubusercontent.com/agnoster/base32-js/40f5ae8eba3d432cdfdd6a53dae38aaff78ee96d/lib/base32.js
// and has been adapted for usage in the profiler server.
// Its licence is the MIT licence: https://raw.githubusercontent.com/agnoster/base32-js/40f5ae8eba3d432cdfdd6a53dae38aaff78ee96d/LICENSE
//
// @flow

// This would be the place to edit if you want a different
// Base32 implementation
// Note: We edited the original alphabet to add back the "s" and remove the "u",
// following Crockford's advice to avoid accidental profanity. Also "u" and "v"
// can be confused.
// Otherwise the characters "o", "i", "l" are absent.
const alphabet = '0123456789abcdefghjkmnpqrstvwxyz';

// This alias object is used only in the decoder, that we removed in the
// profiler-server code. We're keeping it to make it clear which characters we
// decide are confusing.
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const alias = { o: 0, i: 1, l: 1, u: 'v' };

/**
 * A streaming encoder
 *
 *     var encoder = new base32.Encoder()
 *     var output1 = encoder.update(input1)
 *     var output2 = encoder.update(input2)
 *     var lastoutput = encode.update(lastinput, true)
 */

export class Encoder {
  skip = 0; // how many bits we will skip from the first byte
  bits = 0; // 5 high bits, carry from one byte to the next

  output = '';

  // Read one byte of input
  // Should not really be used except by "update"
  readByte(byte: number | string) {
    // coerce the byte to an int
    if (typeof byte === 'string') byte = byte.charCodeAt(0);

    if (this.skip < 0) {
      // we have a carry from the previous byte
      this.bits |= byte >> -this.skip;
    } else {
      // no carry
      this.bits = (byte << this.skip) & 248;
    }

    if (this.skip > 3) {
      // not enough data to produce a character, get us another one
      this.skip -= 8;
      return 1;
    }

    if (this.skip < 4) {
      // produce a character
      this.output += alphabet[this.bits >> 3];
      this.skip += 5;
    }

    return 0;
  }

  // Flush any remaining bits left in the stream
  finish(check = false) {
    const output =
      this.output +
      (this.skip < 0 ? alphabet[this.bits >> 3] : '') +
      (check ? '$' : '');
    this.output = '';
    return output;
  }

  /**
   * Process additional input
   *
   * input: string of bytes to convert
   * flush: boolean, should we flush any trailing bits left
   *        in the stream
   * returns: a string of characters representing 'input' in base32
   */
  update(input: Buffer, flush: boolean) {
    for (let i = 0; i < input.length; ) {
      i += this.readByte(input[i]);
    }
    // consume all output
    let output = this.output;
    this.output = '';
    if (flush) {
      output += this.finish();
    }
    return output;
  }
}

/** Convenience functions
 *
 * These are the ones to use if you just have a string and
 * want to convert it without dealing with streams and whatnot.
 */

// String of data goes in, Base32-encoded string comes out.
export function encode(input: Buffer): string {
  const encoder = new Encoder();
  const output = encoder.update(input, true);
  return output;
}
