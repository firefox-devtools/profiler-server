/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import convict from 'convict';

const conf = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  httpPort: {
    format: 'port',
    default: 4243,
    // The environment variable's name is required by Dockerflow.
    // see https://github.com/mozilla-services/Dockerflow#containerized-app-requirements
    env: 'PORT',
  },
});

conf.validate();

type Config = {|
  +env: string,
  +httpPort: number,
|};

const config: Config = conf.getProperties();

export default config;
