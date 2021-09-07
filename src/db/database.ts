import config from 'config';
import sqlite3 from 'sqlite3';
import log from '../logger';

let db;

export function connect() {
  const dbName: string = config.get('dbName');

  const dbVerbose = sqlite3.verbose();

  db = new dbVerbose.Database(`./${dbName}`, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      log.error(err.message);
    } else {
      log.info(`Connected to ${dbName} database.`);
    }
  });
}
