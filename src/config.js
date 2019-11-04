/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import convict from 'convict';
import { getLogger } from './log';

const log = getLogger('config');

function loadConfig() {
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
    gcsBucket: {
      doc: `The bucket in Google Cloud Storage we'll use to store files.`,
      format: String,
      default: 'profile-store',
      env: 'GCS_BUCKET',
    },
    googleAuthenticationFilePath: {
      // This holds the path to an authentication file, downloaded from the
      // Google Cloud Console.
      // Use the value "MOCKED" to use our mocked version of the service.
      doc: 'Path to the authentication file for Google Services',
      format: String,
      default: '',
      env: 'GCS_AUTHENTICATION_PATH',
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

  return conf.getProperties();
}

type Config = {|
  +env: string,
  +httpPort: number,
  +gcsBucket: string,
  +googleAuthenticationFilePath: string,
|};

export const config: Config = loadConfig();
log.info(
  'configuration_success',
  'Configuration info has been loaded successfully.'
);

// In tests we want to test how the config loads in several environments.
// Instead of testing the `config` object we test the result of `loadConfig`
// directly, so that this doesn't affect the main `config` object while other
// tests run in parallel.
export { loadConfig as loadConfigForTestsOnly };
