import { SBrand as ESBrand } from '../../model/db.model';
import { Brand as SBrand } from '../../model/sm.model';

// 2021-04-01 11:58:21
export function convertStringToUnixTime(dateString: string) {
  const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  if (!regex.test(dateString)) {
    throw new Error('Invalid date format. Expected format is YYYY-MM-DD HH:MM:SS');
  }

  const two = dateString.split(' '); // date from time
  const date = two[0].split('-'); // year, month, day
  const time = two[1].split(':'); // hour, minute, second
  // year, month, day, hour, minute, second
  const dateTimeObject = new Date(
    parseInt(date[0], 10), // year
    parseInt(date[1], 10) - 1, // month
    parseInt(date[2], 10), // day
    parseInt(time[0], 10), // hour
    parseInt(time[1], 10), // minute
    parseInt(time[2], 10), // second
  );
  return Math.floor(dateTimeObject.getTime() / 1000);
}

export function convertUnixTimeToStringDate(unixTime: number) {
  const dateObject = new Date(unixTime * 1000); // JavaScript uses milliseconds

  const year = dateObject.getUTCFullYear();
  const month = ('0' + (dateObject.getUTCMonth() + 1)).slice(-2); // Months are 0-indexed
  const day = ('0' + dateObject.getUTCDate()).slice(-2);
  const hours = ('0' + dateObject.getUTCHours()).slice(-2);
  const minutes = ('0' + dateObject.getUTCMinutes()).slice(-2);
  const seconds = ('0' + dateObject.getUTCSeconds()).slice(-2);

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Unix time
export function addToCurrentTime(seconds: number) {
  const now = Math.floor(Date.now() / 1000); // Unix time is Seconds since 01-01-70
  return now + seconds;
}

export function getCurrentUnixTime() {
  // Date.now(); milliseconds elapsed since January 1, 1970
  const now = Math.floor(Date.now() / 1000); // Unix time is Seconds since 01-01-70
  return now;
}

export enum EVarNames {
  PORT = 'PORT',
  HOST = 'HOST',
  DB_NAME = 'DB_NAME',
  DB_USER = 'DB_USER',
  DB_PASSWORD = 'DB_PASSWORD',
  DB_HOST = 'DB_HOST',
  VERBOSE = 'VERBOSE',
  SM_BASE_URL = 'S_BASE_URL',
  SM_MONITOR_INTERVAL = 'S_MONITOR_INTERVAL',
  TRAY_BASE_URL = 'T_BASE_URL',
  TRAY_MONITOR_INTERVAL = 'T_MONITOR_INTERVAL',
  TRAY_KEY = 'T_KEY',
  TRAY_SECRET = 'T_SECRET',
  PASS_KEY = 'PASS_KEY',
}

// export function convertSBrandToESBrand(sBrand: SBrand): ESBrand | undefined {
//   if (sBrand) {
//     return {
//       brandId: sBrand.id,
//       name: sBrand.name,
//       slug: sBrand.slug,
//       seoTitle: sBrand.seo_title,
//       seoDescription: sBrand.seo_description,
//       seoKeywords: sBrand.seo_keywords,
//       createDate: new Date().toISOString(),
//       active: 1,
//     };
//   }
//   return undefined;
// }

// export function convertESBrandToSBrand(esBrand: ESBrand): SBrand {
//   return {
//     id: esBrand.brandId,
//     name: esBrand.name,
//     slug: esBrand.slug,
//     seo_title: esBrand.seoTitle,
//     seo_description: esBrand.seoDescription,
//     seo_keywords: esBrand.seoKeywords,
//   };
// }
