/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

// Import dotenv configuration as early as possible, so that other modules that
// depend on environment variables can access the values specified in .env.
import { AddressInfo } from 'net';
import './dotenv';
import { createApp } from './app';
import { config } from './config';
import { getLogger } from './log';

const log = getLogger('index');
const app = createApp();

const server = app.listen(config.httpPort);
log.info('server_started', { port: (server.address() as AddressInfo).port });

function gracefulExit() {
  log.info('server_exit', 'Received exit request. Closing app...');

  server.close((err) => {
    if (err) {
      log.error('server_exit_error', err);
    }
  });
}

process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);
