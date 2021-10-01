export interface Integration {
  id: number;
  sellerName?: string;
  sellerSId?: number;
  sellerSKey?: string;
  sellerSSecret?: string;
  sellerSStoreCode?: string;
  sellerTId?: number;
  sellerTKey?: string;
  sellerTSecret?: string;
  sellerTStoreCode?: string;
  active: number;
}
export interface Notification {
  id: number;
  scopeName: string;
  act: string;
  scopeId: number;
  sellerId: number;
  appCode: string;
  createDate: number;
  complete: number;
}

export interface NotificationKey {
  sellerId: number;
  scopeName: string;
  scopeId: number;
}
