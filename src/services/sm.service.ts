import config from 'config';
import log from '../logger';
import { SmToken } from '../model/sm.model';

async function getAccessToken({ key, secret }: { key: string; secret: string }): Promise<SmToken> {
  let errorMessage = '';

  if (!key || !secret) {
    errorMessage = 'Invalid getToken parameters';
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  const credentials = {
    key,
    secret,
  };

  const baseUrl: string = config.get('smBaseUrl');

  const requestInit: RequestInit = {
    method: 'POST',
    body: JSON.stringify(credentials),
    headers: { 'Content-Type': 'application/json' },
  };

  let response;
  try {
    response = await fetch(`${baseUrl}/api/v1/seller/login`, requestInit);
  } catch (err) {
    log.error(`Failed to fetch /seller/login: ${err}`);
    throw err;
  }

  let jsonResponse;
  try {
    jsonResponse = await response.json();
  } catch (err) {
    log.error(`/seller/login returned an invalid json response`);
    throw err;
  }

  // "Unauthorized" or another reason
  if (response.status >= 400 || !jsonResponse) {
    const errorReceived = jsonResponse || response.statusText;
    errorMessage = `Unable to retrieve token: ${errorReceived}`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }
  // {
  //   "error": "Unauthorized"
  // }

  // if(response.status === 200)
  // {
  //   "access_token": "PSzRS8eE0mRIKN3jRKIxA8ZNpU",
  //   "token_type": "bearer",
  //   "expires_in": 3600
  // }

  return Promise.resolve({
    accessToken: jsonResponse.access_token,
    expires: jsonResponse.expires_in,
  });
}
