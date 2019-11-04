/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import convict from 'convict';
import { getLogger } from './log';

const log = getLogger('config');

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

if (conf.get('env') !== 'test') {
  // We don't want to run a local configuration file for tests so that we
  // ensure that they'll always run the same in all environments.
  try {
    // Load local configuration if present.
    conf.loadFile('./local-config.json');
    log.debug(
      'local_configuration',
      `Local configuration file 'local-config.json' was found and loaded.`
    );
  } catch (e) {
    // But it's OK if it's absent.
    log.debug(
      'local_configuration',
      `Local configuration file 'local-config.json' was not found, but it's OK.`
    );
  }
}

conf.validate();

type Config = {|
  +env: string,
  +httpPort: number,
|};

export const config: Config = conf.getProperties();
log.info(
  'configuration_success',
  'Configuration info has been loaded successfully.'
);
