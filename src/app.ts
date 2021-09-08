/* eslint-disable @getify/proper-arrows/where */
import express, { Request, Response } from 'express';
import config from 'config';
import log from './logger';
import * as lite from './db/sqlite';
import routes from './routes';

// export NODE_ENV=development (default)
// export NODE_ENV=production (when going to production)
const port: number = config.get('port');
const host: string = config.get('host');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req: Request, res: Response) => res.send('<h2>Express + TypeScript Server + Nodemon</h2>'));

lite.connect(() => {
  app.listen(port, host, () => {
    log.info(`⚡️[server]: Server is running at http://${host}:${port}`);
    // Initialize routes
    routes(app);
  });
});
