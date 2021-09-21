import config from 'config';
import sqlite3 from 'sqlite3';
import log from '../logger';
import { Integration } from '../model/db.model';
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

export async function getIntegration(sellerId: number, appCode: string) {
  const sql = `SELECT * 
              FROM INTEGRATION 
              WHERE sellerTId = ? 
              AND sellerTStoreCode = ?`;

  return (await getRow(sql, [sellerId, appCode])) as Integration;
}

export async function insertNotification(notification: Notification) {
  const sql = `INSERT INTO NOTIFICATION(
              id, scopeName, act, scopeId, sellerId, appCode, createDate) 
              VALUES(
              null, $scopeName, $act, $scopeId, $sellerId, $appCode, strftime('%s','now')
            );`;

  return (await run(sql, {
    $scopeName: notification.scope_name,
    $act: notification.act,
    $scopeId: notification.scope_id,
    $sellerId: notification.seller_id,
    $appCode: notification.app_code,
  })) as Object;
}
