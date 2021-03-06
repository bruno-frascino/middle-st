/* eslint-disable @getify/proper-arrows/where */
import express from 'express';
import config from 'config';
import log from './logger';
import * as lite from './db/db';
import routes from './routes';
import { initializeMonitors, initializeSystemConnections } from './services/middle.service';

// export NODE_ENV=development (default)
// export NODE_ENV=production (when going to production)
const port: number = config.get('port');
const host: string = config.get('host');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// database connection and other initializations
lite.connect(async () => {
  // Warm up of dependent systems connections
  await initializeSystemConnections();

  app.listen(port, host, () => {
    log.info(`⚡️[server]: Server is running at http://${host}:${port}`);
    // Initialize routes
    routes(app);
  });

  initializeMonitors();
});
