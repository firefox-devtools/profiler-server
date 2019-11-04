/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
//
// Shamelessly stolen from Firefox Send.

import mozlog from 'mozlog';

import { config } from './config';

const isProduction = config.env === 'production';

export const getLogger = mozlog({
  app: 'FirefoxProfiler',
  level: isProduction ? 'INFO' : 'verbose',
  fmt: isProduction ? 'heka' : 'pretty',
  debug: !isProduction, // This asserts a correct usage of the library
});

type ExtractReturnType = <T>((...rest: any) => T) => T;
export type Logger = $Call<ExtractReturnType, typeof getLogger>;
