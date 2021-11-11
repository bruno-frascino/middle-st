import config from 'config';
import { Notification } from '../model/db.model';
import { Act, Scope, Product as TProduct } from '../model/tray.model';
import { Condition, Product as SProduct } from '../model/sm.model';
import {
  getProduct as getTProduct,
  manageSystemConnection as manageTSystemConnection,
  monitorNotifications,
} from './tray.service';
import log from '../logger';
import {
  createProduct as createSProduct,
  manageSystemConnection as manageSSystemConnection,
  monitorChanges,
} from './sm.service';
import { getIntegrations } from '../db/db';

/**
 *  This Service understands both systems
 * */

export async function initializeSystemConnections() {
  // GET INTEGRATIONS
  const integrations = await getIntegrations();
  if (!integrations || integrations.length === 0) {
    log.warn(`No Integrations could be found`);
    return;
  }

  try {
    integrations.forEach(async (integration) => {
      await manageTSystemConnection(integration);
      await manageSSystemConnection(integration);
    });
  } catch (error) {
    log.error(`System connections initialization error: ${error}`);
  }
}

export function initializeMonitors() {
  const tMonitorInterval: number = config.get('tMonitorInterval');
  const sMonitorInterval: number = config.get('sMonitorInterval');

  // Start Tray monitor
  setInterval(monitorNotifications, tMonitorInterval);
  // Start SM monitor
  setInterval(monitorChanges, sMonitorInterval);
}

export function manageNotifications(notifications: Notification[]) {
  notifications.forEach(async (notification) => {
    switch (`${notification.scopeName}-${notification.act}`) {
      case `${Scope.PRODUCT}-${Act.INSERT}`: {
        console.log('product insert');
        // GET TRAY PRODUCT (API)
        const tProduct = await getTProduct(notification);
        // POPULATE SM PRODUCT OBJECT
        const sProduct = convertToSProduct(tProduct);
        // CREATE SM PRODUCT (API)
        const productId = await createSProduct(sProduct, notification);
        // CREATE DB REGISTER (Seller x SM Id x Tray Id)
        registerProduct(tProduct, sProduct, notification);

        break;
      }
      case `${Scope.PRODUCT}-${Act.UPDATE}`:
      case `${Scope.PRODUCT_PRICE}-${Act.UPDATE}`:
      case `${Scope.PRODUCT_STOCK}-${Act.UPDATE}`:
      case `${Scope.PRODUCT_PRICE}-${Act.INSERT}`:
      case `${Scope.PRODUCT_STOCK}-${Act.INSERT}`:
      case `${Scope.PRODUCT_PRICE}-${Act.DELETE}`:
      case `${Scope.PRODUCT_STOCK}-${Act.DELETE}`:
        console.log('product update');
        // GET TRAY PRODUCT (API)
        // GET SM ID FROM REGISTER
        // GET SM PRODUCT
        // POPULATE SM PRODUCT OBJECT
        // UPDATE SM PRODUCT (API)
        // UPDATE DB REGISTER
        break;
      case `${Scope.PRODUCT}-${Act.DELETE}`:
        console.log('product delete');
        // GET SM ID FROM REGISTER
        // DELETE SM PRODUCT
        // UPDATE DB REGISTER
        break;
      case `${Scope.VARIANT}-${Act.INSERT}`:
        console.log('variant insert');
        break;
      case `${Scope.VARIANT}-${Act.UPDATE}`:
      case `${Scope.VARIANT_PRICE}-${Act.UPDATE}`:
      case `${Scope.VARIANT_STOCK}-${Act.UPDATE}`:
      case `${Scope.VARIANT_PRICE}-${Act.INSERT}`:
      case `${Scope.VARIANT_STOCK}-${Act.INSERT}`:
      case `${Scope.VARIANT_PRICE}-${Act.DELETE}`:
      case `${Scope.VARIANT_STOCK}-${Act.DELETE}`:
        console.log('variant update');
        break;
      case `${Scope.VARIANT}-${Act.DELETE}`:
        console.log('variant delete');
        break;
      default:
        log.warn(
          `Notification with scope/action: ${notification.scopeName}/${notification.act} could not be processed`,
        );
    }
  });
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

export function registerProduct(tProduct: TProduct, sProduct: SProduct, notification: Notification) {
  // TODO
}

// TODO
// Something to consider: Ask Tray user when integrating with Midle-ST (
// --------------------------
// Friendly UI page) to enter SM Places key + secret to check if it matches a pre register of the seller. Or another field (email, sellerName/Id, an integration code generated in a pre integration step)
