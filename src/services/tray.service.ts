import config from 'config';
import { Act, Notification, Product, Scope, TrayToken, Variant } from '../model/tray.model';
import log from '../logger';
import { getIntegrationByT, getOrderedNotifications, insertNotification, updateTConnectionDetails } from '../db/db';
import { Notification as ENotification, Integration } from '../model/db.model';
import { EVarNames, convertStringToUnixTime, getCurrentUnixTime } from '../shared/utils/utils';
import { getAuth, getProduct, getVariant, postAuth, putVariant } from '../resources/tray.api';
import { ErrorCategory, MiddleError } from '../shared/errors/MiddleError';

/**
 *
 * @param notification
 * @returns
 */
export async function handleNotification(notification: Notification) {
  log.info(`Handling new notification ${JSON.stringify(notification)}`);

  const { seller_id, app_code } = notification;

  // Get seller's integration details
  const integration = await getIntegrationByT(seller_id, app_code);
  if (!integration) {
    throw new MiddleError(`T Seller not found for id: ${seller_id} and app: ${app_code}`, ErrorCategory.BUS);
  }

  // Store Notification
  const id = await insertNotification(notification, integration.id);
  if (!id) {
    throw new MiddleError('Failed to save notification', ErrorCategory.TECH);
  }
  log.info(`Notification saved: ${JSON.stringify(id)}`);
  return id;
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

  // FILTER OUT Out of Scope Notifications
  const ordersAndCustomers = getOrdersAndCustomers(notifications);
  const noOutOfScopeUpdatesMistakes = noMultiMistakes.filter((notification) => {
    return !ordersAndCustomers.includes(notification.id);
  });

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
  const irrelevant = getIrrelevantUpdates(noOutOfScopeUpdatesMistakes);
  const slimNotifications = noOutOfScopeUpdatesMistakes.filter((notification) => {
    return !irrelevant.includes(notification.id);
  });

  // TODO - Review this logic. Suggestion to keep a table with "unused" notifications
  // DELETE unnecessary notifications
  const totalUnused = mistakes.concat(multiUpdates).concat(ordersAndCustomers).concat(irrelevant);
  // await deleteNotifications(mistakes.concat(multiUpdates).concat(ordersAndCustomers).concat(irrelevant));

  log.info(`Notifications size: ${notifications.length}`);
  log.info(`Mistakes size: ${totalUnused.length}`);
  log.info(`Slim sie:: ${slimNotifications.length}`);

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

/**
 * Get Order and Customer notifications - out of scope
 * @param notifications
 * @returns
 */
export function getOrdersAndCustomers(notifications: ENotification[]) {
  const ordersAndCustomers = notifications.filter(
    (notification) => notification.scopeName === Scope.ORDER || notification.scopeName === Scope.CUSTOMER,
  );

  ordersAndCustomers.forEach((notification) => {
    log.info(`Out of Scope notifications to be ignored and removed: ${JSON.stringify(notification)}`);
  });

  // array of ids
  return ordersAndCustomers.map((notification) => {
    return notification.id;
  });
}

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

  return putVariant({ variant, accessToken, domain: integration.sellerTStoreUrl || '' });
}

export async function getTrayProduct(productId: number, integration: Integration): Promise<Product> {
  const accessToken = await provideTrayAccessToken(integration);

  return getProduct({ domain: integration.sellerTStoreUrl || '', productId, accessToken });
}

export async function getTrayVariant(variantId: number, integration: Integration): Promise<Variant> {
  const accessToken = await provideTrayAccessToken(integration);

  return getVariant({ domain: integration.sellerTStoreUrl ?? '', variantId, accessToken });
}

// First access
async function getNewAccessToken(code: string, storeUrl: string): Promise<TrayToken> {
  const key: string = config.get(EVarNames.TRAY_KEY);
  const secret: string = config.get(EVarNames.TRAY_SECRET);

  return postAuth({ domain: storeUrl, consumer_key: key, consumer_secret: secret, code });
}

// Refresh token
async function getRefreshedToken(refreshToken: string, storeUrl: string): Promise<TrayToken> {
  return getAuth({ domain: storeUrl, refreshToken });
}

export async function provideTrayAccessToken(integration: Integration): Promise<string> {
  // Required connection details
  const { id, sellerTStoreCode, sellerTStoreUrl, sellerTRefreshToken, sellerTAccessToken } = integration;
  if (!sellerTStoreCode || !sellerTStoreUrl) {
    const errorMessage = `Integration record: ${id} missing required information`;
    log.error(errorMessage);
    throw new MiddleError(errorMessage, ErrorCategory.BUS);
  }

  // valid connection - no action required
  if (integration && sellerTAccessToken && hasValidTokens(integration)) {
    return sellerTAccessToken;
  }

  let integrationCopy;
  // Check connection
  if (hasExpiredTokens(integration)) {
    try {
      const trayToken = await getNewAccessToken(sellerTStoreCode, sellerTStoreUrl);
      integrationCopy = copyToken(integration, trayToken);
    } catch (err) {
      throw new MiddleError(
        `Tray new access token could not be retrieved for integration: ${id}:${integration.sellerName}`,
        ErrorCategory.BUS,
      );
    }
  }

  // access connection expired but not refresh
  if (hasOnlyAccessTokenExpired(integration)) {
    try {
      if (sellerTRefreshToken) {
        const trayToken = await getRefreshedToken(sellerTRefreshToken, sellerTStoreUrl);
        integrationCopy = copyToken(integration, trayToken);
      }
    } catch (err) {
      const errorMessage = `Refreshed token could not be retrieved for integration: ${id}`;
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
  integrationCopy.sellerTAccessExpirationDate = convertStringToUnixTime(trayToken.date_expiration_access_token);
  integrationCopy.sellerTRefreshExpirationDate = convertStringToUnixTime(trayToken.date_expiration_refresh_token);
  return integrationCopy;
}
