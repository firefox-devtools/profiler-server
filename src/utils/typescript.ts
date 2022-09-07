/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

/**
 * This file contains utils that help Flow understand things better. Occasionally
 * statements can be logically equivalent, but Flow infers them in a specific way. Most
 * of the time tweaks can be done by editing the type system, but occasionally functions
 * are needed to get the desired result.
 */

/**
 * This function can be run as the default arm of a switch statement to ensure exhaustive
 * checking of a given type. It relies on an assumption that all cases will be handled
 * and the input to the function will be empty. This function hopefully makes that check
 * more readable.
 */
export function assertExhaustiveCheck(
  notValid: never,
  errorMessage = `There was an unhandled case for the value: "${notValid}"`
): void {
  throw new Error(errorMessage);
}

/**
 * This function makes it easier to deal with nullable objects, especially in
 * tests.
 */
export function ensureExists<T>(item?: T, message?: string): T {
  if (item === null) {
    throw new Error(message || 'Expected an item to exist, and it was null.');
  }
  if (item === undefined) {
    throw new Error(
      message || 'Expected an item to exist, and it was undefined.'
    );
  }
  return item;
}
