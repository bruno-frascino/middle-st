/* eslint-disable no-await-in-loop */
import config, { get } from 'config';
import { IProduct, Integration, SBrand as ESBrand, TBrand as ETBrand, SCategory as ESCategory, TCategory as ETCategory } from '../model/db.model';
import { Act, Scope, Product as TProduct, Variant } from '../model/tray.model';
import { Condition, Product as SProduct, Sku } from '../model/sm.model';
import { EVarNames, getCurrentUnixTime } from '../shared/utils/utils';
import {
  getAllNotifications,
  getSlimNotifications,
  getTrayBrandById,
  getTrayCategoryById,
  getTrayProduct,
  getTrayVariant,
  provideTrayAccessToken,
  updateTrayVariant,
} from './tray.service';
import log from '../logger';
import {
  createProduct as createSProduct,
  createSmSku,
  deleteSmSku,
  getActiveStoredSmBrands,
  getFreshSmBrands,
  getSBrandActionGroups,
  getSmBrandById,
  getSmCategoryById,
  getSmSku,
  provideSmAccessToken,
  removeSmProduct,
  updateProduct,
  updateSmSku,
} from './sm.service';
import {
  createIProduct,
  createIProductSku,
  getActiveIntegrationById,
  getBrandSyncData,
  getBrandSyncDataBySId,
  getBrandUnsyncedData,
  getCategorySyncData,
  getCategorySyncDataBySId,
  getCategoryUnsyncedData,
  getIProductById,
  getIProductByT,
  getIProductSkuByT,
  getIProductSkuByVariant,
  getIProductSkusByIntegration,
  getIntegrationByStoreCode,
  getIntegrationsByStatus,
  insertIError,
  insertIntegration,
  updateIProduct,
  updateIProductSku,
  updateIProductSkuByIProduct,
  updateIntegrationByStoreCode,
  updateSBrandByBrand,
  updateSCategoryByCategory,
  updateTBrandByBrand,
  updateTCategoryByCategory,
} from '../db/db';
import { ErrorCategory, MiddleError } from '../shared/errors/MiddleError';
import { convertToSProduct, convertToSSku } from './shared/converter.service';

export async function createIntegration({ storeCode }: { storeCode: string }) {
  const recordKey = await insertIntegration({ storeCode: Number.parseInt(storeCode, 10) });
  const integration = getActiveIntegration(recordKey.id);
  if (!integration) {
    throw new MiddleError(`Error creating integration for storeCode: ${storeCode}`, ErrorCategory.BUS);
  }
  log.info(`Integration record for store code ${storeCode} has been created successfully`);
  return integration;
}

export async function getActiveIntegration(id: number) {
  const integrations = await getActiveIntegrationById(id);
  if (integrations && Array.isArray(integrations) && integrations.length === 1) {
    return integrations[0];
  }
  return undefined;
}

export async function updateIntegrationDetails(integrationParam: Integration) {
  const result = await updateIntegrationByStoreCode(integrationParam);
  if (result.affectedRows === 0) {
    throw new MiddleError(`Integration for store code ${integrationParam.sellerTStoreCode} could not be updated`, ErrorCategory.BUS);
  }
  log.info(`Integration for store code ${integrationParam.sellerTStoreCode} has been updated with details successfully`);
  return getIntegrationByStoreCode(integrationParam.sellerTStoreCode);
}

export async function getIntegrationDetails(storeCode: number) {
  const integrations = await getIntegrationByStoreCode(storeCode);

  if (!integrations || (Array.isArray(integrations) && integrations.length === 0)) {
    throw new MiddleError(`T Seller not found for storeCode: ${storeCode}`, ErrorCategory.BUS);
  }

  return integrations[0];
}

export async function updateSmDbBrand(smDbBrand: ESBrand) {
  const result = await updateSBrandByBrand({ dbBrand: smDbBrand });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No Sm brand updated for internal id ${smDbBrand.id}`, ErrorCategory.BUS);
  }
  return getSmBrandById(smDbBrand.id);
}

export async function updateSmDbCategory(smDbCategory: ESCategory) {
  const result = await updateSCategoryByCategory({ dbCategory: smDbCategory });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No Sm category updated for internal id ${smDbCategory.id}`, ErrorCategory.BUS);
  }
  return getSmCategoryById(smDbCategory.id);
}

