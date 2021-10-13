/* eslint-disable @getify/proper-arrows/where */
import express from 'express';
import config from 'config';
import log from './logger';
import * as lite from './db/db';
import routes from './routes';
import { initializeConnection as initializeTConnection, notificationMonitor } from './services/tray.service';
import { getIntegrations } from './db/db';

// export NODE_ENV=development (default)
// export NODE_ENV=production (when going to production)
const port: number = config.get('port');
const host: string = config.get('host');
const tMonitor: number = config.get('tMonitor');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// database connection and other initializations
lite.connect(async () => {
  // TODO - consider proactively warm up dependency systems connections
  // initializeSM();
  await initializeSystem();

  app.listen(port, host, () => {
    log.info(`⚡️[server]: Server is running at http://${host}:${port}`);
    // Initialize routes
    routes(app);
  });

  // Start Tray monitor
  setInterval(notificationMonitor, tMonitor);
});

async function initializeSystem() {
  // GET INTEGRATIONS
  const integrations = await getIntegrations();
  if (!integrations || integrations.length === 0) {
    log.warn(`No Integrations could be found`);
    return;
  }

  try {
    integrations.forEach((integration) => {
      initializeTConnection(integration);
      // ini
    });
  } catch (error) {
    log.error(error.message);
  }
}
