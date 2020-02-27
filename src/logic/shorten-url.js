/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import fetch, { type Response } from 'node-fetch';

import { config } from '../config';
import { getLogger } from '../log';

class BitlyConfigurationError extends Error {
  name = 'BitlyConfigurationError';
  status = 500;
  expose = true; // The message will be exposed to users
}

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
      const body = await response.json();
      if (body.description) {
        message += `\nBitly error is: ${body.description} (${body.message})`;
      }
    } catch (e) {
      // Nothing is needed here.
    }

    return new BitlyResponseError(message);
  }
}

export async function shortenUrl(longUrl: string): Promise<string> {
  const log = getLogger('shortenUrl');
  if (!config.bitlyToken) {
    log.error('No access token for bitly has been configured!');
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

  const json = await response.json();
  return json.link;
}

export async function expandUrl(urlToExpand: string): Promise<string> {
  const log = getLogger('expandUrl');
  if (!config.bitlyToken) {
    log.error('No access token for bitly has been configured!');
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

  const json = await response.json();
  return json.long_url;
}
