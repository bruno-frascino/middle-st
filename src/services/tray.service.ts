import config from 'config';
import {
  Act, Brand, Category, Notification, Product, TrayToken,
  Variant
} from '../model/tray.model';
import log from '../logger';
import {
  deleteTBrand,
  deleteTCategory,
  getAllActiveIntegrations,
  getAllTBrands,
  getAllTCategories,
  getOrderedNotifications,
  getTBrandByBrandId,
  getTBrandById,
  getTBrandsByActiveState,
  getTCategoriesByActiveState,
  getTCategoryByCategoryId,
  getTCategoryById,
  insertNotification,
  insertTBrand,
  insertTCategory,
  updateTBrand,
  updateTCategory,
  updateTConnectionDetails,
} from '../db/db';
import { Notification as ENotification, Integration } from '../model/db.model';
import { EVarNames, convertStringToUnixTime, getCurrentUnixTime } from '../shared/utils/utils';
import { getAuth, getBrands, getCategories, getProduct, getVariant, postAuth, putVariant } from '../resources/tray.api';
import { ErrorCategory, MiddleError } from '../shared/errors/MiddleError';
import { getIntegrationDetails } from './middle.service';

export async function getConsumerKey() {
  const consumerKey = config.get(EVarNames.TRAY_KEY);
  return consumerKey;
}

/**
 *
 * @param notification
 * @returns
 */
export async function handleNotification(notification: Notification) {
  log.info(`Handling new notification ${JSON.stringify(notification)}`);

  const { seller_id } = notification;

  // Get seller's integration details
  const integration = await getIntegrationDetails(seller_id);

  log.warn(`Integration Found: ${JSON.stringify(integration)}`);

  // Store Notification
  const recordKey = await insertNotification(notification, integration.id);
  if (!recordKey) {
    throw new MiddleError('Failed to save notification', ErrorCategory.TECH);
  }
  log.info(`Notification saved: ${JSON.stringify(recordKey.id)}`);
  return recordKey.id;
}

export async function getAllNotifications(): Promise<ENotification[]> {
  // Sort notifications by Seller/scopeName/scopeId/date
  return getOrderedNotifications();
}

export function getSlimNotifications(notifications: ENotification[]) {
  // FILTER OUT Mistake Notifications
  const mistakes = getMistakes(notifications);
  const noMistakes = notifications.filter((notification) => {
    return !mistakes.includes(notification.id);
  });

  // FILTER OUT Multi Updates Notifications
  const multiUpdates = flatUpdates(notifications);
  const noMultiMistakes = noMistakes.filter((notification) => {
    return !multiUpdates.includes(notification.id);
  });

  // TODO - to remove as there is no push for those out of scope
  // // FILTER OUT Out of Scope Notifications
  // const ordersAndCustomers = getOrdersAndCustomers(notifications);
  // const noOutOfScopeUpdatesMistakes = noMultiMistakes.filter((notification) => {
  //   return !ordersAndCustomers.includes(notification.id);
  // });

  // Translate scope/id/act to Tray requests
  // delete > insert > update
  // product_insert | product_update | product_delete
  // product_price_insert? | product_price_update | product_price_delete?
  // product_stock_insert? | product_stock_update | product_stock_delete?
  // -------------------------------------------------------------------
  // delete > insert > update
  // variant_insert | variant_update | variant_delete
  // variant_price_insert? | variant_price_update | variant_price_delete?
  // variant_stock_insert? | variant_stock_update | variant_stock_delete?

  // FILTER OUT No Affect Update Notifications
  const irrelevant = getIrrelevantUpdates(noMultiMistakes);
  const slimNotifications = noMultiMistakes.filter((notification) => {
    return !irrelevant.includes(notification.id);
  });

  // TODO - Review this logic. Suggestion to keep a table with "unused" notifications
  // DELETE unnecessary notifications
  const totalUnused = mistakes.concat(multiUpdates).concat(irrelevant);
  // await deleteNotifications(mistakes.concat(multiUpdates).concat(ordersAndCustomers).concat(irrelevant));

  log.info(`Notifications size: ${notifications.length}`);
  log.info(`Mistakes size: ${totalUnused.length}`);
  log.info(`Slim size:: ${slimNotifications.length}`);

  return slimNotifications;
}

/**
 * Treat DELETE act - sort genuine delete from mistakes
 * A mistake is when there is insert or update with a delete
 * TODO - Check if other scopes (_price, _stock) have possibly mistakes too
 * @param notifications
 * @returns
 */
