/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  // We don't want to run a local configuration file for tests so that we
  // ensure that they'll always run the same in all environments.
  dotenv.config();
}
