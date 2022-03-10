import log from '../logger';
import { Integration, Notification } from '../model/db.model';
import { Product, Sku, SmToken } from '../model/sm.model';
import { addToCurrentTime, getCurrentUnixTime } from '../shared/utils/utils';
import { getIntegrationById, updateSConnectionDetails } from '../db/db';
import {
  deleteProduct,
  deleteSku,
  getProduct,
  patchSku,
  postLogin,
  postProduct,
  postRefresh,
  postSku,
  putProduct,
} from './sm.api';
import { ErrorCategory, MiddleError } from '../shared/errors/MiddleError';
/**
 * All SM services
 */
export async function monitorChanges() {
  // TODO monitorChanges
  // BASED ON INTEGRATIONS
}

export async function warmUpSystemConnection(integration: Integration): Promise<string> {
  // TODO - manageSystemConnection
  // Required connection details
  const { id, sellerSId, sellerSKey, sellerSSecret, sellerSAccessToken } = integration;
  if (!sellerSKey || !sellerSSecret || !sellerSId) {
    const errorMessage = `Integration record: ${id} missing required information`;
    log.error(errorMessage);
    throw new MiddleError(errorMessage, ErrorCategory.BUS);
  }

  let integrationCopy;
  let accessToken;

  // valid connection - no action required
  if (sellerSAccessToken && hasValidToken(integration)) {
    return sellerSAccessToken;
  }

  // First connection has no access token
  if (!sellerSAccessToken) {
    accessToken = await getNewAccessToken({ key: sellerSKey, secret: sellerSSecret });
    // refresh token expired
  } else {
    accessToken = await getRefreshedToken(sellerSAccessToken);
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
  return postRefresh(previousAccessToken);
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

  const now = getCurrentUnixTime();
  return sellerSAccessExpirationDate && sellerSAccessExpirationDate >= now;
}

async function getNewAccessToken({ key, secret }: { key: string; secret: string }): Promise<SmToken> {
  return postLogin({ key, secret });
}

export async function provideAccessToken(notification: Notification): Promise<string> {
  return warmUpSystemConnection(await getIntegrationById(notification.integrationId));
}

/**
 *
 * @param product
 * @param notification
 * @returns
 */
export async function createProduct(product: Product, notification: Notification): Promise<Product> {
  const accessToken = await provideAccessToken(notification);

  return postProduct({ product, accessToken });
}

/**
 *
 * @param productId
 * @param notification
 * @returns
 */
export async function getSmProductById(productId: number, notification: Notification): Promise<Product> {
  const accessToken = await provideAccessToken(notification);

  return getProduct({ productId, accessToken });
}

/**
 *
 * @param product
 * @param notification
 * @returns
 */
export async function updateProduct(product: Product, notification: Notification): Promise<Product> {
  const accessToken = await provideAccessToken(notification);

  return putProduct({ product, accessToken });
}

/**
 *
 * @param param0
 * @returns
 */
export async function removeProduct({
  productId,
  notification,
}: {
  productId: number;
  notification: Notification;
}): Promise<any> {
  const accessToken = await provideAccessToken(notification);

  return deleteProduct({ productId, accessToken });
}

export async function createSmSku({
  productId,
  sku,
  notification,
}: {
  productId: number;
  sku: Sku;
  notification: Notification;
}) {
  const accessToken = await provideAccessToken(notification);
  return postSku({ productId, sku, accessToken });
}

export async function updateSmSku({ sku, notification }: { sku: Sku; notification: Notification }) {
  const accessToken = await provideAccessToken(notification);
  return patchSku({ sku, accessToken });
}

export async function deleteSmSku({ skuId, notification }: { skuId: number; notification: Notification }) {
  const accessToken = await provideAccessToken(notification);
  return deleteSku({ skuId, accessToken });
}
