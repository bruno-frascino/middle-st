import { Express, Request, Response } from 'express';

export default function (app: Express) {
  app.get('/', (req: Request, res: Response) => res.send('<h2>Express + TypeScript Server + Nodemon</h2>'));

  app.get('/health', (req: Request, res: Response) => {
    res.sendStatus(200);
  });
}