export async function updateTrayDbCategory(trayDbCategory: ETCategory) {
  const result = await updateTCategoryByCategory({ dbCategory: trayDbCategory });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No Tray category updated for internal id ${trayDbCategory.id}`, ErrorCategory.BUS);
  }
  return getTrayCategoryById(trayDbCategory.id);
}

export async function updateTrayDbBrand(trayDbBrand: ETBrand) {
  const result = await updateTBrandByBrand({ dbBrand: trayDbBrand });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No Tray brand updated for internal id ${trayDbBrand.id}`, ErrorCategory.BUS);
  }
  return getTrayBrandById(trayDbBrand.id);
}

/**
 *  This Service understands both systems
 * */

/**
 * Update access tokens in the database
 * @returns 
 */
export async function initializeSystemConnections() {
  log.info(`Initializing System Connections`);
  // GET INTEGRATIONS
  const activeIntegrations = await getIntegrationsByStatus(1); // active
  if (!activeIntegrations || activeIntegrations.length === 0) {
    log.warn(`No active Integrations could be found`);
    return;
  }

  activeIntegrations.forEach(async (integration) => {
    try {
      await provideTrayAccessToken(integration);
      await provideSmAccessToken(integration);
    } catch (error) {
      log.error(`System connection initialization error. ${error}`);
    }
  });
}

export function initializeMonitors() {
  const tMonitorInterval: number = config.get(EVarNames.TRAY_MONITOR_INTERVAL); // milliseconds
  const sMonitorInterval: number = config.get(EVarNames.SM_MONITOR_INTERVAL);

  try {
    // TODO - store the interval id in the database and create admin operation 
    // to stop/start intervals
    // Start Tray monitor
    const trayIntervalId = setInterval(monitorTrayNotifications, tMonitorInterval);
    // Start SM monitor
    const smIntervalId = setInterval(monitorSmChanges, sMonitorInterval);
  } catch (error) {
    log.error(`Monitoring error: ${JSON.stringify(error)}`);
  }
}

/**
 *
 * @returns
 */
