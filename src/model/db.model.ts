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
  sellerSAccessExpirationDate?: number;
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
  createDate: number;
  complete: number;
}

export interface NotificationKey {
  sellerId: number;
  scopeName: string;
  scopeId: number;
}

export interface TDetails {
  id: number;
  key: string;
  secret: string;
}
