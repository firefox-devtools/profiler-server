/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// This middleware ensures that the request specifies the versioning header and
// its value is the expected value.
// In the future we'll want to implement an upgrade mechanism.
import type { Context } from 'koa';

export const ACCEPT_VALUE_PREFIX =
  'application/vnd.firefox-profiler+json;version=';
export function versioning(version: string) {
  return async function(ctx: Context, next: () => Promise<void>) {
    const acceptValue = ctx.get('accept');
    if (!acceptValue) {
      ctx.throw(400, `The header 'Accept' is missing.`);
      return;
    }

    if (!acceptValue.startsWith(ACCEPT_VALUE_PREFIX)) {
      ctx.throw(
        400,
        `The header 'Accept' should have the value ${ACCEPT_VALUE_PREFIX}${version}`
      );
      return;
    }

    const requestedVersion = acceptValue.slice(ACCEPT_VALUE_PREFIX.length);
    if (requestedVersion !== version) {
      ctx.throw(
        406,
        `Only the API version ${version} is supported by this server.`
      );
    }

    await next();
  };
}
