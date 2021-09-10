import config from 'config';
import sqlite3 from 'sqlite3';
import log from '../logger';

let db: sqlite3.Database;

export function connect(callback: Function) {
  const dbName: string = config.get('dbName');
  const verbose: boolean = config.get('verbose');

  const sqlite = verbose ? sqlite3.verbose() : sqlite3;

  // TODO - database path when in dist folder
  const con = new sqlite.Database(`./${dbName}`, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      log.error(err.message);
    } else {
      log.info(`Connected to ${dbName} database.`);
      callback();
    }
  });
  db = con;
}

export function getSqlite() {
  return db;
}
