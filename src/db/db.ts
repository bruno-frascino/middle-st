import config from 'config';
import sqlite3 from 'sqlite3';
import log from '../logger';
import { Notification as ENotification, IProduct, IProductSku, Integration, TCredentials } from '../model/db.model';
import { Notification } from '../model/tray.model';

let db: sqlite3.Database;

export function connect(callback?: Function) {
  const dbName: string = config.get('dbName');
  const verbose: boolean = config.get('verbose');

  const sqlite = verbose ? sqlite3.verbose() : sqlite3;

  // TODO - database path when in dist folder
  db = new sqlite.Database(`./${dbName}`, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      log.error(err.message);
    } else {
      log.info(`Connected to ${dbName} database.`);
      callback && callback();
    }
  });
}

export function getInstance() {
  if (!db) {
    connect(getInstance);
  }
  return db;
}

export function getRow(sql: string, params: any[] = []) {
  log.debug(`Running get sql: ${sql} with params: ${params}`);
  return new Promise((resolve, reject) => {
    getInstance().get(sql, params, (err, result) => {
      if (err) {
        log.error(`Error running get sql: ${sql} with error ${err}`);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export function run(sql: string, params: {} = {}) {
  log.debug(`Running sql: ${sql} with params: ${JSON.stringify(params)}`);
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line func-names
    getInstance().run(sql, params, function (err) {
      if (err) {
        log.error(`Error running sql: ${sql} with error ${err}`);
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
  });
}

export function all(sql: string, params: {} = {}) {
  log.debug(`Running sql: ${sql} with params: ${JSON.stringify(params)}`);
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line func-names
    getInstance().all(sql, params, (err, rows) => {
      if (err) {
        log.error(`Error running sql: ${sql} with error ${err}`);
        reject(err);
      } else {
        resolve(rows);
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

  return (await getRow(sql, [tSellerId, tAppCode])) as Integration;
}

export async function getIntegrationById(id: number) {
  const sql = `SELECT * 
              FROM INTEGRATION 
              WHERE id = ${id}
              AND active = 1`;

  return (await getRow(sql)) as Integration;
}

export async function getAllIntegrations() {
  const sql = `SELECT * 
              FROM INTEGRATION 
              WHERE active = 1
              ORDER BY ID`;

  return (await all(sql)) as Integration[];
}

export async function getAllIProducts() {
  const sql = `SELECT * 
              FROM IPRODUCT 
              WHERE state <> D
              ORDER BY ID`;

  return (await all(sql)) as IProduct[];
}

export async function insertNotification(notification: Notification, integrationId: number) {
  const sql = `INSERT INTO NOTIFICATION(
              id, scopeName, act, scopeId, sellerId, appCode, storeUrl, integrationId, createDate, complete) 
              VALUES(
              null, $scopeName, $act, $scopeId, $sellerId, $appCode, $storeUrl, $integrationId, strftime('%s','now'), 0
            );`;

  return (await run(sql, {
    $scopeName: notification.scope_name,
    $act: notification.act,
    $scopeId: notification.scope_id,
    $sellerId: notification.seller_id,
    $appCode: notification.app_code,
    $storeUrl: notification.url_notification,
    $integrationId: integrationId,
  })) as Object;
}

export async function getOrderedNotifications() {
  const sql = `SELECT * FROM NOTIFICATION ORDER BY sellerId, scopeName, scopeId, createDate`;

  return (await all(sql)) as ENotification[];
}

export async function deleteNotifications(ids: number[]) {
  const params = ids.join(',');
  const sql = `DELETE FROM NOTIFICATION WHERE id IN(${params})`;

  return (await run(sql)) as Object;
}

export async function getTCredentials() {
  const sql = `SELECT * FROM T_CREDENTIALS WHERE ID = 1`;
  return (await getRow(sql)) as TCredentials;
}

export async function updateTConnectionDetails(integration: Integration) {
  const sql = `UPDATE INTEGRATION 
  SET 
    sellerTAccessToken = $accessToken,
    sellerTRefreshToken = $refreshToken,
    sellerTAccessExpirationDate = $accessExpirationDate,
    sellerTRefreshExpirationDate = $refreshExpirationDate
  WHERE ID = $id`;
  return (await run(sql, {
    $id: integration.id,
    $accessToken: integration.sellerTAccessToken,
    $refreshToken: integration.sellerTRefreshToken,
    $accessExpirationDate: integration.sellerTAccessExpirationDate,
    $refreshExpirationDate: integration.sellerTRefreshExpirationDate,
  })) as Object;
}

export async function updateSConnectionDetails(integration: Integration) {
  const sql = `UPDATE INTEGRATION 
  SET 
    sellerSAccessToken = $accessToken,
    sellerSAccessExpirationDate = $accessExpirationDate
  WHERE ID = $id`;
  return (await run(sql, {
    $id: integration.id,
    $accessToken: integration.sellerSAccessToken,
    $accessExpirationDate: integration.sellerSAccessExpirationDate,
  })) as Object;
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
    id, integrationId, tProductId, sProductId, createDate, state) 
    VALUES(
    null, $integrationId, $tProductId, $sProductId, strftime('%s','now'), 'C'
  );`;
  return (await run(sql, {
    $integrationId: integrationId,
    $tProductId: tProductId,
    $sProductId: sProductId,
  })) as IProduct;
}

export async function getIProductByT({ integrationId, tProductId }: { integrationId: number; tProductId: number }) {
  const sql = `SELECT * 
  FROM IPRODUCT 
  WHERE integrationId = ${integrationId}
  AND tProductId = ${tProductId}
  AND state <> 'D';`;

  return (await getRow(sql)) as IProduct;
}

export async function getIProductsByIntegration(integrationId: number) {
  const sql = `SELECT * 
  FROM IPRODUCT 
  WHERE integrationId = ${integrationId}
  AND state <> 'D';`;

  return (await getRow(sql)) as IProduct[];
}

// states: [C, U, D]
export async function updateIProduct({ iProductId, isDeleteState }: { iProductId: number; isDeleteState: boolean }) {
  const sql = `UPDATE IPRODUCT 
  SET 
    updateDate = strftime('%s','now'),
    state = ${isDeleteState ? 'D' : 'U'}
  WHERE ID = $id`;
  return (await run(sql, {
    $id: iProductId,
  })) as Object;
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
    id, iProductId, sSkuId, tVariantId, tStock, createDate, state) 
    VALUES(
    null, $iProductId, $sSkuId, $tVariantId, $tStock, strftime('%s','now'), 'C'
  );`;
  return (await run(sql, {
    $iProductId: iProductId,
    $sSkuId: sSkuId,
    $tVariantId: tVariantId,
    $tStock: tStock,
  })) as IProductSku;
}

// export async function getIProductSkuByT({ iProductId, tVariantId }: { iProductId: number; tVariantId: number }) {
//   const sql = `SELECT *
//   FROM IPRODUCT_SKU
//   WHERE iProductId = ${iProductId}
//   AND tVariantId = ${tVariantId}
//   AND state <> 'D';`;

//   return (await getRow(sql)) as IProductSku;
// }

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

  return (await getRow(sql)) as IProductSku;
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
    updateDate = strftime('%s','now'),
    state = ${isDeleteState ? 'D' : 'U'},
    tStock: ${tStock}
  WHERE ID = $id`;
  return (await run(sql, {
    $id: iProductSkuId,
  })) as Object;
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
    updateDate = strftime('%s','now'),
    state = ${isDeleteState ? 'D' : 'U'},
    tStock: ${tStock}
  WHERE ID = $id`
    : `UPDATE IPRODUCT_SKU
  SET 
    updateDate = strftime('%s','now'),
    state = ${isDeleteState ? 'D' : 'U'},
  WHERE ID = $id`;
  return (await run(sql, {
    $id: iProductId,
  })) as Object;
}

export async function getIProductSkuByVariant({ tVariantId }: { tVariantId: number }) {
  const sql = `SELECT * 
  FROM IPRODUCT_SKU
  WHERE tVariantId = ${tVariantId}
  AND state <> 'D';`;

  return (await getRow(sql)) as IProductSku;
}

export async function getIProductSkusByIProduct(iProductId: number) {
  const sql = `SELECT * 
  FROM IPRODUCT_SKU
  WHERE iProductId = ${iProductId}
  AND state <> 'D';`;

  return (await getRow(sql)) as IProductSku;
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

  return (await getRow(sql)) as IProductSku;
}
