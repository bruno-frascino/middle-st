export interface Integration {
  id: number;
  sellerName?: string;
  sellerSId: number;
  sellerSKey?: string;
  sellerSSecret?: string;
  sellerSStoreCode?: string;
  sellerSStoreUrl?: string;
  sellerSAccessToken?: string;
  sellerSRefreshToken?: string;
  sellerSAccessExpirationDate?: number; // stored in Unix time
  sellerSRefreshExpirationDate?: number;
  sellerTId: number;
  sellerTKey?: string;
  sellerTSecret?: string;
  sellerTStoreCode?: string;
  sellerTStoreUrl?: string;
  sellerTAccessToken?: string;
  sellerTRefreshToken?: string;
  sellerTAccessExpirationDate?: number;
  sellerTRefreshExpirationDate?: number;
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
