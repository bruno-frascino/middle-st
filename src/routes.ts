import { Express, Request, Response } from 'express';
import {
  correlateBrandsHandler,
  correlateCategoriesHandler,
  deleteBrandHandler,
  deleteCategoryHandler,
  getBrandSyncDataHandler,
  getCategorySyncDataHandler,
  getIntegrationByStoreCodeHandler,
  initiateIntegrationHandler,
  insertBrandHandler,
  insertCategoryHandler,
  notificationHandler,
  syncSmBrandsHandler,
  syncSmCategoriesHandler,
  syncTrayBrandsHandler,
  syncTrayCategoriesHandler,
  unrelateBrandsHandler,
  unrelateCategoriesHandler,
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

  // Sync Operations for Categories
  app.get('/api/synchronization/category', getCategorySyncDataHandler);
  app.put('/api/synchronization/category', correlateCategoriesHandler);
  app.delete('/api/synchronization/category/:sId', unrelateCategoriesHandler);
  app.get('/api/synchronization/sm/category', syncSmCategoriesHandler);
  app.get('/api/synchronization/tray/category', syncTrayCategoriesHandler);

  // Sync Operations for Brand
  app.get('/api/synchronization/brand', getBrandSyncDataHandler);
  app.put('/api/synchronization/brand', correlateBrandsHandler);
  app.delete('/api/synchronization/brand/:sId', unrelateBrandsHandler);
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
