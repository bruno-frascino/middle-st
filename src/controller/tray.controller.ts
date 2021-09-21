import { NextFunction, Request, Response } from 'express';
import log from '../logger';
import { Notification, isNotification } from '../model/tray.model';
import { handleNotification } from '../services/tray.service';

export default async function notificationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate Input
    if (!isNotification(req.body)) {
      log.error(`Invalid notification body ${JSON.stringify(req.body)}`);
      res.sendStatus(400);
      return;
    }
    const notification: Notification = req.body;
    // Save Notification to be processed later
    handleNotification(notification);
    res.sendStatus(200);
  } catch (err) {
    log.error(`Unable to handle notification: ${err}`);
    next(err);
  }
}
