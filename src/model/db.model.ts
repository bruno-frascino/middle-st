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
