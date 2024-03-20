import { NextFunction, Request, Response } from 'express';
import log from '../logger';
import { Notification, isNotification, isTrayBrand, isTrayCategory } from '../model/tray.model';
import { deleteTrayBrand, deleteTrayCategory, getConsumerKey, getTrayBrandSyncDetails, getTrayCategorySyncDetails, handleNotification, insertTrayBrand, insertTrayCategory, updateTrayBrand, updateTrayCategory } from '../services/tray.service';
import {
  correlateBrands,
  correlateCategories,
  createIntegration,
  getBrandSyncDetails,
  getCategorySyncDetails,
  getIntegrationDetails,
  unrelateBrands,
  unrelateCategories,
  updateIntegrationDetails,
  updateSmDbBrand,
  updateSmDbCategory,
  updateTrayDbBrand,
  updateTrayDbCategory,
} from '../services/middle.service';
import { isValidIntegration, isValidSmDbBrand, isValidSmDbCategory, isValidTrayDbBrand, isValidTrayDbCategory } from '../model/db.model';
import { deleteSmBrand, deleteSmCategory, getSmBrandSyncDetails, getSmCategorySyncDetails, insertSmBrand, insertSmCategory, updateSmBrand, updateSmCategory } from '../services/sm.service';
import { isSmBrand, isSmCategory } from '../model/sm.model';

const brandHandlerMap = {
  'sm': {
    validateInput: isSmBrand,
    insertFn: insertSmBrand,
    updateFn: updateSmBrand,
    deleteFn: deleteSmBrand,
    getFn: () => { },
  },
  'tray': {
    validateInput: isTrayBrand,
    insertFn: insertTrayBrand,
    updateFn: updateTrayBrand,
    deleteFn: deleteTrayBrand,
  },
  'fsi-sm': {
    validateInput: isValidSmDbBrand,
    updateFn: updateSmDbBrand,
    insertFn: () => { },
    deleteFn: () => { },
  },
  'fsi-tray': {
    validateInput: isValidTrayDbBrand,
    updateFn: updateTrayDbBrand,
    insertFn: () => { },
    deleteFn: () => { },
  },
};

const categoryHandlerMap = {
  'sm': {
    validateInput: isSmCategory,
    insertFn: insertSmCategory,
    updateFn: updateSmCategory,
    deleteFn: deleteSmCategory,
  },
  'tray': {
    validateInput: isTrayCategory,
    insertFn: insertTrayCategory,
    updateFn: updateTrayCategory,
    deleteFn: deleteTrayCategory,
  },
  'fsi-sm': {
    validateInput: isValidSmDbCategory,
    updateFn: updateSmDbCategory,
    insertFn: () => { },
    deleteFn: () => { },
  },
  'fsi-tray': {
    validateInput: isValidTrayDbCategory,
    updateFn: updateTrayDbCategory,
    insertFn: () => { },
    deleteFn: () => { },
  },
};

type SystemId = 'sm' | 'tray' | 'fsi-sm' | 'fsi-tray';

const validSystemIds = Object.keys(brandHandlerMap);

// ---- Migration Operations ----
export async function notificationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate Input
    log.debug(`Request body for Notification handler: ${JSON.stringify(req.body)}`);
    if (!isNotification(req.body)) {
      log.error(`Invalid notification body ${JSON.stringify(req.body)}`);
      res.sendStatus(400);
      return;
    }
    const notification: Notification = req.body;
    // Save Notification to be processed later
    await handleNotification(notification);
    res.sendStatus(200);
  } catch (err) {
    log.error(`Unable to handle notification: ${err}`);
    next(err);
  }
}

// ---- Integration Operations ----
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

export async function updateIntegrationHandler(req: Request, res: Response, next: NextFunction) {
  // Validate Input
  const requestData = req.body;
  try {
    if (!isValidIntegration(requestData)) {
      log.error(`Missing integration field(s) - payload: ${JSON.stringify(requestData)}`);
      res.status(400).json({ message: 'Missing integration field(s)' });
      return;
    }

    const integration = await updateIntegrationDetails(requestData);
    // const responseData = {
    //   integration,
    // };

    res.status(200).json({
      integration,
    });
  } catch (err) {
    log.error(`Unable to update Integration with data ${JSON.stringify(requestData)} with error: ${err}`);
    next(err);
  }
}

