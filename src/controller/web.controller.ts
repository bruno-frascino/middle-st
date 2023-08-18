import { NextFunction, Request, Response } from 'express';
import log from '../logger';
import { Notification, isNotification } from '../model/tray.model';
import { getConsumerKey, handleNotification } from '../services/tray.service';
import { createIntegration, updateIntegrationDetails } from '../services/middle.service';
import { isValidIntegration } from '../model/db.model';

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
      log.error(`Missing store code parameter`);
      res.status(400).json({ message: 'Missing store code parameter' });
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

export async function finaliseIntegrationHandler(req: Request, res: Response, next: NextFunction) {
  // Validate Input
  const requestData = req.body;
  try {
    if (!isValidIntegration(requestData)) {
      log.error(`Missing integration field(s) - payload: ${JSON.stringify(requestData)}`);
      res.status(400).json({ message: 'Missing integration field(s)' });
      return;
    }

    const integration = await updateIntegrationDetails(requestData);
    const responseData = {
      integration,
    };

    res.status(200).json({
      responseData,
    });
  } catch (err) {
    log.error(`Unable to finalise Integration with data ${JSON.stringify(requestData)} with error: ${err}`);
    next(err);
  }
}
