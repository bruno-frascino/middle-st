import config from 'config';
import { IProduct } from '../model/db.model';
import { Act, Scope, Product as TProduct, Variant } from '../model/tray.model';
import { Condition, Product as SProduct, Sku } from '../model/sm.model';
import { getCurrentUnixTime } from '../shared/utils/utils';
import {
  getAllNotifications,
  getSlimNotifications,
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
  getSmSku,
  provideSmAccessToken,
  removeSmProduct,
  updateProduct,
  updateSmSku,
} from './sm.service';
import {
  createIProduct,
  createIProductSku,
  getAllIntegrations,
  getIProductByT,
  getIProductSkuByT,
  getIProductSkuByVariant,
  getIProductSkusByIntegration,
  getIntegrationById,
  updateIProduct,
  updateIProductSku,
  updateIProductSkuByIProduct,
} from '../db/db';

/**
 *  This Service understands both systems
 * */

export async function initializeSystemConnections() {
  // GET INTEGRATIONS
  const integrations = await getAllIntegrations();
  if (!integrations || integrations.length === 0) {
    log.warn(`No Integrations could be found`);
    return;
  }

  try {
    integrations.forEach(async (integration) => {
      await provideTrayAccessToken(integration);
      await provideSmAccessToken(integration);
    });
  } catch (error) {
    log.error(`System connections initialization error: ${error}`);
  }
}

export function initializeMonitors() {
  const tMonitorInterval: number = config.get('tMonitorInterval'); // milliseconds
  const sMonitorInterval: number = config.get('sMonitorInterval');

  // Start Tray monitor
  setInterval(monitorTrayNotifications, tMonitorInterval);
  // Start SM monitor
  setInterval(monitorSmChanges, sMonitorInterval);
}

/**
 *
 * @returns
 */
