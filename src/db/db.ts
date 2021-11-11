import config from 'config';
import sqlite3 from 'sqlite3';
import log from '../logger';
import { Notification as ENotification, Integration, TDetails } from '../model/db.model';
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
  log.info(`Running get sql: ${sql} with params: ${params}`);
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
  log.info(`Running sql: ${sql} with params: ${JSON.stringify(params)}`);
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
  log.info(`Running sql: ${sql} with params: ${JSON.stringify(params)}`);
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
              AND sellerTStoreCode = ?`;

  return (await getRow(sql, [tSellerId, tAppCode])) as Integration;
}

export async function getIntegrationById(id: number) {
  const sql = `SELECT * 
              FROM INTEGRATION 
              WHERE id = ${id}`;

  return (await getRow(sql)) as Integration;
}

export async function getIntegrations() {
  const sql = `SELECT * 
              FROM INTEGRATION 
              ORDER BY ID`;

  return (await all(sql)) as Integration[];
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

export async function getTDetails() {
  const sql = `SELECT * FROM T_DETAILS WHERE ID = 1`;
  return (await getRow(sql)) as TDetails;
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
    sellerSAccessExpirationDate = $accessExpirationDate,
  WHERE ID = $id`;
  return (await run(sql, {
    $id: integration.id,
    $accessToken: integration.sellerSAccessToken,
    $accessExpirationDate: integration.sellerSAccessExpirationDate,
  })) as Object;
}
