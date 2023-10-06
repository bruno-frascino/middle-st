export interface Integration {
  id: number;
  sellerName?: string;
  sellerSKey?: string;
  sellerSSecret?: string;
  sellerSAccessToken?: string;
  sellerSRefreshToken?: string;
  sellerSAccessExpirationDate?: number; // stored in Unix time
  sellerSRefreshExpirationDate?: number;
  sellerTStoreCode: string;
  sellerTStoreAccessCode?: string;
  sellerTStoreAdminUser?: string;
  sellerTStorePath?: string;
  sellerTAccessToken?: string;
  sellerTRefreshToken?: string;
  sellerTAccessExpirationDate?: number;
  sellerTRefreshExpirationDate?: number;
  createDate: Date;
  active: number;
}
export interface Notification {
  id: number;
  scopeName: string;
  act: string;
  scopeId: number;
  sellerId: number;
  appCode: string;
  storeUrl: string;
  integrationId: number;
  createDate: number;
  complete: number;
}

export interface NotificationKey {
  sellerId: number;
  scopeName: string;
  scopeId: number;
}

export interface TCredentials {
  id: number;
  key: string;
  secret: string;
}

export interface IProduct {
  id: number;
  integrationId: number;
  tProductId: number;
  sProductId: number;
  createDate: number;
  updateDate?: number;
  state: string;
}

export interface IProductSku {
  id: number;
  iProductId: number;
  sSkuId: number;
  tVariantId: number;
  tStock: number;
  createDate: number;
  updateDate?: number;
  state: string;
}

export function isValidIntegration(object: any) {
  return !!(
    object.sellerName &&
    object.sellerSKey &&
    object.sellerSSecret &&
    object.sellerTStoreCode &&
    object.sellerTStoreAccessCode &&
    object.sellerTStoreUrl
  );
}
