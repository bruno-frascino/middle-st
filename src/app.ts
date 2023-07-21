/* eslint-disable @getify/proper-arrows/where */
import express from 'express';
import config from 'config';
import log from './logger';
import * as mysql from './db/db';
import routes from './routes';
import { initializeMonitors, initializeSystemConnections } from './services/middle.service';
import { EVarNames } from './shared/utils/utils';

// export NODE_ENV=development (default)
// export NODE_ENV=production (when going to production)
const port: number = config.get(EVarNames.PORT);
const host: string = config.get(EVarNames.HOST);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// database connection and other initializations
mysql.createConnectionPool(async () => {
  // Warm up of dependent systems connections
  await initializeSystemConnections();

  app.listen(port, host, () => {
    log.info(`⚡️[server]: Server is running at http://${host}:${port}`);
    // Initialize routes
    routes(app);
  });

  initializeMonitors();
});
