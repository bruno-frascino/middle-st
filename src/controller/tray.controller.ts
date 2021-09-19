import { NextFunction, Request, Response } from 'express';
import log from '../logger';
import { Notification, isNotification } from '../model/tray.model';
import { handleNotification } from '../services/tray.service';

export default async function notificationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('body ', req.body);
    console.log('params ', req.params);
    console.log('query ', req.query);

    // STEP 1 - Validate Input
    if (!isNotification(req.body)) {
      log.error(`Invalid notification body ${JSON.stringify(req.body)}`);
      res.sendStatus(500);
      return;
    }
    const notification: Notification = req.body;
    // STEP 2 - Translate Notification to Action
    await handleNotification(notification);

    // STEP 3
    // Translate Tray Product to SM Product
    // STEP 4
    // Create Product in SM
  } catch (err) {
    log.error(`Unable to handle notification: ${err}`);
    next(err);
  }
  res.sendStatus(200);
}
