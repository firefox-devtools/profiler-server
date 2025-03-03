/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { config } from '../config';
import { getLogger } from '../log';

class BitlyConfigurationError extends Error {
  name = 'BitlyConfigurationError';
  status = 500;
  expose = true; // The message will be exposed to users
}

type BitlyJsonError = {
  message: string;
  description: string;
  resource: string;
  errors: Array<{ field: string; error_code: string; message: string }>;
};

class BitlyResponseError extends Error {
  name = 'BitlyResponseError';
  status = 500;
  expose = true;

  static async forResponse(
    baseMessage: string,
    response: Response
  ): Promise<BitlyResponseError> {
    let message = `${baseMessage}: ${response.statusText} (${response.status}).`;

    try {
      const body = (await response.json()) as BitlyJsonError;
      if (body.description) {
        message += `\nBitly error is: ${body.description} (${body.message})`;
      }
    } catch {
      // Nothing is needed here.
    }

    return new BitlyResponseError(message);
  }
}

export async function shortenUrl(longUrl: string): Promise<string> {
  const log = getLogger('logic.shorten_url.shorten_url');
  if (!config.bitlyToken) {
    log.critical(
      'no_access_token',
      'No access token for bitly has been configured!'
    );
    throw new BitlyConfigurationError(
      'No access token for bitly has been configured!'
    );
  }

  const bitlyQueryUrl = 'https://api-ssl.bitly.com/v4/shorten';
  const payload = { long_url: longUrl };

  const response = await fetch(bitlyQueryUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.bitlyToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const baseMessage = `An HTTP error happened while shortening the long url ${longUrl}`;
    throw await BitlyResponseError.forResponse(baseMessage, response);
  }

  const json = (await response.json()) as { link: string };
  return json.link;
}

export async function expandUrl(urlToExpand: string): Promise<string> {
  const log = getLogger('logic.shorten_url.expand_url');
  if (!config.bitlyToken) {
    log.error(
      'no_access_token',
      'No access token for bitly has been configured!'
    );
    throw new BitlyConfigurationError(
      'No access token for bitly has been configured!'
    );
  }

  const bitlyQueryUrl = 'https://api-ssl.bitly.com/v4/expand';
  const payload = {
    bitlink_id: urlToExpand.replace(/^https:\/\//, ''),
  };
  const response = await fetch(bitlyQueryUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.bitlyToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const baseMessage = `An error happened while expanding the shortened url ${urlToExpand}`;
    throw await BitlyResponseError.forResponse(baseMessage, response);
  }

  const json = (await response.json()) as { long_url: string };
  return json.long_url;
}

type UserInfo = {
  default_group_guid: string;
  name: string;
  created: string;
  is_active: boolean;
  modified: string;
  is_sso_user: boolean;
  is_2fa_enabled: boolean;
  login: string;
  emails: Array<{
    is_primary: boolean;
    is_verified: boolean;
    email: string;
  }>;
};

export async function retrieveCurrentUser(): Promise<UserInfo> {
  const log = getLogger('shorten_url.retrieve_current_user');
  if (!config.bitlyToken) {
    log.critical(
      'no_access_token',
      'No access token for bitly has been configured!'
    );
    throw new BitlyConfigurationError(
      'No access token for bitly has been configured!'
    );
  }

  const bitlyQueryUrl = 'https://api-ssl.bitly.com/v4/user';
  const response = await fetch(bitlyQueryUrl, {
    headers: {
      Authorization: `Bearer ${config.bitlyToken}`,
    },
  });

  if (!response.ok) {
    const baseMessage = `An error happened while retrieving information about the user.`;
    throw await BitlyResponseError.forResponse(baseMessage, response);
  }

  const result = (await response.json()) as UserInfo;
  return result;
}
