import mysql, { ResultSetHeader } from 'mysql2';
import config from 'config';
import log from '../logger';
import { EVarNames } from '../shared/utils/utils';
import { Notification as ENotification, IProduct, IProductSku, Integration, TCredentials } from '../model/db.model';
import { Notification } from '../model/tray.model';

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

export function run(sql: string, values: any[] = []) {
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

export async function getIntegrationByT(tSellerId: number, tAppCode: string) {
  const sql = `SELECT * 
              FROM INTEGRATION 
              WHERE sellerTId = ? 
              AND sellerTStoreCode = ?
              AND active = 1`;

  return (await query(sql, [tSellerId, tAppCode])) as Integration;
}

export async function getIntegrationById(id: number) {
  const sql = `SELECT * 
              FROM INTEGRATION 
              WHERE id = ${id}
              AND active = 1`;

  return (await query(sql)) as Integration;
}

export async function getAllIntegrations() {
  const sql = `SELECT * 
              FROM INTEGRATION 
              WHERE active = 1
              ORDER BY ID`;

  return (await query(sql)) as Integration[];
}

export async function getAllIProducts() {
  const sql = `SELECT * 
              FROM IPRODUCT 
              WHERE state <> D
              ORDER BY ID`;

  return (await query(sql)) as IProduct[];
}

export async function insertIntegration({ storeCode }: { storeCode: string }) {
  const sql = `INSERT INTO INTEGRATION(
              sellerTStoreCode, createDate, active) 
              VALUES(
              ?, now(), 0
            );`;

  return (await run(sql, [storeCode])) as Integration;
}

export async function updateInitialIntegration(integration: Integration) {
  const { sellerName, sellerSKey, sellerSSecret, sellerTStoreAccessCode, sellerTStoreUrl, sellerTStoreCode } =
    integration;
  const sql = `UPDATE INTEGRATION 
  SET 
    sellerName = ?,
    sellerSKey = ?,
    sellerSSecret = ?,
    sellerTStoreAccessCode = ?,
    sellerTStoreUrl = ?,
    active = 1
  WHERE sellerTStoreCode = ?`;

  return (await run(sql, [
    sellerName,
    sellerSKey,
    sellerSSecret,
    sellerTStoreAccessCode,
    sellerTStoreUrl,
    sellerTStoreCode,
  ])) as Integration;
}

export async function insertNotification(notification: Notification, integrationId: number) {
  const sql = `INSERT INTO NOTIFICATION(
                scopeName, act, scopeId, sellerId, appCode, storeUrl, integrationId, createDate, complete) 
              VALUES(
                ?, ?, ?, ?, ?, ?, ?, now(), 0
            );`;

  return (await run(sql, [
    notification.scope_name,
    notification.act,
    notification.scope_id,
    notification.seller_id,
    notification.app_code,
    notification.url_notification,
    integrationId,
  ])) as Object;
}

export async function getOrderedNotifications() {
  const sql = `SELECT * FROM NOTIFICATION ORDER BY sellerId, scopeName, scopeId, createDate`;

  return (await query(sql)) as ENotification[];
}

export async function deleteNotifications(ids: number[]) {
  const params = ids.join(',');
  const sql = `DELETE FROM NOTIFICATION WHERE id IN(${params})`;

  return (await run(sql)) as Object;
}

export async function updateTConnectionDetails(integration: Integration) {
  const sql = `UPDATE INTEGRATION 
  SET 
    sellerTAccessToken = ?,
    sellerTRefreshToken = ?,
    sellerTAccessExpirationDate = ?,
    sellerTRefreshExpirationDate = ?
  WHERE ID = ?`;

  const { sellerTAccessToken, sellerTRefreshToken, sellerTAccessExpirationDate, sellerTRefreshExpirationDate, id } =
    integration;
  return (await run(sql, [
    sellerTAccessToken,
    sellerTRefreshToken,
    sellerTAccessExpirationDate,
    sellerTRefreshExpirationDate,
    id,
  ])) as Object;
}

export async function updateSConnectionDetails(integration: Integration) {
  const sql = `UPDATE INTEGRATION 
  SET 
    sellerSAccessToken = ?,
    sellerSAccessExpirationDate = ?
  WHERE ID = ?`;

  return (await run(sql, [
    integration.sellerSAccessToken,
    integration.sellerSAccessExpirationDate,
    integration.id,
  ])) as Object;
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
  const sql = `INSERT INTO IPRODUCT(
    integrationId, tProductId, sProductId, createDate, state) 
    VALUES(
    ?, ?, ?, now(), 'C'
  );`;
  return (await run(sql, [integrationId, tProductId, sProductId])) as IProduct;
}

export async function getIProductByT({ integrationId, tProductId }: { integrationId: number; tProductId: number }) {
  const sql = `SELECT * 
  FROM IPRODUCT 
  WHERE integrationId = ${integrationId}
  AND tProductId = ${tProductId}
  AND state <> 'D';`;

  return (await query(sql)) as IProduct;
}

export async function getIProductsByIntegration(integrationId: number) {
  const sql = `SELECT * 
  FROM IPRODUCT 
  WHERE integrationId = ${integrationId}
  AND state <> 'D';`;

  return (await query(sql)) as IProduct[];
}

// states: [C, U, D]
export async function updateIProduct({ iProductId, isDeleteState }: { iProductId: number; isDeleteState: boolean }) {
  const sql = `UPDATE IPRODUCT 
  SET 
    updateDate = now(),
    state = ${isDeleteState ? 'D' : 'U'}
  WHERE ID = ${iProductId}`;
  return (await run(sql)) as Object;
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
  const sql = `INSERT INTO IPRODUCT_SKU(
    iProductId, sSkuId, tVariantId, tStock, createDate, state) 
    VALUES(
    ?, ?, ?, ?, now(), 'C'
  );`;
  return (await run(sql, [iProductId, sSkuId, tVariantId, tStock])) as IProductSku;
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
  const sql = `SELECT IPRODUCT_SKU.id, 
    IPRODUCT_SKU.id,  
    IPRODUCT_SKU.iProductId,
    IPRODUCT_SKU.sSkuId, 
    IPRODUCT_SKU.tVariantId, 
    IPRODUCT_SKU.createDate, 
    IPRODUCT_SKU.updateDate, 
    IPRODUCT_SKU.state
  FROM IPRODUCT_SKU 
  INNER JOIN IPRODUCT ON IPRODUCT_SKU.iProductId = IPRODUCT.id
  WHERE IPRODUCT.tProductId = ${tProductId}
  AND IPRODUCT.integrationId = ${integrationId}
  AND IPRODUCT.state <> 'D'
  AND IPRODUCT_SKU.tVariantId = ${tVariantId}
  AND IPRODUCT_SKU.state <> 'D';`;

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
  const sql = `UPDATE IPRODUCT_SKU
  SET 
    updateDate = now(),
    state = ${isDeleteState ? 'D' : 'U'},
    tStock: ${tStock}
  WHERE ID = ${iProductSkuId}`;
  return (await run(sql)) as Object;
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
    ? `UPDATE IPRODUCT_SKU
  SET 
    updateDate = now(),
    state = ${isDeleteState ? 'D' : 'U'},
    tStock: ${tStock}
  WHERE ID = ${iProductId}`
    : `UPDATE IPRODUCT_SKU
  SET 
    updateDate = now(),
    state = ${isDeleteState ? 'D' : 'U'},
  WHERE ID = ${iProductId}`;
  return (await run(sql)) as Object;
}

export async function getIProductSkuByVariant({ tVariantId }: { tVariantId: number }) {
  const sql = `SELECT * 
  FROM IPRODUCT_SKU
  WHERE tVariantId = ${tVariantId}
  AND state <> 'D';`;

  return (await query(sql)) as IProductSku;
}

export async function getIProductSkusByIProduct(iProductId: number) {
  const sql = `SELECT * 
  FROM IPRODUCT_SKU
  WHERE iProductId = ${iProductId}
  AND state <> 'D';`;

  return (await query(sql)) as IProductSku;
}

export async function getIProductSkusByIntegration(integrationId: number) {
  const sql = `SELECT 
    IPRODUCT_SKU.id,
    IPRODUCT_SKU.iProductId,
    IPRODUCT_SKU.sSKuId,
    IPRODUCT_SKU.tVariantId,
    IPRODUCT_SKU.tStock,
    IPRODUCT_SKU.createDate,
    IPRODUCT_SKU.updateDate,
    IPRODUCT_SKU.state
  FROM IPRODUCT_SKU, IPRODUCT, INTEGRATION
  WHERE IPRODUCT_SKU.iProductId = IPRODUCT.id
    AND IPRODUCT_SKU.state <> 'D'
    AND IPRODUCT.state <> 'D'
    AND IPRODUCT.integrationId = INTEGRATION.id
    AND INTEGRATION.active = 1
    AND INTEGRATION.id = ${integrationId}
  ;`;

  return (await query(sql)) as IProductSku;
}