export function getMistakes(notifications: ENotification[]) {
  const mistakes: ENotification[] = [];
  let upserts: ENotification[] = [];

  notifications.forEach((notification, index) => {
    // Different scope or seller start check again
    if (
      index > 0 &&
      (notification.sellerId !== notifications[index - 1].sellerId ||
        notification.scopeId !== notifications[index - 1].scopeId)
    ) {
      upserts = [];
    }
    if (upserts.some((upsert) => upsert.scopeName === Act.INSERT) && notification.act === Act.DELETE) {
      mistakes.push(...upserts);
      mistakes.push(notification);
    }
    if (notification.act === Act.INSERT || notification.act === Act.UPDATE) {
      upserts.push(notification);
    }
  });

  mistakes.forEach((mistake) => {
    log.info(`Mistake Notifications to be ignored and removed: ${JSON.stringify(mistake)}`);
  });

  // array of ids
  return mistakes.map((notification) => {
    return notification.id;
  });
}

/**
 * Treat Multiple Updates act - remove duplicates
 * @param notifications
 * @returns
 */
export function flatUpdates(notifications: ENotification[]) {
  const duplicates: ENotification[] = [];
  let updates: ENotification[] = [];

  notifications.forEach((notification, index) => {
    // Different scope start check again
    if (
      index > 0 &&
      (notification.sellerId !== notifications[index - 1].sellerId ||
        notification.scopeId !== notifications[index - 1].scopeId)
    ) {
      updates = [];
    }
    if (updates.length > 0 && notification.act === Act.UPDATE) {
      duplicates.push(notification);
    }
    if (notification.act === Act.UPDATE) {
      updates.push(notification);
    }
  });

  duplicates.forEach((duplicate) => {
    log.info(`Multi-Updates Notifications to be ignored and removed: ${JSON.stringify(duplicate)}`);
  });

  // array of ids
  return duplicates.map((notification) => {
    return notification.id;
  });
}

// TODO - remove it as there is no push notification for out of scope actions
// /**
//  * Get Order and Customer notifications - out of scope
//  * @param notifications
//  * @returns
//  */
// export function getOrdersAndCustomers(notifications: ENotification[]) {
//   const ordersAndCustomers = notifications.filter(
//     (notification) => notification.scopeName === Scope.ORDER || notification.scopeName === Scope.CUSTOMER,
//   );

//   ordersAndCustomers.forEach((notification) => {
//     log.info(`Out of Scope notifications to be ignored and removed: ${JSON.stringify(notification)}`);
//   });

//   // array of ids
//   return ordersAndCustomers.map((notification) => {
//     return notification.id;
//   });
// }

// Get Updates that doesn't make an effect
// insert and update == 1 action (insert)
// delete and update == 1 action (delete)
export function getIrrelevantUpdates(notifications: ENotification[]) {
  const irrelevants: ENotification[] = [];
  let updates: ENotification[] = [];

  notifications.forEach((notification, index) => {
    // Different scope start check again
    if (
      index > 0 &&
      (notification.sellerId !== notifications[index - 1].sellerId ||
        notification.scopeId !== notifications[index - 1].scopeId)
    ) {
      updates = [];
    }
    if (updates.length > 0 && (notification.act === Act.INSERT || notification.act === Act.DELETE)) {
      irrelevants.push(...updates);
    }
    if (notification.act === Act.UPDATE) {
      updates.push(notification);
    }
  });

  irrelevants.forEach((irrelevant) => {
    log.info(`Updates with not effect Notifications to be ignored and removed: ${JSON.stringify(irrelevant)}`);
  });

  // array of ids
  return irrelevants.map((notification) => {
    return notification.id;
  });
}

export async function updateTrayVariant(variant: Variant, integration: Integration): Promise<Variant> {
  const accessToken = await provideTrayAccessToken(integration);
  return putVariant({ variant, accessToken, storePath: integration.sellerTStorePath || '' });
}

export async function getTrayProduct(productId: number, integration: Integration): Promise<Product> {
  const accessToken = await provideTrayAccessToken(integration);
  return getProduct({ storePath: integration.sellerTStorePath || '', productId, accessToken });
}

export async function getTrayVariant(variantId: number, integration: Integration): Promise<Variant> {
  const accessToken = await provideTrayAccessToken(integration);
  return getVariant({ storePath: integration.sellerTStorePath || '', variantId, accessToken });
}

export async function getFreshTrayBrands() {
  const integrations = await getAllActiveIntegrations();
  if (integrations && integrations.length > 0) {
    // TODO check - any integration, any seller brings all the brands?
    const accessToken = await provideTrayAccessToken(integrations[0]);
    const brandResponse = await getBrands({ accessToken, storePath: integrations[0].sellerTStorePath || '' });
    log.info(`Fetched fresh Tray Brands: ${JSON.stringify(brandResponse)}`);
    return brandResponse ? brandResponse.Brands.map((brandWrapper) => brandWrapper.Brand) : [];
  }
  return [];
}