export async function monitorTrayNotifications() {
  log.info('Tray monitor checking notifications...');
  const start = getCurrentUnixTime();

  // TODO - check possible life cycle of notifications
  // status comoplete
  const notifications = await getAllNotifications();
  if (notifications.length === 0) {
    log.warn(`No Tray notifications were found`);
    return;
  }
  log.info(`Tray notifications found: ${notifications.length}`);

  const sNotifications = getSlimNotifications(notifications);
  // eslint-disable-next-line no-restricted-syntax
  for (const notification of sNotifications) {
    let tProductId;
    // TODO - possible impact in performance, we might want to 
    // to fetch it in parallel
    const integration = await getActiveIntegration(notification.integrationId);
    if (!integration) {
      const errorMessage = `Integration not found for id: ${notification.integrationId}`;
      log.error(errorMessage)
      throw new MiddleError(errorMessage, ErrorCategory.BUS);
    }
    let errorMessage = '';

    switch (`${notification.scopeName}-${notification.act}`) {
      case `${Scope.ORDER}-${Act.INSERT}`:
      case `${Scope.ORDER}-${Act.UPDATE}`: {
        // TODO
        // GET ORDER
        // GET TRAY PRODUCT ID FROM RESPONSE
        // GET RELATED SM PRODUCT FROM IPRODUCT
        // GET SM PRODUCT DETAILS*
        // UPDATE SM PRODUCT STOCK VALUE
        break;
      }
      case `${Scope.ORDER}-${Act.DELETE}`: {
        // TODO
        break;
      }
      case `${Scope.PRODUCT}-${Act.INSERT}`: {
        try {
          // GET TRAY PRODUCT (API)
          const tProduct = await getTrayProduct(notification.scopeId, integration);
          log.warn(`T Product : ${JSON.stringify(tProduct)}`);
          tProductId = tProduct.Product.id;
          // POPULATE SM PRODUCT OBJECT
          const sProduct = await convertToSProduct(tProduct, integration);
          // CREATE SM PRODUCT (API)
          const apiSProduct = await createSProduct(sProduct, integration);
          // CREATE DB REGISTER (Seller x SM Id x Tray Id)
          const iProduct: IProduct = await registerIntegratedProduct(
            notification.integrationId,
            tProduct.Product.id,
            apiSProduct.id,
          );
          // LOG
          log.info(
            `A new product has been integrated. [Integration:${iProduct.integrationId}, tProduct:${iProduct.tProductId}, sProduct:${iProduct.sProductId}}`,
          );
        } catch (error) {
          errorMessage = `Failed to integrate a new Product: ${notification.scopeId} for Integration: ${notification.integrationId
            }. Error: ${JSON.stringify(error)}`;
          log.error(errorMessage);
        }
        break;
      }
      case `${Scope.PRODUCT}-${Act.UPDATE}`:
      case `${Scope.PRODUCT_PRICE}-${Act.UPDATE}`:
      case `${Scope.PRODUCT_STOCK}-${Act.UPDATE}`:
      case `${Scope.PRODUCT_PRICE}-${Act.INSERT}`:
      case `${Scope.PRODUCT_STOCK}-${Act.INSERT}`:
      case `${Scope.PRODUCT_PRICE}-${Act.DELETE}`: // TODO: CHECK THIS USE CASE
      case `${Scope.PRODUCT_STOCK}-${Act.DELETE}`: {
        log.warn('product update');
        try {
          // GET TRAY PRODUCT (API)
          const tProduct = await getTrayProduct(notification.scopeId, integration);
          tProductId = tProduct.Product.id;
          // GET SM ID FROM REGISTER
          const iProduct = await getIProductByT({
            integrationId: notification.integrationId,
            tProductId,
          });
          // GET SM PRODUCT
          // const sProduct = await getSProductById(iProduct.sProductId, notification);
          // POPULATE SM PRODUCT OBJECT
          const sProductToUpdate = await convertToSProduct(tProduct);
          // UPDATE SM PRODUCT (API)
          // sProductToUpdate.id = sProduct.id;
          sProductToUpdate.id = iProduct.sProductId;
          await updateProduct(sProductToUpdate, integration);
          // UPDATE DB REGISTER
          await updateIProduct({ iProductId: iProduct.id, isDeleteState: false });
          // LOG
          log.info(
            `A product has been updated: [Integration:${iProduct.integrationId}, tProduct:${iProduct.tProductId}, sProduct:${iProduct.sProductId}}`,
          );
        } catch (error) {
          errorMessage = `Failed to update Product: ${tProductId} for Integration: ${notification.integrationId}. Error: ${error}`;
          log.error(errorMessage);
        }
        break;
      }
      case `${Scope.PRODUCT}-${Act.DELETE}`: {
        log.warn('product delete');
        try {
          // GET SM ID FROM REGISTER
          tProductId = notification.scopeId;
          const iProduct = await getIProductByT({
            integrationId: notification.integrationId,
            tProductId,
          });
          // DELETE SM PRODUCT
          await removeSmProduct({ productId: iProduct.sProductId, integration });
          // UPDATE DB REGISTER

          await updateIProduct({ iProductId: iProduct.id, isDeleteState: true });
          await updateIProductSkuByIProduct({ iProductId: iProduct.id, isDeleteState: true });
        } catch (error) {
          errorMessage = `Failed to delete Product: ${tProductId} for Integration: ${notification.integrationId}. Error: ${error}`;
          log.error(errorMessage);
        }
        break;
      }
      // Variant == Sku in SM
      case `${Scope.VARIANT}-${Act.INSERT}`: {
        console.log('variant insert');
        try {
          // GET TRAY VARIANT (API)
          const variant = await getTrayVariant(notification.scopeId, integration);
          tProductId = variant.Variant.product_id;

          // GET SM ID FROM REGISTER
          const iProduct = await getIProductByT({ integrationId: notification.integrationId, tProductId });

          // GET SM ID FROM IPRODUCT BASED ON TPRODUCT_ID
          // CONVERT VARIANT TO SKU OBJECT
          const skuToCreate = convertToSSku(variant);
          // CREATE NEW SKU - it is related to Product
          const sSku = await createSmSku({
            productId: iProduct.sProductId,
            sku: skuToCreate,
            integration,
          });

          // UPDATE IPRODUCT (U state)
          await updateIProduct({ iProductId: iProduct.id, isDeleteState: false });
          // CREATE MAPPING IPRODUCT X SM PRODUCT ID X SKU X VARIANT
          await createIProductSku({
            iProductId: iProduct.id,
            sSkuId: sSku.id ?? 0,
            tVariantId: variant.Variant.id,
            tStock: variant.Variant.stock,
          });
          // LOG
          log.info(
            `A new Sku has been integrated. [Integration:${iProduct.integrationId}, tProduct:${iProduct.tProductId}, sProduct:${iProduct.sProductId}, tVariantId: ${variant.Variant.id}, sSkuCode: ${skuToCreate.code_sku}]`,
          );
        } catch (error) {
          errorMessage = `Failed to insert a new Variant: ${notification.scopeId} for Product:${tProductId} for Integration: ${notification.integrationId}. Error: ${error}`;
          log.error(errorMessage);
        }
        break;
      }
      case `${Scope.VARIANT}-${Act.UPDATE}`:
      case `${Scope.VARIANT_PRICE}-${Act.UPDATE}`:
      case `${Scope.VARIANT_STOCK}-${Act.UPDATE}`: {
        // TODO: CONFIRM THESE CASES
        // case `${Scope.VARIANT_PRICE}-${Act.INSERT}`:
        // case `${Scope.VARIANT_STOCK}-${Act.INSERT}`:
        // case `${Scope.VARIANT_PRICE}-${Act.DELETE}`:
        // case `${Scope.VARIANT_STOCK}-${Act.DELETE}`:
        try {
          // GET TRAY VARIANT (API)
          const variant = await getTrayVariant(notification.scopeId, integration);
          tProductId = variant.Variant.product_id;

          // GET SM ID FROM REGISTER
          // const iProduct = await getIProductByT({ integrationId: notification.integrationId, tProductId });
          const iProductSku = await getIProductSkuByT({
            integrationId: notification.integrationId,
            tProductId,
            tVariantId: variant.Variant.id,
          });

          // CONVERT VARIANT TO SKU OBJECT
          const skuToUpdate = convertToSSku(variant);
          skuToUpdate.id = iProductSku.sSkuId;
          // UPDATE SKU - it is related to Product
          await updateSmSku({ sku: skuToUpdate, integration });

          // UPDATE IPRODUCT_SKU (U state)
          await updateIProductSku({
            iProductSkuId: iProductSku.id,
            tStock: variant.Variant.stock,
            isDeleteState: false,
          });
          await updateIProduct({ iProductId: iProductSku.iProductId, isDeleteState: false });
          // LOG
          log.info(
            `A Sku has been updated. [Integration:${notification.integrationId}, iProductId:${skuToUpdate.id}, tVariantId: ${variant.Variant.id}, sSkuId: ${skuToUpdate.id}]`,
          );
        } catch (error) {
          errorMessage = `Failed to update Variant: ${notification.scopeId} for Integration: ${notification.integrationId}. Error: ${error}`;
          log.error(errorMessage);
        }
        break;
      }
      case `${Scope.VARIANT}-${Act.DELETE}`: {
        log.warn('variant delete');
        try {
          // GET IPRODUCT_SKU
          const iProductSku = await getIProductSkuByVariant({ tVariantId: notification.scopeId });
          // DELETE SM SKU
          await deleteSmSku({ skuId: iProductSku.sSkuId, integration });
        } catch (error) {
          errorMessage = `Failed to delete Variant: ${notification.scopeId} for Integration: ${notification.integrationId}. Error: ${error}`;
          log.error(errorMessage);
        }
        break;
      }
      default:
        log.warn(
          `Notification with scope-action: ${notification.scopeName}-${notification.act} could not be processed`,
        );
    }

    if (errorMessage !== '') {
      await insertIError({ errorMessage });
    }
  }

  const stop = getCurrentUnixTime();
  log.info(`Tray monitor started at: ${start} and finished after ${(stop - start) / 60}mins`);
}

