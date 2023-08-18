import { Express, Request, Response } from 'express';
import {
  finaliseIntegrationHandler,
  initiateIntegrationHandler,
  notificationHandler,
} from './controller/web.controller';

export default function (app: Express) {
  app.get('/', (req: Request, res: Response) => res.send('<h2>Express + TypeScript Server + Nodemon</h2>'));

  app.get('/health', (req: Request, res: Response) => {
    res.sendStatus(200);
  });

  // Input - Tray
  app.post('/api/notifications', notificationHandler);

  // Integration  1st step
  app.post('/api/integration', initiateIntegrationHandler);

  // Integration 2nd step
  app.put('/api/integration', finaliseIntegrationHandler);
}