export async function getFreshTrayCategories() {
  const integrations = await getAllActiveIntegrations();
  if (integrations && integrations.length > 0) {
    // TODO check - any integration, any seller brings all the categories?
    const accessToken = await provideTrayAccessToken(integrations[0]);
    const categoriesResponse = await getCategories({ accessToken, storePath: integrations[0].sellerTStorePath || '' });
    log.info(`Fetched fresh Tray categories: ${JSON.stringify(categoriesResponse)}`);
    return categoriesResponse ? categoriesResponse.Categories.map((categoryWrapper) => categoryWrapper.Category) : [];
  }
  return [];
}

export async function getAllStoredTrayBrands() {
  return getAllTBrands();
}

export async function getActiveStoredTrayBrands() {
  return getTBrandsByActiveState({ active: true });
}

export async function getAllStoredTrayCategories() {
  return getAllTCategories();
}

export async function getActiveStoredTrayCategories() {
  return getTCategoriesByActiveState({ active: true });
}

export async function getTrayBrandSyncDetails() {
  const [freshTBrands, storedTBrands]
    = await Promise.all([
      getFreshTrayBrands(),
      getAllStoredTrayBrands()
    ]);

  return {
    apiTrayBrands: freshTBrands,
    dbTrayBrands: storedTBrands,
  };
}

export async function getTrayCategorySyncDetails() {
  const [freshTCategories, storedTCategories]
    = await Promise.all([
      getFreshTrayCategories(),
      getAllStoredTrayCategories()
    ]);

  return {
    apiTrayCategories: freshTCategories,
    dbTrayCategories: storedTCategories,
  };
}

export async function insertTrayBrand(trayBrand: Brand) {
  const newBrandRecordKey = await insertTBrand({ tBrand: trayBrand });
  return getTrayBrandById(newBrandRecordKey.id);
}

export async function insertTrayCategory(trayCategory: Category) {
  const newRecordKey = await insertTCategory({ tCategory: trayCategory });
  return getTrayCategoryById(newRecordKey.id);
}

export async function deleteTrayBrand(id: number) {
  const result = await deleteTBrand(id);
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No tray brand deleted for internal id ${id}`, ErrorCategory.BUS);
  }
  log.info(`Deleted tray brand with id: ${id} - ${result}`);
  return result;
}

export async function deleteTrayCategory(id: number) {
  const result = await deleteTCategory(id);
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No tray category deleted for internal id ${id}`, ErrorCategory.BUS);
  }
  log.info(`Deleted tray category with id: ${id} - ${result}`);
  return result;
}

export async function getTrayBrandById(id: number) {
  const brands = await getTBrandById(id);
  if (brands && Array.isArray(brands) && brands.length === 1) {
    return brands[0];
  }
  return undefined;
}

export async function getTrayCategoryById(id: number) {
  const categories = await getTCategoryById(id);
  if (categories && Array.isArray(categories) && categories.length === 1) {
    return categories[0];
  }
  return undefined;
}

export async function getTrayBrandByBrandId(id: number) {
  const brands = await getTBrandByBrandId(id);
  if (brands && Array.isArray(brands) && brands.length === 1) {
    return brands[0];
  }
  return undefined;
}


export async function updateTrayBrand(trayBrand: Brand) {
  const result = await updateTBrand({ tBrand: trayBrand });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No brand updated for internal id ${trayBrand.id}`, ErrorCategory.BUS);
  }
  return getTrayBrandByBrandId(trayBrand.id);
}

export async function updateTrayCategory(trayCategory: Category) {
  const result = await updateTCategory({ tCategory: trayCategory });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No category updated for internal id ${trayCategory.id}`, ErrorCategory.BUS);
  }
  return getTrayCategoryByCategoryId(parseInt(trayCategory.id, 10));
}

export async function getTrayCategoryByCategoryId(id: number) {
  const categories = await getTCategoryByCategoryId(id);
  if (categories && Array.isArray(categories) && categories.length === 1) {
    return categories[0];
  }
  return undefined;
}

// First access
async function getNewAccessToken(accessCode: string, storePath: string): Promise<TrayToken> {
  const key: string = config.get(EVarNames.TRAY_KEY);
  const secret: string = config.get(EVarNames.TRAY_SECRET);
  log.warn(`New T access token`);
  return postAuth({ storePath, consumer_key: key, consumer_secret: secret, accessCode });
}

// Refresh token
async function getRefreshedToken(refreshToken: string, storePath: string): Promise<TrayToken> {
  return getAuth({ storePath, refreshToken });
}