export async function monitorSmChanges() {
  const start = Date.now();
  log.info(`SM monitor checking product changes`);
  // GET ALL INTEGRATIONS
  const integrations = await getIntegrationsByStatus(1); // active
  // const iProducts = await getAllIProducts();
  // log.info(`SM Changes Monitor has started - Products list size: ${iProducts.length}`);

  if (integrations.length === 0) {
    log.warn(`Sm monitor could not run. No active integrations found.`);
    return;
  }

  // Check Products per seller
  // integrations.forEach(async (integration) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const integration of integrations) {
    // GET IPRODUCTS for this seller
    // const iProducts = await getIProductsByIntegration(integration.id);
    // iProducts.forEach(async (iProduct) => {
    // What to compare?
    // Sold - Stock
    // TODO - Check what practically means to be sold
    // - register is gone or just stock decrease to 0 or should check another field

    // GET integrated SKUS
    const iProductSkus = await getIProductSkusByIntegration(integration.id);
    if (iProductSkus && iProductSkus.length > 0) {
      // eslint-disable-next-line no-restricted-syntax
      for (const iProductSku of iProductSkus) {
        // Get sku
        const sSku = await getSmSku({ skuId: iProductSku.sSkuId, integration });
        // Get sku from Sm and compare stock to the integration table
        // Get the latest from Tray if SM stock is already different from the integration table
        if (sSku.stock !== iProductSku.tStock) {
          // double check there's nothing in pipeline to be updated
          // TODO: Check what to do in case both market places sell the last item
          // TODO: T Product and TVariant have stock fields, which one to look at?
          const tVariant = await getTrayVariant(iProductSku.iProductId, integration);
          if (sSku.stock <= tVariant.Variant.stock) {
            // UPDATE STOCK IN TRAY
            tVariant.Variant.stock = sSku.stock;
            try {
              await updateTrayVariant(tVariant, integration);
              log.info(
                `Stock updated in Tray for integration: ${integration.id}, sSku: ${sSku.id}, iProduct: ${iProductSku.iProductId} and iProductSku ${iProductSku.id}`,
              );
            } catch (error) {
              log.error(
                `Failed to update stock in Tray for integration: ${integration.id}, sSku: ${sSku.id}, iProduct: ${iProductSku.iProductId} and iProductSku ${iProductSku.id}`,
              );
            }
          }
        }
      }
    }
  }
  log.info(`SM monitor finished in: ${Date.now() - start} milliseconds`);
}

