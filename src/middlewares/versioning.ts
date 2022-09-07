/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// This middleware ensures that the request specifies the versioning header and
// its value is the expected value.
// In the future we'll want to implement an upgrade mechanism.

import type { Context } from 'koa';

import contentType from 'content-type';

// This mime-type is a vendor mime-type (because this starts with `vnd.`). It
// also uses the 'json' suffix to outline that the content, if any, is in JSON form.
// Lastly we specify the version as a mime-type parameter (;version=XXX).
// Here is an acceptable value for the Accept header:
//   application/vnd.firefox-profiler+json; version=1
export const ACCEPT_VALUE_MIME = 'application/vnd.firefox-profiler+json';

export function versioning(expectedVersion: number) {
  return async function (ctx: Context, next: () => Promise<void>) {
    const acceptValue = ctx.get('accept');
    if (!acceptValue) {
      ctx.throw(400, `The header 'Accept' is missing.`);
      return;
    }

    // An Accept header can contain several values separated by a comma.
    // In this case this probably comes from a browser, and won't contain the
    // value we're looking for here, but we're still looking at all values for
    // correctness.

    const acceptValues = acceptValue.split(',');

    const hasAcceptableValue = acceptValues.some((acceptValue) => {
      const parsedAcceptValue = contentType.parse(acceptValue);
      const receivedVersion = +parsedAcceptValue.parameters.version;
      const isAcceptableValue =
        parsedAcceptValue.type === ACCEPT_VALUE_MIME &&
        receivedVersion === expectedVersion;
      return isAcceptableValue;
    });

    if (!hasAcceptableValue) {
      const expectedValue = contentType.format({
        type: ACCEPT_VALUE_MIME,
        parameters: { version: expectedVersion },
      });
      ctx.throw(
        406,
        `The header 'Accept' should have the value ${expectedValue}`
      );
      return;
    }

    await next();
  };
}
