/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import Koa from 'koa';

import config from './config';
import routes from './routes';

const app = new Koa();

const router = routes();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(config.httpPort);
console.log('The HTTP server is listening on port %s.', config.httpPort);
