/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// This file contains useful errors.

export class BadRequestError extends Error {
  name = 'BadRequestError';
  status = 400;
  expose = true; // The message will be exposed to users
}

export class ForbiddenError extends Error {
  name = 'ForbiddenError';
  status = 401;
  expose = true; // The message will be exposed to users
}

export class NotFoundError extends Error {
  name = 'NotFoundError';
  status = 404;
  expose = true; // The message will be exposed to users
}

export class PayloadTooLargeError extends Error {
  name = 'PayloadTooLargeError';
  status = 413;
  expose = true;

  constructor(maxPayloadSize: number) {
    super(
      `The length is bigger than the configured maximum ${maxPayloadSize}.`
    );
  }
}