export async function provideTrayAccessToken(integration: Integration): Promise<string> {
  // Required connection details
  const { id, sellerTStoreAccessCode, sellerTStorePath, sellerTRefreshToken, sellerTAccessToken } = integration;
  if (!sellerTStoreAccessCode || !sellerTStorePath) {
    const errorMessage = `Integration record: ${id} missing required information`;
    log.error(errorMessage);
    throw new MiddleError(errorMessage, ErrorCategory.BUS);
  }

  // // valid connection - no action required
  if (integration && sellerTAccessToken && hasValidTokens(integration)) {
    log.warn('T existing valid access token');
    return sellerTAccessToken;
  }

  let integrationCopy;
  // Check connection
  if (hasExpiredTokens(integration)) {
    log.warn('T has expired tokens');
    try {
      const trayToken = await getNewAccessToken(sellerTStoreAccessCode, sellerTStorePath);
      log.warn(`New Access Tray Token: ${trayToken}`);
      integrationCopy = copyToken(integration, trayToken);
    } catch (err) {
      throw new MiddleError(
        `Tray new access token could not be retrieved for integration: ${id}:${integration.sellerName} with error: ${err}`,
        ErrorCategory.BUS,
      );
    }
  }

  // access connection expired but not refresh
  if (hasOnlyAccessTokenExpired(integration)) {
    log.warn('T has only access token expired');
    try {
      if (sellerTRefreshToken) {
        const trayToken = await getRefreshedToken(sellerTRefreshToken, sellerTStorePath);
        integrationCopy = copyToken(integration, trayToken);
      }
    } catch (err) {
      const errorMessage = `Refreshed token could not be retrieved for integration: ${id} with error: ${err}`;
      log.error(errorMessage);
      throw new MiddleError(errorMessage, ErrorCategory.BUS);
    }
  }

  if (integrationCopy && integrationCopy.sellerTAccessToken) {
    // Update record
    await updateTConnectionDetails(integrationCopy);
    return integrationCopy.sellerTAccessToken;
  }

  throw new MiddleError(`Unable to manage connection for integration: ${id}`, ErrorCategory.TECH);
}

// no connection details or
// access and refresh expired
function hasExpiredTokens(integration: Integration) {
  const { sellerTAccessToken, sellerTRefreshToken, sellerTAccessExpirationDate, sellerTRefreshExpirationDate } =
    integration;

  if (!sellerTAccessToken || !sellerTRefreshToken || !sellerTAccessExpirationDate || !sellerTRefreshExpirationDate) {
    return true;
  }

  const now = getCurrentUnixTime();
  return (
    sellerTAccessExpirationDate &&
    sellerTAccessExpirationDate < now &&
    sellerTRefreshExpirationDate &&
    sellerTRefreshExpirationDate < now
  );
  // return true;
}

function hasOnlyAccessTokenExpired(integration: Integration) {
  const { sellerTAccessToken, sellerTRefreshToken, sellerTAccessExpirationDate, sellerTRefreshExpirationDate } =
    integration;

  if (!sellerTAccessToken || !sellerTRefreshToken || !sellerTAccessExpirationDate || !sellerTRefreshExpirationDate) {
    return false;
  }

  const now = getCurrentUnixTime();
  return (
    sellerTAccessExpirationDate &&
    sellerTAccessExpirationDate < now &&
    sellerTRefreshExpirationDate &&
    sellerTRefreshExpirationDate >= now
  );
}

function hasValidTokens(integration: Integration) {
  const { sellerTAccessToken, sellerTRefreshToken, sellerTAccessExpirationDate, sellerTRefreshExpirationDate } =
    integration;

  if (!sellerTAccessToken || !sellerTRefreshToken || !sellerTAccessExpirationDate || !sellerTRefreshExpirationDate) {
    return false;
  }

  const now = getCurrentUnixTime();
  // log.warn('-- Got here --');
  log.warn(`-- now ${now}`);
  log.warn(`-- sellerTAccessExpirationDate ${sellerTAccessExpirationDate}`);
  log.warn(`-- sellerTRefreshExpirationDate ${sellerTRefreshExpirationDate}`);

  return (
    sellerTAccessExpirationDate &&
    sellerTAccessExpirationDate >= now &&
    sellerTRefreshExpirationDate &&
    sellerTRefreshExpirationDate >= now
  );
}

function copyToken(integration: Integration, trayToken: TrayToken) {
  const integrationCopy = { ...integration };
  integrationCopy.sellerTAccessToken = trayToken.access_token;
  integrationCopy.sellerTRefreshToken = trayToken.refresh_token;
  try {
    integrationCopy.sellerTAccessExpirationDate = convertStringToUnixTime(trayToken.date_expiration_access_token);
    integrationCopy.sellerTRefreshExpirationDate = convertStringToUnixTime(trayToken.date_expiration_refresh_token);
  } catch (error) {
    log.error(`Error parsing token expiration date: ${error}`);
    // clean existing dates
    integrationCopy.sellerTAccessExpirationDate = undefined;
    integrationCopy.sellerTRefreshExpirationDate = undefined;
  }

  return integrationCopy;
}
