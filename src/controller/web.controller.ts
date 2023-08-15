import { NextFunction, Request, Response } from 'express';
import log from '../logger';
import { Notification, isNotification } from '../model/tray.model';
import { getConsumerKey, handleNotification } from '../services/tray.service';
import { createIntegration } from '../services/middle.service';

export async function notificationHandler(req: Request, res: Response, next: NextFunction) {
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

export async function initiateIntegrationHandler(req: Request, res: Response, next: NextFunction) {
  // Validate Input
  const storeCodeParam = req.body.storeCode;
  try {
    if (!storeCodeParam) {
      log.error(`Missing integration field`);
      res.sendStatus(400);
      return;
    }

    const integration = await createIntegration({ storeCode: storeCodeParam });
    const consumerKey = await getConsumerKey();
    const responseData = {
      integration,
      consumerKey,
    };

    res.status(200).json({ message: `Integration record has been created for store ${storeCodeParam}`, responseData });
  } catch (err) {
    log.error(`Unable to create Integration for store ${JSON.stringify(storeCodeParam)} with error: ${err}`);
    next(err);
  }
}

export async function trayIntegrationHandler(req: Request, res: Response, next: NextFunction) {
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
