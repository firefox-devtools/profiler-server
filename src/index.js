/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import { createApp } from './app';
import { config } from './config';

const app = createApp();
app.listen(config.httpPort);
console.log('The HTTP server is listening on port %s.', config.httpPort);