// T to S
export async function registerIntegratedProduct(integrationId: number, tProductId: number, sProductId: number) {
  const iProductDetails = {
    integrationId,
    tProductId,
    sProductId,
  };

  const recordKey = await createIProduct(iProductDetails);
  return getActiveIProductById(recordKey.id);

  // TODO - check Unhappy or what to do with the returned value
  // we need to log it
}

export async function getActiveIProductById(id: number) {
  const iProducts = await getIProductById(id);
  if (iProducts && Array.isArray(iProducts) && iProducts.length === 1) {
    return iProducts[0];
  }
  return undefined;
}

export async function getBrandSyncDetails() {

  const [brandSyncData, unsyncedTBrands] = await Promise.all([
    getBrandSyncData(),
    getBrandUnsyncedData(),
  ]);
  return {
    brandSyncData,
    unsyncedTBrands
  };
}

export async function correlateBrands({ sId, tId }: { sId: number, tId: number }) {

  const sBrand = await getSmBrandById(sId);

  if (!sBrand) {
    throw new MiddleError(`Brand with id ${sId} not found`, ErrorCategory.BUS);
  }

  if (sBrand && sBrand.tBrandId) {
    throw new MiddleError(`Brand ${sBrand.name} is already correlated with Tray Brand ${sBrand.tBrandId}`, ErrorCategory.BUS);
  }

  sBrand.tBrandId = tId;

  const result = await updateSBrandByBrand({ dbBrand: sBrand });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`Brand correlation failed for sId: ${sId} and tBrandId: ${tId}`, ErrorCategory.BUS);
  }

  return getSmBrandById(sId);
}

export async function correlateCategories({ sId, tId }: { sId: number, tId: number }) {

  const sCategory = await getSmCategoryById(sId);

  if (!sCategory) {
    throw new MiddleError(`Category with id ${sId} not found`, ErrorCategory.BUS);
  }

  if (sCategory && sCategory.tCategoryId) {
    throw new MiddleError(`Category ${sCategory.name} is already correlated with Tray Category ${sCategory.tCategoryId}`, ErrorCategory.BUS);
  }

  sCategory.tCategoryId = tId;

  const result = await updateSCategoryByCategory({ dbCategory: sCategory });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`Category correlation failed for sId: ${sId} and tCategoryId: ${tId}`, ErrorCategory.BUS);
  }

  return getSmCategoryById(sId);
}