export async function getIntegrationByStoreCodeHandler(req: Request, res: Response, next: NextFunction) {
  // Validate Input
  const storeCodeParam = req.query.storeCode;
  try {
    if (!storeCodeParam) {
      const msg = `Missing storeCode parameter to get Integration`;
      log.error(msg);
      res.status(400).json({ message: msg });
      return;
    }
    if (typeof storeCodeParam !== 'string') {
      res.status(500).json({ error: 'Invalid parameter' });
      return;
    }

    const integration = await getIntegrationDetails(Number.parseInt(storeCodeParam, 10));
    const responseData = {
      integration,
    };

    res.status(200).json({
      responseData,
    });
  } catch (err) {
    log.error(`Unable to get Integration data for storeCode ${storeCodeParam} with error: ${err}`);
    next(err);
  }
}


// ---- Admin Operations ----
// ---- Brand Operations ----
export async function getBrandSyncDataHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const brandSyncDetails = await getBrandSyncDetails();

    res.status(200).json({
      ...brandSyncDetails,
    });
  } catch (err) {
    log.error(`Unable to fetch Brand sync details with error: ${err}`);
    next(err);
  }
}

export async function correlateBrandsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    if (!payload || !payload.sId || !payload.tId) {
      log.error(`Invalid request. Payload: ${JSON.stringify(req.body)}`);
      res.status(400).json({ message: 'Invalid request' });
      return;
    }
    await correlateBrands(payload);

    res.sendStatus(200);

  } catch (err) {
    log.error(`Unable to correlate Brands: ${err}`);
    next(err);
  }
}

export async function unrelateBrandsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const sId = req.params.sId as string;
    if (!sId) {
      // log.warn(`req.params ${req.params}`);
      log.error(`Invalid request. Params: ${req.params.sId}`);
      res.status(400).json({ message: 'Invalid request' });
      return;
    }
    const result = await unrelateBrands(Number.parseInt(sId, 10));

    res.status(200).json({
      ...result,
    });

  } catch (err) {
    log.error(`Unable to unrelate Brands: ${err}`);
    next(err);
  }
}

export async function syncSmBrandsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const smBrandInformation = await getSmBrandSyncDetails();

    res.status(200).json({
      ...smBrandInformation,
    });
  } catch (err) {
    log.error(`Unable to fetch Sm Brand sync details with error: ${err}`);
    next(err);
  }
}

export async function syncTrayBrandsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const trayBrandInformation = await getTrayBrandSyncDetails();

    res.status(200).json({
      ...trayBrandInformation,
    });
  } catch (err) {
    log.error(`Unable to fetch Tray Brand sync details with error: ${err}`);
    next(err);
  }
}

// Handles SM Brand Insertion and Tray Brand Insertion
export async function insertBrandHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate Input
    const systemId = req.params.systemId as string
    const payload = req.body;
    const handler = getBrandCrudHandler(systemId);
    if (!handler || (handler && !handler.validateInput(payload))) {
      const errorMsg = `Invalid request. Payload: ${JSON.stringify(req.body)} SystemId: ${systemId}`;
      log.error(errorMsg);
      res.status(400).json({ message: errorMsg });
      return;
    }

    const brand = await handler.insertFn(payload);

    res.status(200).json({
      ...brand
    });
  } catch (err) {
    log.error(`Unable to insert brand: ${err}`);
    next(err);
  }
}

// Handles SM Brand Update and Tray Brand Update
export async function updateBrandHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate Input
    const systemId = req.params.systemId as string
    const payload = req.body;
    const handler = getBrandCrudHandler(systemId);
    if (!handler || (handler && !handler.validateInput(payload))) {
      const errorMsg = `Invalid request. Payload: ${JSON.stringify(req.body)} SystemId: ${systemId}`;
      log.error(errorMsg);
      res.status(400).json({ message: errorMsg });
      return;
    }

    const brand = await handler.updateFn(payload);

    res.status(200).json({
      ...brand
    });
  } catch (err) {
    log.error(`Unable to update brand: ${err}`);
    next(err);
  }
}

// Handles SM and Tray Brand Delete
export async function deleteBrandHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate Input
    const systemId = req.params.systemId as string;
    const id = req.params.id as string;
    const handler = getBrandCrudHandler(systemId);
    if (!handler || !id) {
      const errorMsg = `Invalid request with systemId: ${systemId} and brand id: ${id}`;
      log.error(errorMsg);
      res.status(400).json({ message: errorMsg });
      return;
    }

    const result = await handler.deleteFn(Number(id));

    res.status(200).json(
      result?.affectedRows
    );
  } catch (err) {
    log.error(`Unable to delete brand: ${err}`);
    next(err);
  }
}


