import { NextFunction, Request, Response } from 'express';
import { Notification } from '../model/tray.model';
import log from '../logger';
import { getIntegration, insertNotification } from '../db/db';

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
