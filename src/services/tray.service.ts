import { Act, Notification, Product, Scope, TrayToken } from '../model/tray.model';
import log from '../logger';
import {
  deleteNotifications,
  getIntegrationById,
  getIntegrationByT,
  getOrderedNotifications,
  getTDetails,
  insertNotification,
  updateTConnectionDetails,
} from '../db/db';
import { Notification as ENotification, Integration } from '../model/db.model';
import { convertStringToUnixTime } from '../utils/utils';
import { manageNotifications } from './middle.service';

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
    throw new Error(`T Seller not found for id: ${seller_id} and app: ${app_code}`);
  }

  // Store Notification
  const id = await insertNotification(notification, integration.id);
  if (!id) {
    throw new Error('Failed to save notification');
  }
  log.info(`Notification saved: ${JSON.stringify(id)}`);
  return id;
}

/**
 *
 * @returns
 */
export async function monitorNotifications() {
  log.info('Monitor checking notifications...');
  // Sort notifications by Seller/scopeName/scopeId/date
  const notifications = await getOrderedNotifications();
  log.info(`Notifications found: ${notifications.length}`);
  if (notifications.length === 0) {
    return;
  }

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

  // Integrate with other system
  // TODO - study how to use an interface here so we can detach this call
  // from the implementation, making flexible if we change subsystem
  manageNotifications(slimNotifications);

  // DELETE unnecessary notifications
  await deleteNotifications(mistakes.concat(multiUpdates).concat(ordersAndCustomers).concat(irrelevant));

  console.log('Notifications size: ', notifications.length);
  console.log('Mistakes size: ', mistakes.length);
  console.log('filtered: ', noMistakes.length);
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

export async function getProduct(notification: ENotification): Promise<Product> {
  const { sellerId, scopeId, appCode, storeUrl } = notification;

  if (!sellerId || !scopeId || !appCode || !storeUrl) {
    const errorMessage = `Invalid getProduct params`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  const access = await provideAccessToken(notification);

  let errorMessage = '';

  const requestInit: RequestInit = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  };

  let response;
  try {
    response = await fetch(`https://${storeUrl}/products/${scopeId}?access_token=${access}`, requestInit);
  } catch (err) {
    log.error(`Failed to fetch /products/${scopeId} Error: ${err}`);
    throw err;
  }

  let jsonResponse;
  try {
    jsonResponse = await response.json();
  } catch (err) {
    log.error(`/products/${scopeId} returned an invalid json response`);
    throw err;
  }

  // "Unauthorized" or another reason
  if (response.status >= 400 || !jsonResponse) {
    const errorReceived = jsonResponse || response.statusText;
    errorMessage = `Unable to retrieve product: ${errorReceived}`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  return Promise.resolve(jsonResponse);
}

export async function provideAccessToken(notification: ENotification) {
  return manageSystemConnection(await getIntegrationById(notification.integrationId));
}

// First access
async function getNewAccessToken(code: string, storeUrl: string): Promise<TrayToken> {
  let errorMessage = '';

  const details = await getTDetails(); // unique for this system
  const body = {
    consumer_key: details.key,
    consumer_secret: details.secret,
    code,
  };

  const requestInit: RequestInit = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };

  let response;
  try {
    response = await fetch(`https://${storeUrl}/auth`, requestInit);
  } catch (err) {
    log.error(`Failed to fetch /auth: ${err}`);
    throw err;
  }

  let jsonResponse;
  try {
    jsonResponse = await response.json();
  } catch (err) {
    log.error(`/auth returned an invalid json response`);
    throw err;
  }

  // "Unauthorized" or another reason
  if (response.status >= 400 || !jsonResponse) {
    const errorReceived = jsonResponse || response.statusText;
    errorMessage = `Unable to retrieve t token: ${errorReceived}`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  return Promise.resolve(jsonResponse);
}

// Refresh token
async function getRefreshedToken(refreshToken: string, storeUrl: string): Promise<TrayToken> {
  let errorMessage = '';

  const requestInit: RequestInit = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  };

  let response;
  try {
    response = await fetch(`https://${storeUrl}/auth?refresh_token=${refreshToken}`, requestInit);
  } catch (err) {
    log.error(`Failed to fetch /auth?refresh_token: ${err}`);
    throw err;
  }

  let jsonResponse;
  try {
    jsonResponse = await response.json();
  } catch (err) {
    log.error(`/auth?refresh_token returned an invalid json response`);
    throw err;
  }

  // "Unauthorized" or another reason
  if (response.status >= 400 || !jsonResponse) {
    const errorReceived = jsonResponse || response.statusText;
    errorMessage = `Unable to refresh t token: ${errorReceived}`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  return Promise.resolve(jsonResponse);
}

export async function manageSystemConnection(integration: Integration) {
  // Required connection details
  const { id, sellerTId, sellerTStoreCode, sellerTStoreUrl, sellerTRefreshToken } = integration;
  if (!sellerTId || !sellerTStoreCode || !sellerTStoreUrl) {
    const errorMessage = `Integration record: ${id} missing required information`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  // valid connection - no action required
  if (hasValidTokens(integration)) {
    return integration.sellerTAccessToken;
  }

  let integrationCopy;
  // Check connection
  if (hasExpiredTokens(integration)) {
    try {
      const trayToken = await getNewAccessToken(sellerTStoreCode, sellerTStoreUrl);
      integrationCopy = copyToken(integration, trayToken);
    } catch (err) {
      const errorMessage = `New access token could not be retrieved for integration: ${id}`;
      log.error(errorMessage);
      throw new Error(errorMessage);
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
      throw new Error(errorMessage);
    }
  }

  if (integrationCopy) {
    // Update record
    await updateTConnectionDetails(integrationCopy);
    return integrationCopy.sellerTAccessToken;
  }

  throw new Error(`Unable to manage connection for integration: ${id}`);
}

// no connection details or
// access and refresh expired
function hasExpiredTokens(integration: Integration) {
  const { sellerTAccessToken, sellerTRefreshToken, sellerTAccessExpirationDate, sellerTRefreshExpirationDate } =
    integration;

  if (!sellerTAccessToken || !sellerTRefreshToken || !sellerTAccessExpirationDate || !sellerTRefreshExpirationDate) {
    return true;
  }

  // Date.now(); milliseconds elapsed since January 1, 1970
  const now = Math.floor(Date.now() / 1000); // Unix time is Seconds since 01-01-70
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

  // Date.now(); milliseconds elapsed since January 1, 1970
  const now = Math.floor(Date.now() / 1000); // Unix time is Seconds since 01-01-70
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

  // Date.now(); milliseconds elapsed since January 1, 1970
  const now = Math.floor(Date.now() / 1000); // Unix time is Seconds since 01-01-70
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
