import mysql, { ResultSetHeader } from 'mysql2';
import config from 'config';
import log from '../logger';
import { EVarNames } from '../shared/utils/utils';
import {
  AffectedRows,
  Brand_Map,
  Category_Map,
  Notification as ENotification,
  SBrand as ESBrand,
  SCategory as ESCategory,
  TBrand as ETBrand,
  TCategory as ETCategory,
  IError,
  IProduct,
  IProductSku,
  Integration,
  RecordKey,
  TBrand,
} from '../model/db.model';
import { Notification, Brand as TrayBrand } from '../model/tray.model';
import { Brand as SBrand, Category as SCategory } from '../model/sm.model';

let connectionPool: mysql.Pool;

export function createConnectionPool(callback?: Function): void {
  const dbName: string = config.get(EVarNames.DB_NAME);
  const dbUser: string = config.get(EVarNames.DB_USER);
  const dbPassword: string = config.get(EVarNames.DB_PASSWORD);
  const dbHost: string = config.get(EVarNames.DB_HOST);

  const dbOptions = {
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
  try {
    connectionPool = mysql.createPool(dbOptions);

    log.info(`Connected to ${dbName} MYSQL database.`);
    callback && callback();
  } catch (err) {
    log.error(`Error creating connection pool: ${err}`);
  }
}

export function getConnectionFromPool(): mysql.Pool {
  if (!connectionPool) {
    createConnectionPool(getConnectionFromPool);
  }

  return connectionPool;
}

export function query(sql: string, params: any[] = []) {
  log.debug(`Running query: ${sql} with params: ${params}`);
  return new Promise((resolve, reject) => {
    getConnectionFromPool().query(sql, params, (err, result) => {
      if (err) {
        log.error(`Error running query: ${sql} with error ${err}`);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// retrieveById(id: number): Promise<T> {
//   return new Promise((resolve, reject) => {
//     connection.query(
//       `SELECT * FROM ${T.name} WHERE id = ?`,
//       [id],
//       (err, res) => {
//         if (err) reject(err);
//         else resolve(res?.[0]);
//       }
//     );
//   });
// }

export function insert(sql: string, values: any[] = []) {
  log.debug(`Running: ${sql} with values: ${JSON.stringify(values)}`);
  return new Promise((resolve, reject) => {
    getConnectionFromPool().query<ResultSetHeader>(sql, values, (err, res) => {
      if (err) {
        log.error(`Error running: ${sql} with error ${err}`);
        reject(err);
      } else {
        resolve({ id: res.insertId });
      }
    });
  });
}

export function upLete(sql: string, values: any[] = []) {
  log.debug(`Running: ${sql} with values: ${JSON.stringify(values)}`);
  return new Promise((resolve, reject) => {
    getConnectionFromPool().query<ResultSetHeader>(sql, values, (err, res) => {
      if (err) {
        log.error(`Error running: ${sql} with error ${err}`);
        reject(err);
      } else {
        resolve({ affectedRows: res.affectedRows });
      }
    });
  });
}

export async function getIntegrationByStoreCode(storeCode: number) {
  const sql = `SELECT * 
              FROM Integration 
              WHERE sellerTStoreCode = ?
              AND active = 1`;

  return (await query(sql, [storeCode])) as Integration[];
}

export async function getIntegrationById(id: number) {
  const sql = `SELECT * 
              FROM Integration 
              WHERE id = ${id}
              AND active = 1`;

  return (await query(sql)) as Integration[];
}

export async function getAllActiveIntegrations() {
  const sql = `SELECT * 
              FROM Integration 
              WHERE active = 1
              ORDER BY ID`;

  return (await query(sql)) as Integration[];
}

export async function getAllIProducts() {
  const sql = `SELECT * 
              FROM IProduct 
              WHERE state <> D
              ORDER BY ID`;

  return (await query(sql)) as IProduct[];
}

export async function insertIntegration({ storeCode }: { storeCode: number }) {
  const sql = `INSERT INTO Integration(
              sellerTStoreCode, createDate, active) 
              VALUES(
              ?, now(), 0
            );`;

  return (await insert(sql, [storeCode])) as RecordKey;
}

// TODO think of the lifecycle of this
export async function insertIError({ errorMessage }: { errorMessage: string }) {
  const sql = `INSERT INTO IError(
              message, createDate) 
              VALUES(
              ?, now()
            );`;

  return (await insert(sql, [errorMessage])) as RecordKey;
}

export async function updateIntegrationByStoreCode(integration: Integration) {
  const { sellerName, sellerSKey, sellerSSecret, sellerTStoreAccessCode, sellerTStorePath, sellerTStoreCode } =
    integration;
  const sql = `UPDATE Integration 
  SET 
    sellerName = ?,
    sellerSKey = ?,
    sellerSSecret = ?,
    sellerTStoreAccessCode = ?,
    sellerTStorePath = ?,
    active = 1
  WHERE sellerTStoreCode = ?`;

  return (await upLete(sql, [
    sellerName,
    sellerSKey,
    sellerSSecret,
    sellerTStoreAccessCode,
    sellerTStorePath,
    sellerTStoreCode,
  ])) as AffectedRows;
}

export async function insertNotification(notification: Notification, integrationId: number) {
  log.warn(`insertNotification, int id: ${integrationId}`);
  const sql = `INSERT INTO Notification(
                scopeName, act, scopeId, sellerId, integrationId, createDate, complete) 
              VALUES(
                ?, ?, ?, ?, ?, now(), 0
            );`;

  return (await insert(sql, [
    notification.scope_name,
    notification.act,
    notification.scope_id,
    notification.seller_id,
    integrationId,
  ])) as RecordKey;
}

export async function getOrderedNotifications() {
  const sql = `SELECT * FROM Notification ORDER BY sellerId, scopeName, scopeId, createDate`;

  return (await query(sql)) as ENotification[];
}

export async function deleteNotifications(ids: number[]) {
  const params = ids.join(',');
  const sql = `DELETE FROM Notification WHERE id IN(${params})`;

  return (await upLete(sql)) as AffectedRows;
}

export async function updateTConnectionDetails(integration: Integration) {
  const sql = `UPDATE Integration 
  SET 
    sellerTAccessToken = ?,
    sellerTRefreshToken = ?,
    sellerTAccessExpirationDate = ?,
    sellerTRefreshExpirationDate = ?
  WHERE ID = ?`;

  const { sellerTAccessToken, sellerTRefreshToken, sellerTAccessExpirationDate, sellerTRefreshExpirationDate, id } =
    integration;
  return (await upLete(sql, [
    sellerTAccessToken,
    sellerTRefreshToken,
    sellerTAccessExpirationDate,
    sellerTRefreshExpirationDate,
    id,
  ])) as AffectedRows;
}

export async function updateSConnectionDetails(integration: Integration) {
  const sql = `UPDATE Integration 
  SET 
    sellerSAccessToken = ?,
    sellerSAccessExpirationDate = ?
  WHERE ID = ?`;

  return (await upLete(sql, [
    integration.sellerSAccessToken,
    integration.sellerSAccessExpirationDate,
    integration.id,
  ])) as AffectedRows;
}

export async function createIProduct({
  integrationId,
  tProductId,
  sProductId,
}: {
  integrationId: number;
  tProductId: number;
  sProductId: number;
}) {
  const sql = `INSERT INTO IProduct(
    integrationId, tProductId, sProductId, createDate, state) 
    VALUES(
    ?, ?, ?, now(), 'C'
  );`;
  return (await insert(sql, [integrationId, tProductId, sProductId])) as RecordKey;
}

export async function getIProductByT({ integrationId, tProductId }: { integrationId: number; tProductId: number }) {
  const sql = `SELECT * 
  FROM IProduct 
  WHERE integrationId = ${integrationId}
  AND tProductId = ${tProductId}
  AND state <> 'D';`;

  return (await query(sql)) as IProduct;
}

export async function getIProductById(id: number) {
  const sql = `SELECT * 
  FROM IProduct 
  WHERE id = ${id}
  AND state <> 'D';`;

  return (await query(sql)) as IProduct;
}

export async function getIProductsByIntegration(integrationId: number) {
  const sql = `SELECT * 
  FROM IProduct 
  WHERE integrationId = ${integrationId}
  AND state <> 'D';`;

  return (await query(sql)) as IProduct[];
}

// states: [C, U, D]
export async function updateIProduct({ iProductId, isDeleteState }: { iProductId: number; isDeleteState: boolean }) {
  const sql = `UPDATE IProduct 
  SET 
    updateDate = now(),
    state = ${isDeleteState ? 'D' : 'U'}
  WHERE ID = ${iProductId}`;
  return (await upLete(sql)) as AffectedRows;
}

export async function createIProductSku({
  iProductId,
  sSkuId,
  tVariantId,
  tStock,
}: {
  iProductId: number;
  sSkuId: number;
  tVariantId: number;
  tStock: number;
}) {
  const sql = `INSERT INTO IProduct_SKU(
    iProductId, sSkuId, tVariantId, tStock, createDate, state) 
    VALUES(
    ?, ?, ?, ?, now(), 'C'
  );`;
  return (await insert(sql, [iProductId, sSkuId, tVariantId, tStock])) as RecordKey;
}

export async function getIProductSkuByT({
  integrationId,
  tProductId,
  tVariantId,
}: {
  integrationId: number;
  tProductId: number;
  tVariantId: number;
}) {
  const sql = `SELECT IProduct_SKU.id, 
    IProduct_SKU.id,  
    IProduct_SKU.iProductId,
    IProduct_SKU.sSkuId, 
    IProduct_SKU.tVariantId, 
    IProduct_SKU.createDate, 
    IProduct_SKU.updateDate, 
    IProduct_SKU.state
  FROM IProduct_SKU 
  INNER JOIN IProduct ON IProduct_SKU.iProductId = IProduct.id
  WHERE IProduct.tProductId = ${tProductId}
  AND IProduct.integrationId = ${integrationId}
  AND IProduct.state <> 'D'
  AND IProduct_SKU.tVariantId = ${tVariantId}
  AND IProduct_SKU.state <> 'D';`;

  return (await query(sql)) as IProductSku;
}

// states: [C, U, D]
export async function updateIProductSku({
  iProductSkuId,
  isDeleteState,
  tStock,
}: {
  iProductSkuId: number;
  isDeleteState: boolean;
  tStock: number;
}) {
  const sql = `UPDATE IProduct_SKU
  SET 
    updateDate = now(),
    state = ${isDeleteState ? 'D' : 'U'},
    tStock: ${tStock}
  WHERE ID = ${iProductSkuId}`;
  return (await upLete(sql)) as AffectedRows;
}

// states: [C, U, D]
export async function updateIProductSkuByIProduct({
  iProductId,
  isDeleteState,
  tStock,
}: {
  iProductId: number;
  isDeleteState: boolean;
  tStock?: number;
}) {
  const sql = tStock
    ? `UPDATE IProduct_SKU
  SET 
    updateDate = now(),
    state = ${isDeleteState ? 'D' : 'U'},
    tStock: ${tStock}
  WHERE ID = ${iProductId}`
    : `UPDATE IProduct_SKU
  SET 
    updateDate = now(),
    state = ${isDeleteState ? 'D' : 'U'},
  WHERE ID = ${iProductId}`;
  return (await upLete(sql)) as AffectedRows;
}

export async function getIProductSkuByVariant({ tVariantId }: { tVariantId: number }) {
  const sql = `SELECT * 
  FROM IProduct_SKU
  WHERE tVariantId = ${tVariantId}
  AND state <> 'D';`;

  return (await query(sql)) as IProductSku;
}

export async function getBrandMapByTName({ tBrandName }: { tBrandName: string }) {
  const sql = `SELECT *
  FROM Brand_Map
  WHERE UPPER(sBrandName) = UPPER(${tBrandName})
  AND active = 1;`;

  return (await query(sql)) as Brand_Map;
}

export async function getCategoryMapByTId({ tCategoryId }: { tCategoryId: number }) {
  const sql = `SELECT *
  FROM Category_Map
  WHERE sCategoryId = ${tCategoryId}
  AND active = 1;`;

  return (await query(sql)) as Category_Map;
}

export async function getCategoryMapByTName({ tCategoryName }: { tCategoryName: string }) {
  const sql = `SELECT *
  FROM Category_Map
  WHERE UPPER(sCategoryName) = UPPER(${tCategoryName})
  AND active = 1;`;

  return (await query(sql)) as Category_Map;
}

export async function getIProductSkusByIProduct(iProductId: number) {
  const sql = `SELECT * 
  FROM IProduct_SKU
  WHERE iProductId = ${iProductId}
  AND state <> 'D';`;

  return (await query(sql)) as IProductSku;
}

export async function getSBrandsByActiveState({ active }: { active: boolean }) {
  const sql = `SELECT * FROM SBrand 
    WHERE active = ${active ? 1 : 0} 
    ORDER BY brandId;`;

  return (await query(sql)) as ESBrand[];
}

export async function getAllSBrands() {
  const sql = `SELECT * FROM SBrand 
    ORDER BY brandId;`;

  return (await query(sql)) as ESBrand[];
}

export async function getSCategoriesByActiveState({ active }: { active: boolean }) {
  const sql = `SELECT * FROM SCategory 
    WHERE active = ${active ? 1 : 0} 
    ORDER BY categoryId;`;

  return (await query(sql)) as ESCategory[];
}

export async function getAllSCategories() {
  const sql = `SELECT * FROM SCategory 
    ORDER BY categoryId;`;

  return (await query(sql)) as ESCategory[];
}

export async function getTBrandsByActiveState({ active }: { active: boolean }) {
  const sql = `SELECT * FROM TBrand 
    WHERE active = ${active ? 1 : 0} 
    ORDER BY brandId;`;

  return (await query(sql)) as ETBrand[];
}

export async function getAllTBrands() {
  const sql = `SELECT * FROM TBrand 
    ORDER BY brandId;`;

  return (await query(sql)) as ETBrand[];
}

export async function getTCategoriesByActiveState({ active }: { active: boolean }) {
  const sql = `SELECT * FROM TCategory 
    WHERE active = ${active ? 1 : 0} 
    ORDER BY categoryId;`;

  return (await query(sql)) as ETCategory[];
}

export async function getAllTCategories() {
  const sql = `SELECT * FROM TCategory 
    ORDER BY categoryId;`;

  return (await query(sql)) as ETCategory[];
}

export async function insertSBrand({ sBrand }: { sBrand: SBrand }) {
  const { id, name, slug, seo_title, seo_description, seo_keywords } = sBrand;
  const sql = `INSERT INTO SBrand(
    brandId,
    name, 
    slug, 
    seoTitle, 
    seoDescription, 
    seoKeywords, 
    createDate, 
    active) 
    VALUES(
    ?, ?, ?, ?, ?, ?, now(), 1
  );`;

  return (await insert(sql, [id, name, slug, seo_title, seo_description, seo_keywords])) as RecordKey;
}

export async function insertSCategory({ sCategory }: { sCategory: SCategory }) {
  const { id, parent_id, referenceCode, name, slug, seo_title, seo_description, seo_keywords, seo_h1, description, image_url, active } = sCategory;
  const sql = `INSERT INTO SCategory(
    categoryId,
    parentId,
    referenceCode,
    name, 
    slug, 
    seoTitle, 
    seoDescription, 
    seoKeywords, 
    seoH1,
    description,
    imageUrl,
    active,
    createDate, 
    fsActive) 
    VALUES(
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), 1
  );`;

  return (await insert(sql, [id, parent_id, referenceCode, name, slug, seo_title,
    seo_description, seo_keywords, seo_h1, description, image_url, active])) as RecordKey;
}

export async function getSBrandById(id: number) {
  const sql = `SELECT * 
              FROM SBrand 
              WHERE id = ${id}`;

  return (await query(sql)) as ESBrand[];
}

export async function getSCategoryById(id: number) {
  const sql = `SELECT * 
              FROM SCategory 
              WHERE id = ${id}`;

  return (await query(sql)) as ESCategory[];
}

export async function getSCategoryByCategoryId(categoryId: number) {
  const sql = `SELECT * 
              FROM SCategory 
              WHERE categoryId = ${categoryId}`;

  return (await query(sql)) as ESCategory[];
}

export async function getSBrandByBrandId(brandId: number) {
  const sql = `SELECT * 
              FROM SBrand 
              WHERE brandId = ${brandId}`;

  return (await query(sql)) as ESBrand[];
}

export async function insertTBrand({ tBrand }: { tBrand: TBrand }) {
  const { id, brand, slug } = tBrand;
  const sql = `INSERT INTO TBrand(
    brandId,
    brand, 
    slug, 
    createDate, 
    active) 
    VALUES(
    ?, ?, ?, now(), 1
  );`;

  return (await insert(sql, [id, brand, slug])) as RecordKey;
}

export async function getTBrandById(id: number) {
  const sql = `SELECT * 
              FROM TBrand 
              WHERE id = ${id}`;

  return (await query(sql)) as ETBrand[];
}

export async function getTBrandByBrandId(brandId: number) {
  const sql = `SELECT * 
              FROM TBrand 
              WHERE brandId = ${brandId}`;

  return (await query(sql)) as ETBrand[];
}

export async function updateSBrand({ sBrand }: { sBrand: SBrand }) {
  const { id, name, slug, seo_title, seo_description, seo_keywords } = sBrand;
  const sql = `UPDATE SBrand 
  SET 
    name = ?,
    slug = ?,
    seoTitle = ?,
    seoDescription = ?,
    seoKeywords = ?,
    updateDate = now(),
    active = 1
  WHERE brandId = ?`;

  return (await upLete(sql, [name, slug, seo_title, seo_description, seo_keywords, id])) as AffectedRows;
}

export async function updateSCategory({ sCategory }: { sCategory: SCategory }) {
  const { id, parent_id, referenceCode, name, slug, seo_title, seo_description, seo_keywords, seo_h1, description, image_url, active } = sCategory;
  const sql = `UPDATE SCategory 
  SET 
    name = ?,
    parentId = ?,
    slug = ?,
    referenceCode = ?,
    description = ?,
    imageUrl = ?,
    seoTitle = ?,
    seoDescription = ?,
    seoKeywords = ?,
    seoH1 = ?,
    active = ?,
    updateDate = now(),
    fsActive = ?
  WHERE categoryId = ?`;

  return (await upLete(sql, [name, parent_id, slug, referenceCode, description, image_url,
    seo_title, seo_description, seo_keywords, seo_h1, active, active ? 1 : 0, id])) as AffectedRows;
}

export async function updateSBrandByBrand({ dbBrand }: { dbBrand: ESBrand }) {
  const { id, name, slug, seoTitle, seoDescription, seoKeywords, active } = dbBrand;
  const sql = `UPDATE SBrand 
  SET 
    name = ?,
    slug = ?,
    seoTitle = ?,
    seoDescription = ?,
    seoKeywords = ?,
    updateDate = now(),
    active = ?
  WHERE id = ?`;

  return (await upLete(sql, [name, slug, seoTitle, seoDescription, seoKeywords, active, id])) as AffectedRows;
}



export async function updateSBrandStatus({ id, active }: { id: number, active: number }) {

  const sql = `UPDATE SBrand 
  SET 
    updateDate = now(),
    active = ?
  WHERE id = ?`;

  return (await upLete(sql, [active, id])) as AffectedRows;
}

export async function updateTBrand({ tBrand }: { tBrand: TrayBrand }) {
  const { id, brand, slug } = tBrand;
  const sql = `UPDATE TBrand 
  SET 
    brand = ?,
    slug = ?,
    updateDate = now(),
    active = 1
  WHERE brandId = ?`;

  return (await upLete(sql, [brand, slug, id])) as AffectedRows;
}

export async function updateTBrandByBrand({ dbBrand }: { dbBrand: ETBrand }) {
  const { id, brand, slug, active } = dbBrand;
  const sql = `UPDATE TBrand 
  SET 
    brand = ?,
    slug = ?,
    updateDate = now(),
    active = ?
  WHERE id = ?`;

  return (await upLete(sql, [brand, slug, active, id])) as AffectedRows;
}

export async function deleteSBrand(id: number) {
  const sql = `DELETE FROM SBrand WHERE id = ${id}`;

  return (await upLete(sql)) as AffectedRows;
}

export async function deleteTBrand(id: number) {
  const sql = `DELETE FROM TBrand WHERE id = ${id}`;

  return (await upLete(sql)) as AffectedRows;
}

export async function getIProductSkusByIntegration(integrationId: number) {
  const sql = `SELECT 
    IProduct_SKU.id,
    IProduct_SKU.iProductId,
    IProduct_SKU.sSKuId,
    IProduct_SKU.tVariantId,
    IProduct_SKU.tStock,
    IProduct_SKU.createDate,
    IProduct_SKU.updateDate,
    IProduct_SKU.state
  FROM IProduct_SKU, IProduct, Integration
  WHERE IProduct_SKU.iProductId = IProduct.id
    AND IProduct_SKU.state <> 'D'
    AND IProduct.state <> 'D'
    AND IProduct.integrationId = Integration.id
    AND Integration.active = 1
    AND Integration.id = ${integrationId}
  ;`;

  return (await query(sql)) as IProductSku[];
}
