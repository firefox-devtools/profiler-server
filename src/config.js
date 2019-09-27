/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import convict from 'convict';

const conf = convict({
  httpPort: {
    format: Number,
    default: 4243,
    env: 'HTTP_PORT',
  },
});

conf.validate();

type Config = {|
  +httpPort: number,
|};

const config: Config = conf.getProperties();

export default config;