export async function unrelateBrands(sId: number) {

  const sBrand = await getSmBrandById(sId);

  if (!sBrand || !sBrand.tBrandId) {
    throw new MiddleError(`Failed to unrelate brands, SM Brand with id ${sId} not found`, ErrorCategory.BUS);
  }

  const tId = sBrand.tBrandId;
  sBrand.tBrandId = undefined;

  const result = await updateSBrandByBrand({ dbBrand: sBrand });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`Failed to unrelate brands for Sm Brand with id: ${sId} `, ErrorCategory.BUS);
  }

  const [unrelatedBrandSyncData, unrelatedTBrand] = await Promise.all([
    getBrandSyncDataBySmId(sId),
    getTrayBrandById(tId),
  ]);

  return {
    brandSyncData: unrelatedBrandSyncData,
    unsyncedTBrand: unrelatedTBrand
  }
}

export async function unrelateCategories(sId: number) {

  const sCategory = await getSmCategoryById(sId);

  if (!sCategory || !sCategory.tCategoryId) {
    throw new MiddleError(`Failed to unrelate categories, SM Category with id ${sId} not found`, ErrorCategory.BUS);
  }

  const tId = sCategory.tCategoryId;
  sCategory.tCategoryId = undefined;

  const result = await updateSCategoryByCategory({ dbCategory: sCategory });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`Failed to unrelate categories for Sm Category with id: ${sId} `, ErrorCategory.BUS);
  }

  const [unrelatedCategorySyncData, unrelatedTCategory] = await Promise.all([
    getCategorySyncDataBySmId(sId),
    getTrayCategoryById(tId),
  ]);

  return {
    categorySyncData: unrelatedCategorySyncData,
    unsyncedTCategory: unrelatedTCategory
  }
}


export async function getBrandSyncDataBySmId(sId: number) {
  const brandSyncData = await getBrandSyncDataBySId({ sId });
  if (brandSyncData && Array.isArray(brandSyncData) && brandSyncData.length === 1) {
    return brandSyncData[0];
  }
  return undefined;
}

export async function getCategorySyncDataBySmId(sId: number) {
  const categorySyncData = await getCategorySyncDataBySId({ sId });
  if (categorySyncData && Array.isArray(categorySyncData) && categorySyncData.length === 1) {
    return categorySyncData[0];
  }
  return undefined;
}

export async function getCategorySyncDetails() {
  const [categorySyncData, unsyncedTCategories] = await Promise.all([
    getCategorySyncData(),
    getCategoryUnsyncedData(),
  ]);
  return {
    categorySyncData,
    unsyncedTCategories
  };
}

export async function manageBrandSynchronization() {
  // UPDATE SM Brand Table
  // get T Brands
  // save in a table
  // check matches from database
  // save result in the map table
  // return results
  // previous sync attempt
  // records not matched from S
  // records not matched from T
  // records matched
}

// TODO - consider removing this
export async function updateSBrandReference() {
  // get SM Brands
  const freshSBrands = await getFreshSmBrands();
  // get DB SM Brands
  const storedSBrands = await getActiveStoredSmBrands();

  const sBrandActionMap = getSBrandActionGroups({ freshSBrands, storedSBrands });

  // // Insert
  // const insertGroup = sBrandActionMap.get(Action.INSERT);
  // if (insertGroup) {
  //   const insertedBrands = await Promise.all(
  //     insertGroup.map(async (sBrand) => {
  //       try {
  //         const newSBrand = await insertSBrand({ sBrand });
  //         return newSBrand;
  //       } catch (err) {
  //         log.error(`Brand ${sBrand?.name} failed to be inserted with error: ${err}`);
  //         return null;
  //       }
  //     }),
  //   );
  // }

  // // Update
  // const updateGroup = sBrandActionMap.get(Action.UPDATE);
  // if (updateGroup) {
  //   const updatedBrands = await Promise.all(
  //     updateGroup.map(async (sBrand) => {
  //       try {
  //         const newSBrand = await updateSBrand({ sBrand });
  //         return newSBrand;
  //       } catch (err) {
  //         log.error(`Brand ${sBrand?.name} failed to be updated with error: ${err}`);
  //         return null;
  //       }
  //     }),
  //   );
  // }

  // Delete needs attention // TODO - What to do about delete?
}

// TODO
// Something to consider: Ask Tray user when integrating with Midle-ST (
// --------------------------
// Friendly UI page) to enter SM Places key + secret to check if it matches a pre register of the seller. Or another field (email, sellerName/Id, an integration code generated in a pre integration step)
