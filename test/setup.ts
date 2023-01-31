/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import nock from 'nock';

// Forbid connections to Internet. We should have a test error if we attempt
// such a connection.
nock.disableNetConnect();
// But allow localhost connections so we can test local routes and mock servers.
nock.enableNetConnect('127.0.0.1');

afterEach(() => {
  // The configuration to restore and reset all of the mocks in tests does not seem
  // to be working correctly. Manually trigger this call here to ensure we
  // don't get intermittents from one test's mocks affecting another test's mocks.
  //
  // We use `restoreAllMocks` over `resetAllMocks` because this restores the
  // mocks to their initial value. `resetAllMocks` would keep the mock and make
  // them return `undefined`.
  //
  // See https://github.com/facebook/jest/issues/7654
  jest.restoreAllMocks();
  jest.clearAllTimers();

  // Cleans up all network mocks.
  nock.cleanAll();
});
