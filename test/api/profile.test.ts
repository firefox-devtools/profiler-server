/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import supertest from 'supertest';
import { gzipSync } from 'zlib';

import { Storage as MockStorage } from '../../__mocks__/@google-cloud/storage';
import { createApp } from '../../src/app';
import { ACCEPT_VALUE_MIME } from '../../src/middlewares/versioning';
import { generateToken, decodeToken } from '../../src/logic/jwt';
import jwt from 'jsonwebtoken';
import {
  checkSecurityHeaders,
  checkCorsHeader,
} from './utils/check-security-headers';
import { config } from '../../src/config';

beforeEach(() => MockStorage.cleanUp());
afterEach(() => MockStorage.cleanUp());

describe('DELETE /profile', () => {
  // This is the payload we'll send in most of the requests in this test.
  const BASIC_PAYLOAD = gzipSync('{"foo": "aaaa"}');

  function setup() {
    const acceptHeader = ACCEPT_VALUE_MIME + ';version=1';
    const agent = supertest(createApp().callback());

    async function postProfileToCompressedStore() {
      // First send a request to create a file.
      const result = await agent
        .post('/compressed-store')
        .accept(acceptHeader)
        .type('text')
        .send(BASIC_PAYLOAD)
        .expect(200);

      if (!result.text) {
        // Flow couldn't refine this on its own:
        throw new Error(
          'Could not find the text response from the post to compressed store.'
        );
      }
      const jwtToken = result.text;

      const profileToken: string = (decodeToken(jwtToken) as any).profileToken;

      return { profileToken, jwtToken };
    }

    return { acceptHeader, agent, postProfileToCompressedStore };
  }

  it('gives a 200 response when successfully uploading a profile', async function () {
    const { agent, acceptHeader, postProfileToCompressedStore } = setup();

    const { profileToken, jwtToken } = await postProfileToCompressedStore();

    expect(
      MockStorage.buckets['profile-store'].files[profileToken]
    ).toBeTruthy();

    // Then delete the file.
    await agent
      .delete(`/profile/${profileToken}`)
      .accept(acceptHeader)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send()
      .expect(200, 'Profile successfully deleted.');

    expect(
      MockStorage.buckets['profile-store'].files[profileToken]
    ).toBeFalsy();
  });

  it('gives a 401 response when not providing a JWT', async function () {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);
    const { agent, acceptHeader } = setup();

    await agent
      .delete('/profile/FAKE_HASH')
      .accept(acceptHeader)
      .send()
      .expect(
        401,
        'A valid authentication token is needed to execute this operation.'
      );

    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/WARN.*JsonWebTokenError/)
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/server_error.*ForbiddenError/)
    );
  });

  it('gives a 401 response when providing an invalid JWT', async function () {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);
    const { agent, acceptHeader } = setup();

    await agent
      .delete('/profile/FAKE_HASH')
      .accept(acceptHeader)
      .set('Authorization', `Bearer FAKE_TOKEN`)
      .send()
      .expect(
        401,
        'A valid authentication token is needed to execute this operation.'
      );

    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/WARN.*JsonWebTokenError/)
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/server_error.*ForbiddenError/)
    );
  });

  it('gives a 401 response when using the wrong JWT algorithm', async function () {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);
    const { agent, acceptHeader, postProfileToCompressedStore } = setup();

    const { profileToken } = await postProfileToCompressedStore();

    const badJwtToken = jwt.sign({ profileToken }, config.jwtSecret, {
      algorithm: 'none',
    });

    await agent
      .delete(`/profile/${profileToken}`)
      .accept(acceptHeader)
      .set('Authorization', `Bearer ${badJwtToken}`)
      .send()
      .expect(
        401,
        'A valid authentication token is needed to execute this operation.'
      );

    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/WARN.*JsonWebTokenError/)
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/server_error.*ForbiddenError/)
    );
  });

  it('gives a 401 response when providing a JWT with an unmatched profile token', async function () {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);
    const { agent, acceptHeader, postProfileToCompressedStore } = setup();

    const { profileToken } = await postProfileToCompressedStore();

    const badJwtToken = jwt.sign(
      { profileToken: 'DIFFERENT' },
      config.jwtSecret,
      {
        algorithm: 'HS256',
      }
    );

    await agent
      .delete(`/profile/${profileToken}`)
      .accept(acceptHeader)
      .set('Authorization', `Bearer ${badJwtToken}`)
      .send()
      .expect(
        401,
        'The profileToken in the JWT did not match the token provided in the path.'
      );

    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/WARN.*delete.*jwt_profileTokenMismatch/)
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/server_error.*ForbiddenError/)
    );
  });

  it('gives a 404 response when requesting to delete a profile that does not exist', async function () {
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((_: string | Uint8Array) => true);
    const { agent, acceptHeader } = setup();

    // Generate a random token.
    const profileToken = 'FAKE_HASH';
    const jwtToken = generateToken({ profileToken });

    await agent
      .delete(`/profile/${profileToken}`)
      .accept(acceptHeader)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send()
      .expect(404, 'That profile was most likely already deleted.');

    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/server_error.*NotFoundError/)
    );
  });

  it('implements security headers', async () => {
    const { agent, acceptHeader, postProfileToCompressedStore } = setup();
    const { profileToken, jwtToken } = await postProfileToCompressedStore();

    const corsHeaderValue = 'http://example.org';

    let request = agent
      .delete(`/profile/${profileToken}`)
      .accept(acceptHeader)
      .set('Origin', corsHeaderValue)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send();

    request = checkSecurityHeaders(request);
    request = checkCorsHeader(request, corsHeaderValue);

    await request;
  });
});
