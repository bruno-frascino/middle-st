import config from 'config';
import sqlite3 from 'sqlite3';
import log from '../logger';
import { Integration } from '../model/db.model';

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

export async function getIntegration(sellerId: number, appCode: string) {
  const sql = `SELECT * 
              FROM INTEGRATION 
              WHERE sellerTId = ? 
              AND sellerTStoreCode = ?`;

  return (await getRow(sql, [sellerId, appCode])) as Integration;
}
