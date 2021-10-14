import { Notification } from '../model/db.model';
import { Act, Scope, Product as TProduct } from '../model/tray.model';
import { Product as SProduct } from '../model/sm.model';
import { getProduct } from './tray.service';
import log from '../logger';

// understands both sides
export function manageNotifications(notifications: Notification[]) {
  notifications.forEach(async (notification) => {
    switch (`${notification.scopeName}-${notification.act}`) {
      case `${Scope.PRODUCT}-${Act.INSERT}`: {
        console.log('product insert');
        // GET TRAY PRODUCT (API)
        const tProduct = await getProduct(notification);
        // POPULATE SM PRODUCT OBJECT
        // TODO here - Create a Middle Service that speaks the 2 worlds
        // CREATE SM PRODUCT (API)
        // CREATE DB REGISTER (Seller x SM Id x Tray Id)
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

export function convertProduct(product: TProduct): SProduct {
  return { id: 1 };
}
