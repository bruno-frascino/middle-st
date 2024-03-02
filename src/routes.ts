import { Express, Request, Response } from 'express';
import {
  deleteBrandHandler,
  deleteCategoryHandler,
  getIntegrationByStoreCodeHandler,
  initiateIntegrationHandler,
  insertBrandHandler,
  insertCategoryHandler,
  notificationHandler,
  syncSmBrandsHandler,
  syncSmCategoriesHandler,
  syncTrayBrandsHandler,
  syncTrayCategoriesHandler,
  updateBrandHandler,
  updateCategoryHandler,
  updateIntegrationHandler,
} from './controller/web.controller';

export default function (app: Express) {
  app.get('/', (req: Request, res: Response) => res.send('<h2>Express + TypeScript Server + Nodemon</h2>'));

  app.get('/health', (req: Request, res: Response) => {
    res.sendStatus(200);
  });

  // Input - Tray
  app.post('/api/notifications', notificationHandler);

  // Integration Create (1st step)
  app.post('/api/integration', initiateIntegrationHandler);

  // Integration Update (2nd step)
  app.put('/api/integration', updateIntegrationHandler);

  //
  app.get('/api/integration', getIntegrationByStoreCodeHandler);

  // TODO remove
  // app.get('/api/synchronization/category', syncCategoriesHandler);
  app.get('/api/synchronization/sm/category/', syncSmCategoriesHandler);
  app.get('/api/synchronization/tray/category', syncTrayCategoriesHandler);

  // TODO remove
  // app.get('/api/synchronization/brand', syncBrandsHandler);
  app.get('/api/synchronization/sm/brand', syncSmBrandsHandler);
  app.get('/api/synchronization/tray/brand', syncTrayBrandsHandler);

  // CRUD Operations for Brand
  app.post('/api/brand/:systemId', insertBrandHandler);
  app.put('/api/brand/:systemId', updateBrandHandler);
  app.delete('/api/brand/:systemId/:id', deleteBrandHandler);

  // TODO
  // CRUD Operations for Category
  app.post('/api/category/:systemId', insertCategoryHandler);
  app.put('/api/category/:systemId', updateCategoryHandler);
  app.delete('/api/category/:systemId/:id', deleteCategoryHandler);
}
