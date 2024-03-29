export interface Integration {
  id: number;
  sellerName?: string;
  sellerSKey?: string;
  sellerSSecret?: string;
  sellerSAccessToken?: string;
  sellerSRefreshToken?: string;
  sellerSAccessExpirationDate?: number; // stored in Unix time
  sellerSRefreshExpirationDate?: number;
  sellerTStoreCode: number;
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

export interface Brand_Map {
  id: number;
  sBrandId: number;
  sBrandName: string;
  tBrandId: number;
  tBrandName: string;
  createDate: string;
  updateDate?: string;
  active: number;
}

export interface Category_Map {
  id: number;
  sCategoryId: number;
  sCategoryName: string;
  tCategoryId: number;
  tCategoryName: string;
  createDate: string;
  updateDate?: string;
  active: number;
}
export interface SBrand {
  id: number; // internal brand id
  brandId: number; // external brand id
  name: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  createDate: string;
  updateDate?: string;
  tBrandId?: number;
  active: number;
}

export interface SCategory {
  id: number; // internal category id
  categoryId: number; // external category id
  parentId: number;
  referenceCode: string;
  name: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoH1: string;
  description: string;
  imageUrl: string;
  createDate: string;
  updateDate?: string;
  active: boolean;
  fsActive: number;
  tCategoryId?: number;
}

export interface TBrand {
  id: number; // internal brand id
  brandId: number; // external brand id
  slug: string;
  brand: string;
  createDate: string;
  updateDate?: string;
  active: number;
}

export interface TCategory {
  id: number; // internal category id
  categoryId: number; // external category id
  parentId: number;
  name: string;
  description: string;
  smallDescription: string;
  tOrder: number;
  // slug: string;
  // title: string;
  hasProduct: number;
  imageUrl: string; // Converted field from Tray api to match with SM
  createDate: string;
  updateDate?: string;
  active: number;
  fsActive: number;
}

export interface RecordKey {
  id: number;
}

export interface BrandSyncData {
  sId: number;
  sBrandId: number;
  sName: string;
  sActive: number;
  tId: number;
  tBrandId: number;
  tBrand: string;
  tActive: number;
}

export interface CategorySyncData {
  sId: number;
  sCategoryId: number;
  sName: string;
  sFsActive: number;
  tId: number;
  tCategoryId: number;
  tName: string;
  tFsActive: number;
}

export interface AffectedRows {
  affectedRows: number;
}

export interface IError {
  id: number;
  errorMessage: string;
  createDate: string;
  updateDate?: string;
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

export function isValidSmDbBrand(object: any) {
  return !!(
    typeof object.id === 'number' &&
    object.brandId &&
    object.name &&
    object.slug &&
    object.createDate &&
    typeof object.active === 'number'
  );
}

export function isValidSmDbCategory(object: any) {
  return !!(
    typeof object.id === 'number' &&
    typeof object.categoryId === 'number' &&
    typeof object.parentId === 'number' &&
    object.name &&
    object.slug &&
    typeof object.active === 'number' &&
    object.createDate &&
    typeof object.fsActive === 'number'
  );
}

export function isValidTrayDbCategory(object: any) {
  return !!(
    typeof object.id === 'number' &&
    typeof object.categoryId === 'number' &&
    // typeof object.parentId === 'number' &&
    object.name &&
    // object.slug &&
    typeof object.active === 'number' &&
    object.createDate &&
    typeof object.fsActive === 'number'
  );
}

export function isValidTrayDbBrand(object: any) {
  return !!(
    typeof object.id === 'number' &&
    typeof object.brandId === 'number' &&
    object.brand &&
    object.slug &&
    object.createDate &&
    typeof object.active === 'number'
  );
}
