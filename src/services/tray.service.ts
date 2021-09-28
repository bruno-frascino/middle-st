import { NextFunction, Request, Response } from 'express';
import { Act, Notification, Scope } from '../model/tray.model';
import log from '../logger';
import { deleteNotifications, getIntegration, getOrderedNotifications, insertNotification } from '../db/db';
import { Notification as ENotification } from '../model/db.model';

export async function createProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('body ', req.body);
    console.log('params ', req.params);
    console.log('query ', req.query);
  } catch (err) {
    log.error(`Error validating input: ${err}`);
  }
  return next();
}

export async function handleNotification(notification: Notification) {
  log.info(`Handling new notification ${JSON.stringify(notification)}`);

  // Get seller's integration details
  const integration = await getIntegration(notification.seller_id, notification.app_code);
  if (!integration) {
    throw new Error('Seller not found');
  }

  // Store Notification
  const id = await insertNotification(notification);
  if (!id) {
    throw new Error('Failed to save notification');
  }
  log.info(`Notification saved: ${JSON.stringify(id)}`);
  return id;
}

export async function notificationMonitor() {
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
  // product_insert | product_update | product_delete
  // delete > insert > update
  // product_price_insert? | product_price_update | product_price_delete?
  // product_stock_insert? | product_stock_update | product_stock_delete?
  // -------------------------------------------------------------------
  // variant_insert | variant_update | variant_delete
  // variant_price_insert? | variant_price_update | variant_price_delete?
  // variant_stock_insert? | variant_stock_update | variant_stock_delete?

  // FILTER OUT No Affect Update Notifications
  const irrelevants = getIrrelevantUpdates(noOutOfScopeUpdatesMistakes);
  const slimNotifications = noOutOfScopeUpdatesMistakes.filter((notification) => {
    return !irrelevants.includes(notification.id);
  });

  // Update assets in SM

  // DELETE Mistakes, Multi Updates
  await deleteNotifications(mistakes.concat(multiUpdates).concat(ordersAndCustomers));

  console.log('Notifications size: ', notifications.length);
  console.log('Mistakes size: ', mistakes.length);
  console.log('filtered: ', noMistakes.length);
}

// Treat DELETE act - sort genuine delete from mistakes
// TODO - Check if other scopes (_price, _stock) have possibly mistakes too
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

// Treat Multiple Updates act - remove duplicates
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

// Get Order and Customer notifications - out of scope
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
// insert and update act == 1 action (insert)
// delete and update act == 1 action (delete)
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
