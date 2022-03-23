import log from '../logger';
import { Integration } from '../model/db.model';
import { Product, Sku, SmToken } from '../model/sm.model';
import { addToCurrentTime, getCurrentUnixTime } from '../shared/utils/utils';
import { updateSConnectionDetails } from '../db/db';
import {
  deleteProduct,
  deleteSku,
  getProduct,
  getSku,
  patchSku,
  postLogin,
  postProduct,
  postRefresh,
  postSku,
  putProduct,
} from '../resources/sm.api';
import { ErrorCategory, MiddleError } from '../shared/errors/MiddleError';
/**
 * All SM services
 */
export async function provideSmAccessToken(integration: Integration): Promise<string> {
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

/**
 *
 * @param product
 * @param notification
 * @returns
 */
export async function createProduct(product: Product, integration: Integration): Promise<Product> {
  const accessToken = await provideSmAccessToken(integration);

  return postProduct({ product, accessToken });
}

/**
 *
 * @param productId
 * @param notification
 * @returns
 */
export async function getSmProductById(productId: number, integration: Integration): Promise<Product> {
  const accessToken = await provideSmAccessToken(integration);

  return getProduct({ productId, accessToken });
}

/**
 *
 * @param product
 * @param notification
 * @returns
 */
export async function updateProduct(product: Product, integration: Integration): Promise<Product> {
  const accessToken = await provideSmAccessToken(integration);

  return putProduct({ product, accessToken });
}

/**
 *
 * @param param0
 * @returns
 */
export async function removeSmProduct({
  productId,
  integration,
}: {
  productId: number;
  integration: Integration;
}): Promise<any> {
  const accessToken = await provideSmAccessToken(integration);

  return deleteProduct({ productId, accessToken });
}

export async function createSmSku({
  productId,
  sku,
  integration,
}: {
  productId: number;
  sku: Sku;
  integration: Integration;
}) {
  const accessToken = await provideSmAccessToken(integration);
  return postSku({ productId, sku, accessToken });
}

export async function updateSmSku({ sku, integration }: { sku: Sku; integration: Integration }) {
  const accessToken = await provideSmAccessToken(integration);
  return patchSku({ sku, accessToken });
}

export async function deleteSmSku({ skuId, integration }: { skuId: number; integration: Integration }) {
  const accessToken = await provideSmAccessToken(integration);
  return deleteSku({ skuId, accessToken });
}

export async function getSmSku({ skuId, integration }: { skuId: number; integration: Integration }) {
  const accessToken = await provideSmAccessToken(integration);
  return getSku({ skuId, accessToken });
}
