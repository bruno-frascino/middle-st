/* eslint-disable @getify/proper-arrows/where */
import express, { Application, Request, Response } from 'express';
import config from 'config';
import sysLogger from './logger';

// export NODE_ENV=development (default)
// export NODE_ENV=production (when going to production)
const port: number = config.get('port');
const host: string = config.get('host');

const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req: Request, res: Response) => res.send('<h2>Express + TypeScript Server + Nodemon</h2>'));

app.listen(port, host, () => {
  sysLogger.info(`⚡️[server]: Server is running at http://${host}:${port}`);
});
