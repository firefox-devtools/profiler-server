/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
//
// Shamelessly stolen from Firefox Send.

import mozlog from 'mozlog';

type LowerCasedLogLevel =
  | 'trace' //     This will gather a stack automatically.
  | 'verbose' //   This is displayed only when run with LOG_LEVEL=verbose
  | 'debug' //     This is displayed in test and development environments.
  | 'info' //      This is displayed in production too.
  | 'warn' //      This is for messages more important than info but that aren't errors.
  | 'error' //     This is for non-fatal errors.
  | 'critical'; // This is for fatal errors.

function toValidLogLevel(logLevel: ?string) {
  if (!logLevel) {
    return null;
  }

  const lowerCasedLogLevel = logLevel.toLowerCase();
  switch (lowerCasedLogLevel) {
    case 'trace':
    case 'verbose':
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
    case 'critical':
      return lowerCasedLogLevel;
    default:
      return null;
  }
}

// Note we don't use `config` because we want `config` to be able to log using
// this file, and we want to avoid cycles in dependencies.
const isProduction = process.env.NODE_ENV === 'production';

// We can configure the log level from an environment variable LOG_LEVEL, but by
// default this is 'debug' in development and test, and 'info' in production.
const logLevelFromEnvironment = toValidLogLevel(process.env.LOG_LEVEL);
export const logLevel: LowerCasedLogLevel = logLevelFromEnvironment
  ? logLevelFromEnvironment
  : isProduction
  ? 'info'
  : 'debug';

export const getLogger = mozlog({
  app: 'FirefoxProfiler',
  level: logLevel,
  fmt: isProduction ? 'heka' : 'pretty',
  debug: !isProduction, // This asserts a correct usage of the library
});

type ExtractReturnType = <T>((...rest: any) => T) => T;
export type Logger = $Call<ExtractReturnType, typeof getLogger>;