// ---- Categories Operations ----
export async function getCategorySyncDataHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const categoriesInformation = await getCategorySyncDetails();

    res.status(200).json({
      ...categoriesInformation,
    });
  } catch (err) {
    log.error(`Unable to fetch Categories sync details with error: ${err}`);
    next(err);
  }
}

export async function correlateCategoriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    if (!payload || !payload.sId || !payload.tId) {
      log.error(`Invalid request. Payload: ${JSON.stringify(req.body)}`);
      res.status(400).json({ message: 'Invalid request' });
      return;
    }
    await correlateCategories(payload);

    res.sendStatus(200);

  } catch (err) {
    log.error(`Unable to correlate Categories: ${err}`);
    next(err);
  }
}

export async function unrelateCategoriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const sId = req.params.sId as string;
    if (!sId) {
      // log.warn(`req.params ${req.params}`);
      log.error(`Invalid request. Params: ${req.params.sId}`);
      res.status(400).json({ message: 'Invalid request' });
      return;
    }
    const result = await unrelateCategories(Number.parseInt(sId, 10));

    res.status(200).json({
      ...result,
    });

  } catch (err) {
    log.error(`Unable to unrelate Categories: ${err}`);
    next(err);
  }
}

export async function syncSmCategoriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const smCategoriesInformation = await getSmCategorySyncDetails();

    res.status(200).json({
      ...smCategoriesInformation,
    });
  } catch (err) {
    log.error(`Unable to fetch Sm Categories sync details with error: ${err}`);
    next(err);
  }
}

export async function syncTrayCategoriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const trayCategoriesInformation = await getTrayCategorySyncDetails();

    res.status(200).json({
      ...trayCategoriesInformation,
    });
  } catch (err) {
    log.error(`Unable to fetch Tray Categories sync details with error: ${err}`);
    next(err);
  }
}

// Handles SM and Tray Cateogry Insertion
export async function insertCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate Input
    const systemId = req.params.systemId as string
    const payload = req.body;
    const handler = getCategoryCrudHandler(systemId);
    if (!handler || (handler && !handler.validateInput(payload))) {
      const errorMsg = `Invalid request. Payload: ${JSON.stringify(req.body)} SystemId: ${systemId}`;
      log.error(errorMsg);
      res.status(400).json({ message: errorMsg });
      return;
    }

    const category = await handler.insertFn(payload);

    res.status(200).json({
      ...category
    });
  } catch (err) {
    log.error(`Unable to insert category: ${err}`);
    next(err);
  }
}

// Handles SM and Tray Category Update
export async function updateCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate Input
    const systemId = req.params.systemId as string
    const payload = req.body;
    const handler = getCategoryCrudHandler(systemId);
    if (!handler || (handler && !handler.validateInput(payload))) {
      const errorMsg = `Invalid request. Payload: ${JSON.stringify(req.body)} SystemId: ${systemId}`;
      log.error(errorMsg);
      res.status(400).json({ message: errorMsg });
      return;
    }

    const category = await handler.updateFn(payload);
    log.warn(`Category updated: ${JSON.stringify(category)}`);
    res.status(200).json({
      ...category
    });
  } catch (err) {
    log.error(`Unable to update category: ${err}`);
    next(err);
  }
}

// Handles SM and Tray Category Delete
export async function deleteCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate Input
    const systemId = req.params.systemId as string;
    const id = req.params.id as string;
    const handler = getCategoryCrudHandler(systemId);
    if (!handler || !id) {
      const errorMsg = `Invalid request with systemId: ${systemId} and category id: ${id}`;
      log.error(errorMsg);
      res.status(400).json({ message: errorMsg });
      return;
    }

    const result = await handler.deleteFn(Number(id));

    res.status(200).json(
      result?.affectedRows
    );
  } catch (err) {
    log.error(`Unable to delete brand: ${err}`);
    next(err);
  }
}


// util functions
function getBrandCrudHandler(systemId: string | undefined) {
  if (systemId && validSystemIds.includes(systemId)) {
    const handler = brandHandlerMap[systemId as SystemId];
    return handler;
  }
  return undefined;
}

function getCategoryCrudHandler(systemId: string | undefined) {
  if (systemId && validSystemIds.includes(systemId)) {
    const handler = categoryHandlerMap[systemId as SystemId];
    return handler;
  }
  return undefined;
}