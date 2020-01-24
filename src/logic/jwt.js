/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import jwt from 'jsonwebtoken';
import { config } from '../config';

type Payload = {|
  +profileToken: string,
|};

class JwtConfigurationError extends Error {
  name = 'JwtConfigurationError';
  status = 500;
  expose = true; // The message will be exposed to users
}

export function getToken(payload: Payload): string {
  if (config.jwtSecret) {
    return jwt.sign(payload, config.jwtSecret);
  }

  throw new JwtConfigurationError('The secret for JWT generation is missing.');
}
