import { NextFunction, Request, Response } from 'express';
import { Notification, TrayKey } from '../model/tray.model';
import log from '../logger';
import { getIntegration } from '../db/db';

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

  // Identify action

  //
}
