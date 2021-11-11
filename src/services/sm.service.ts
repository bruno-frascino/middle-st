import config from 'config';
import log from '../logger';
import { Integration, Notification } from '../model/db.model';
import { Product, SmToken } from '../model/sm.model';
import { addToCurrentTime } from '../utils/utils';
import { getIntegrationById, updateSConnectionDetails } from '../db/db';
/**
 * All SM services
 */
export async function monitorChanges() {
  // TODO monitorChanges
}

export async function manageSystemConnection(integration: Integration) {
  // TODO - manageSystemConnection
  // Required connection details
  const { id, sellerSId, sellerSKey, sellerSSecret, sellerSAccessToken, sellerSAccessExpirationDate } = integration;
  if (!sellerSKey || !sellerSSecret || !sellerSId) {
    const errorMessage = `Integration record: ${id} missing required information`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  let integrationCopy;
  let accessToken;

  // valid connection - no action required
  if (hasValidToken(integration)) {
    return sellerSAccessToken;
  }

  // First connection has no access token
  if (!sellerSAccessToken) {
    try {
      accessToken = await getNewAccessToken({ key: sellerSKey, secret: sellerSSecret });
    } catch (err) {
      const errorMessage = `New access token could not be retrieved for integration: ${id}`;
      log.error(errorMessage);
      throw new Error(errorMessage);
    }
    // refresh token expired
  } else {
    try {
      accessToken = await getRefreshedToken(sellerSAccessToken);
    } catch (err) {
      const errorMessage = `Refreshed token could not be retrieved for integration: ${id}`;
      log.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Update record
  // eslint-disable-next-line prefer-const
  integrationCopy = copyToken(integration, accessToken);
  await updateSConnectionDetails(integrationCopy);

  return accessToken.accessToken;
}

function copyToken(integration: Integration, accessToken: SmToken) {
  const integrationCopy = { ...integration };
  integrationCopy.sellerSAccessToken = accessToken.accessToken;
  integrationCopy.sellerSAccessExpirationDate = addToCurrentTime(accessToken.expiresIn); // Unix time
  return integrationCopy;
}

/**
 * Access can get renewed with previous token
 *
 * @param previousAccessToken
 * @returns
 */
async function getRefreshedToken(previousAccessToken: string) {
  let errorMessage = '';

  if (!previousAccessToken) {
    errorMessage = 'Invalid SM getRefreshedToken parameters';
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  const baseUrl: string = config.get('sBaseUrl');

  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${previousAccessToken}`,
    },
  };

  let response;
  try {
    response = await fetch(`${baseUrl}/api/v1/seller/refresh`, requestInit);
  } catch (err) {
    log.error(`Failed to fetch SM path /seller/refresh: ${err}`);
    throw err;
  }

  let jsonResponse;
  try {
    jsonResponse = await response.json();
  } catch (err) {
    log.error(`/seller/refresh returned an invalid json response`);
    throw err;
  }

  // "Unauthorized" or another reason
  if (response.status >= 400 || !jsonResponse) {
    const errorReceived = jsonResponse || response.statusText;
    errorMessage = `Unable to refresh SM token: ${errorReceived}`;
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
    expiresIn: jsonResponse.expires_in,
    tokenType: jsonResponse.token_type,
  });
}

/**
 * SM System has access_token expiration date in seconds
 * and no expiration for refreshing it.
 * Refresh can be done at any moment since access_token hasn't expired yet
 * then a new access_token will be provided
 * @param integration
 * @returns
 */
function hasValidToken(integration: Integration) {
  const { sellerSAccessToken, sellerSAccessExpirationDate } = integration;

  if (!sellerSAccessToken || !sellerSAccessExpirationDate) {
    return false;
  }

  // Date.now(); milliseconds elapsed since January 1, 1970
  const now = Math.floor(Date.now() / 1000); // Unix time is Seconds since 01-01-70
  return sellerSAccessExpirationDate && sellerSAccessExpirationDate >= now;
}

async function getNewAccessToken({ key, secret }: { key: string; secret: string }): Promise<SmToken> {
  let errorMessage = '';

  if (!key || !secret) {
    errorMessage = 'Invalid SM getToken parameters';
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  const credentials = {
    key,
    secret,
  };

  const baseUrl: string = config.get('sBaseUrl');

  const requestInit: RequestInit = {
    method: 'POST',
    body: JSON.stringify(credentials),
    headers: { 'Content-Type': 'application/json' },
  };

  let response;
  try {
    response = await fetch(`${baseUrl}/api/v1/seller/login`, requestInit);
  } catch (err) {
    log.error(`Failed to fetch SM path /seller/login: ${err}`);
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
    errorMessage = `Unable to retrieve SM token: ${errorReceived}`;
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
    expiresIn: jsonResponse.expires_in,
    tokenType: jsonResponse.token_type,
  });
}

export async function provideAccessToken(notification: Notification) {
  return manageSystemConnection(await getIntegrationById(notification.integrationId));
}

export async function createProduct(product: Product, notification: Notification) {
  const { sellerId, scopeId, appCode, storeUrl } = notification;

  if (!sellerId || !scopeId || !appCode || !storeUrl) {
    const errorMessage = `Invalid getProduct params`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  const accessToken = await provideAccessToken(notification);

  // TODO - API CALL
  let errorMessage = '';
  const baseUrl: string = config.get('sBaseUrl');
  const requestInit: RequestInit = {
    method: 'POST',
    body: JSON.stringify(product),
    headers: { 'Content-Type': 'application/json', Authentication: accessToken },
  };
  let response;
  try {
    response = await fetch(`${baseUrl}/api/v1/products`, requestInit);
  } catch (err) {
    log.error(`Failed to POST SM path /products: ${err}`);
    throw err;
  }
  let jsonResponse;
  try {
    jsonResponse = await response.json();
  } catch (err) {
    log.error(`Create SM returned an invalid json response`);
    throw err;
  }
  // "Unauthorized" or another reason
  if (response.status >= 400 || !jsonResponse) {
    const errorReceived = jsonResponse || response.statusText;
    errorMessage = `Unable to create SM product: ${errorReceived}`;
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
