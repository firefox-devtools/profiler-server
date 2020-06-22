/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// Base64url encoding is a variant of Base64 that's safer to use in filenames
// and URL, because in the alphabet, '+' and '/' are respectively replaced with
// '-' and '_'.
// We also skip the padding in this case, removing the ending `=` characters,
// because that's useless in our use.
// See https://tools.ietf.org/html/rfc4648#section-5 for more information.

// Useful RegExp expressions to remove or replace the characters from a base64 string.
const replacePaddingRe = /=+$/; // Replace adjacent '=' characters at the end of string.
const replacePlusRe = /\+/g; //    Replace all '+' characters anywhere.
const replaceSlashRe = /\//g; //   Replace all '/' characters anywhere.

export function toBase64url(buffer: Buffer): string {
  const base64Token = buffer.toString('base64');

  // We call replace several times instead of looping only once. This is good
  // enough in our case of using it with small strings, which is likely the case
  // when used in URLs or filenames.
  return base64Token
    .replace(replacePaddingRe, '')
    .replace(replacePlusRe, '-')
    .replace(replaceSlashRe, '_');
}
