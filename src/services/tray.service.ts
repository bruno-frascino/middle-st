import { NextFunction, Request, Response } from 'express';
import { Act, Notification } from '../model/tray.model';
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
  // Order notifications by Seller/scopeName/scopeId/date
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
  // DELETE THEM
  await deleteNotifications(mistakes);
  console.log('Notifications size: ', notifications.length);
  console.log('Mistakes size: ', mistakes.length);
  console.log('filtered: ', noMistakes.length);

  // Translate scope/id/act to Tray requests
  // Sort groups by sellerId/scopeName/scopeId/createDate
  // product/insert|update|delete

  // Update assets in SM
}

// Treat DELETE act - sort genuine delete from mistakes
export function getMistakes(notifications: ENotification[]) {
  const mistakes: ENotification[] = [];
  let upserts: ENotification[] = [];

  notifications.forEach((notification, index) => {
    // Different scope start check again
    if (index > 0 && notification.scopeId !== notifications[index - 1].scopeId) {
      upserts = [];
    }
    if (upserts.length > 0 && notification.act === Act.DELETE) {
      mistakes.push(...upserts);
      mistakes.push(notification);
    }
    if (notification.act === Act.INSERT || notification.act === Act.UPDATE) {
      upserts.push(notification);
    }
  });

  mistakes.forEach((mistake) => {
    log.info(`Notification to be ignored and removed: ${JSON.stringify(mistake)}`);
  });

  // array of ids
  return mistakes.map((notification) => {
    return notification.id;
  });
}