export async function monitorTrayNotifications() {
  log.info('Monitor checking notifications...');

  const notifications = await getAllNotifications();
  log.info(`Notifications found: ${notifications.length}`);
  if (notifications.length === 0) {
    return;
  }

  getSlimNotifications(notifications).forEach(async (notification) => {
    let tProductId;
    const integration = await getIntegrationById(notification.integrationId);
    switch (`${notification.scopeName}-${notification.act}`) {
      case `${Scope.PRODUCT}-${Act.INSERT}`: {
        console.log('product insert');
        try {
          // GET TRAY PRODUCT (API)
          const tProduct = await getTrayProduct(notification.scopeId, integration);
          tProductId = tProduct.Product.id;
          // POPULATE SM PRODUCT OBJECT
          const sProduct = convertToSProduct(tProduct);
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
          log.error(
            `Failed to integrate a new Product: ${tProductId} for Integration: ${notification.integrationId}. Error: ${error}`,
          );
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
        console.log('product update');
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
          const sProductToUpdate = convertToSProduct(tProduct);
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
          log.error(
            `Failed to update Product: ${tProductId} for Integration: ${notification.integrationId}. Error: ${error}`,
          );
        }
        break;
      }
      case `${Scope.PRODUCT}-${Act.DELETE}`: {
        console.log('product delete');
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
          // TODO - Register any integration that failed in a table, not just log, with enough info to trace back to the initial notification
          // consider a scenario where failed notifications can be retried automatically by the system
          log.error(
            `Failed to delete Product: ${tProductId} for Integration: ${notification.integrationId}. Error: ${error}`,
          );
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
          createIProductSku({
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
          log.error(
            `Failed to insert a new Variant: ${notification.scopeId} for Product:${tProductId} for Integration: ${notification.integrationId}. Error: ${error}`,
          );
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
        console.log('variant update');
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
          log.error(
            `Failed to update Variant: ${notification.scopeId} for Integration: ${notification.integrationId}. Error: ${error}`,
          );
        }
        break;
      }
      case `${Scope.VARIANT}-${Act.DELETE}`: {
        console.log('variant delete');
        try {
          // GET IPRODUCT_SKU
          const iProductSku = await getIProductSkuByVariant({ tVariantId: notification.scopeId });
          // DELETE SM SKU
          await deleteSmSku({ skuId: iProductSku.sSkuId, integration });
        } catch (error) {
          log.error(
            `Failed to delete Variant: ${notification.scopeId} for Integration: ${notification.integrationId}. Error: ${error}`,
          );
        }
        break;
      }
      default:
        log.warn(
          `Notification with scope-action: ${notification.scopeName}-${notification.act} could not be processed`,
        );
    }
  });
}

export async function monitorSmChanges() {
  log.info(`SM monitor started at ${getCurrentUnixTime()}`);
  // GET ALL INTEGRATIONS
  const integrations = await getAllIntegrations();
  // const iProducts = await getAllIProducts();
  // log.info(`SM Changes Monitor has started - Products list size: ${iProducts.length}`);

  if (!integrations) {
    log.error(`Sm monitor couldn't run. Invalid or no integrations found.`);
  }

  // Check Products per seller
  integrations.forEach(async (integration) => {
    // GET IPRODUCTS for this seller
    // const iProducts = await getIProductsByIntegration(integration.id);
    // iProducts.forEach(async (iProduct) => {
    // What to compare?
    // Sold - Stock
    // TODO - Check what practically means to be sold
    // - register is gone or just stock decrease to 0 or should check another field

    // GET integrated SKUS
    const iProductSkus = await getIProductSkusByIntegration(integration.id);
    // Get sku
    const sSku = await getSmSku({ skuId: iProductSkus.sSkuId, integration });
    // Get sku from Sm and compare stock to the integration table
    // Get the latest from Tray if SM stock is already different from the integration table
    if (sSku.stock !== iProductSkus.tStock) {
      // double check there's nothing in pipeline to be updated
      // TODO: Check what to do in case both market places sell the last item
      // TODO: T Product and TVariant have stock fields, which one to look at?
      const tVariant = await getTrayVariant(iProductSkus.iProductId, integration);
      if (sSku.stock <= tVariant.Variant.stock) {
        // UPDATE STOCK IN TRAY
        tVariant.Variant.stock = sSku.stock;
        try {
          await updateTrayVariant(tVariant, integration);
          log.info(
            `Stock updated in Tray for integration: ${integration.id}, sSku: ${sSku.id}, iProduct: ${iProductSkus.iProductId} and iProductSku ${iProductSkus.id}`,
          );
        } catch (error) {
          log.error(
            `Failed to update stock in Tray for integration: ${integration.id}, sSku: ${sSku.id}, iProduct: ${iProductSkus.iProductId} and iProductSku ${iProductSkus.id}`,
          );
        }
      }
    }
  });
  log.info(`SM monitor finished at: ${getCurrentUnixTime()}`);
}

// TODO - Product conversion
export function convertToSProduct(tProduct: TProduct): SProduct {
  // id ?? TODO - Create vs Update
  // TODO - Check what todo with these fields with no correlation:
  // const attributes = []; // check example in SM to try to correlate to tray
  // const reference_code = tProduct.Product.reference // ??
  const min_wholesale_quantity = 1; // ??

  // SIMPLE conversion
  const {
    available,
    brand_id,
    category_id,
    description,
    ean,
    free_shipping,
    height,
    length,
    model,
    price,
    promotional_price,
    reference,
    stock,
    title,
    video,
    weight,
    width,
  } = tProduct.Product;

  // TODO - Create table for conversation of CATEGORY (SxT) and BRAND (SxT)
  // Consider User doing it in a friendly user interface. It depends how Category
  // and brand are registered in Tray - To Find out

  // COMPLEX conversion
  const sProduct: SProduct = {
    id: 0, // check
    title,
    publish: true, // check
    categories: convertToSCategory(category_id),
    attributes: [], // check
    description,
    brand_id: convertToSBrand(brand_id),
    model,
    reference_code: reference,
    condition: Condition.NOVO, // check
    min_wholesale_quantity, // check
    url_video: video,
    shipping: {
      free: free_shipping === 1,
      enabled: true, // check
    },
    seo: {
      // metatag maybe
      title: '',
      description: '',
      keywords: '',
    },
    google_shopping: {
      enable: false,
      mpn: '',
      age_group: '', // infant
      gender: '', // male
      google_product_category: '',
    },
    skus: [
      {
        stock,
        barcode: ean,
        code_sku: '', // check ??
        status: available === 1 ? 'ACTIVE' : 'INACTIVE', // "INACTIVE" | ACTIVE
        unity_type: '', // ??
        unity_quantity: 0, // Sku stock ?
        extra_days_to_delivery: 0, // any default?
        dimensions: {
          weight,
          height,
          width,
          length,
        },
        prices: {
          retail: {
            regular: price,
            sale: promotional_price,
          },
          wholesale: {
            regular: 0,
            sale: 0,
          },
        },
        variants: [],
      },
    ],
  };

  return sProduct;
}

export function convertToSBrand(tBrand_id: number) {
  // TODO
  return tBrand_id + 1;
}

export function convertToSCategory(tCategory_id: number) {
  // TODO
  return [tCategory_id + 1];
}

function convertToSSku(variant: Variant) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const { Variant } = variant;
  const sku: Sku = {
    code_sku: Variant.id.toString(),
    barcode: Variant.ean,
    prices: {
      retail: {
        regular: Variant.cost_price,
        sale: Variant.price,
      },
    },
    stock: Variant.stock,
    status: Variant.available === 1 ? 'ACTIVE' : 'INACTIVE',
    // TODO: Check default values - dummy for now as they don't exist in Tray
    unity_type: '',
    unity_quantity: 0,
    extra_days_to_delivery: 0,
    dimensions: {
      weight: Variant.weight,
      height: Variant.height,
      width: Variant.width,
      length: Variant.length,
    },
    // TODO - how to translate TRAY variant to this variant
    variants: [],
    // variants: Variant[];
    // {
    //   id: number;
    //   name: string; // "Tamanho",
    //   value: string; // "M"
    // }

    // TRAY fields without a clear correspondent in SM
    // order: string; //         Tray
    // product_id: number; //    Tray
    // minimum_stock: number; // Tray
    // reference: string; //     Tray
    // cubic_weight: number; //  Tray
    // // '2019-01-01';
    // start_promotion: Date; //                    Tray
    // // '2019-01-10';
    // end_promotion: Date; //                      Tray
    // promotional_price: number; //                Tray
    // payment_option: string; //                   Tray
    // payment_option_details: PaymentDetails[]; // Tray
    // illustrative_image: string; //               Tray
    // Sku: TypeValueImage[]; // TODO Confirm these
    // VariantImage: Image[]; // Gallery?
  };

  return sku;
}

// T to S
export async function registerIntegratedProduct(integrationId: number, tProductId: number, sProductId: number) {
  const iProductDetails = {
    integrationId,
    tProductId,
    sProductId,
  };

  return createIProduct(iProductDetails);
  // TODO - check Unhappy or what to do with the returned value
  // we need to log it
}

// TODO
// Something to consider: Ask Tray user when integrating with Midle-ST (
// --------------------------
// Friendly UI page) to enter SM Places key + secret to check if it matches a pre register of the seller. Or another field (email, sellerName/Id, an integration code generated in a pre integration step)
