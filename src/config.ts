/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import fs from 'fs';
import convict from 'convict';
import { getLogger } from './log';

const log = getLogger('config');

class ConfigurationError extends Error {
  name = 'ConfigurationError';
}

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
      default: 5252,
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
    jwtSecret: {
      doc: `Secret that's used when generating and verifying JWT tokens`,
      format: String,
      default: process.env.NODE_ENV === 'test' ? 'secret' : null,
      env: 'JWT_SECRET',
    },
    bitlyToken: {
      doc: `This token is used to access the bitly API`,
      format: String,
      default: process.env.NODE_ENV === 'test' ? 'FAKE_TOKEN_FOR_TESTS' : '',
      env: 'BITLY_TOKEN',
    },
  });

  conf.validate();

  const resolvedConfig = conf.getProperties();

  validateConfigValues(resolvedConfig);

  return resolvedConfig;
}

// This checks if the configured values are valid, and throws otherwise.
function validateConfigValues(config: Config) {
  const { googleAuthenticationFilePath } = config;

  if (
    googleAuthenticationFilePath &&
    googleAuthenticationFilePath !== 'MOCKED'
  ) {
    // If some other value is set, we check it ahead of time so that the lib
    // doesn't output an error later.
    // Note that an empty string is a valid value: in that case the lib will try
    // to find the authentication information from other means.
    try {
      fs.accessSync(googleAuthenticationFilePath, fs.constants.R_OK);
    } catch (e) {
      log.critical(
        'gcs_configuration_error',
        `The authentication file '${googleAuthenticationFilePath}' is missing or not readable.`
      );
      throw new ConfigurationError(
        `The authentication file is missing or not readable.`
      );
    }
  }
}

type Config = Readonly<{
  env: string;
  httpPort: number;
  gcsBucket: string;
  googleAuthenticationFilePath: string;
  jwtSecret: string;
  bitlyToken: string;
}>;

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
