import { SBrand as ESBrand } from '../../model/db.model';
import { Brand as SBrand } from '../../model/sm.model';

// 2021-04-01 11:58:21
export function convertStringToUnixTime(dateString: string) {
  const two = dateString.split(' ');
  const date = two[0].split('-');
  const time = two[1].split(':');
  // year, month, day, hour, minute, second
  const dateTimeObject = new Date(
    parseInt(date[0], 10),
    parseInt(date[1], 10),
    parseInt(date[2], 10),
    parseInt(time[0], 10),
    parseInt(time[1], 10),
    parseInt(time[2], 10),
  );
  return Math.floor(dateTimeObject.getTime() / 1000);
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

export function convertSBrandToESBrand(sBrand: SBrand): ESBrand | undefined {
  if (sBrand) {
    return {
      id: sBrand.id,
      name: sBrand.name,
      slug: sBrand.slug,
      seoTitle: sBrand.seo_title,
      seoDescription: sBrand.seo_description,
      seoKeywords: sBrand.seo_keywords,
      createDate: new Date().toISOString(),
      active: 1,
    };
  }
  return undefined;
}

export function convertESBrandToSBrand(esBrand: ESBrand): SBrand {
  return {
    id: esBrand.id,
    name: esBrand.name,
    slug: esBrand.slug,
    seo_title: esBrand.seoTitle,
    seo_description: esBrand.seoDescription,
    seo_keywords: esBrand.seoKeywords,
  };
}
