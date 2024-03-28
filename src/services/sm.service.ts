import log from '../logger';
import { SBrand as ESBrand, Integration } from '../model/db.model';
import { Brand, Category, Product, Sku, SmToken } from '../model/sm.model';
import { addToCurrentTime, getCurrentUnixTime } from '../shared/utils/utils';
import {
  getSBrandsByActiveState, getAllSBrands,
  getSCategoriesByActiveState, getAllSCategories, insertSBrand,
  updateSBrand, updateSConnectionDetails, getSBrandById,
  getSBrandByBrandId, deleteSBrand, insertSCategory,
  getSCategoryById, updateSCategory, getSCategoryByCategoryId,
  deleteSCategory,
  getIntegrationsByStatus
} from '../db/db';
import {
  deleteProduct,
  deleteSku,
  getBrands,
  getCategories,
  getProduct,
  getSku,
  patchSku,
  postLogin,
  postProduct,
  postRefresh,
  postSku,
  putProduct,
} from '../resources/sm.api';
import { ErrorCategory, MiddleError } from '../shared/errors/MiddleError';
/**
 * All SM services
 */
export async function provideSmAccessToken(integration: Integration): Promise<string> {
  // Required connection details
  const { id, sellerSKey, sellerSSecret, sellerSAccessToken } = integration;
  if (!sellerSKey || !sellerSSecret) {
    const errorMessage = `Integration record: ${id} missing required information`;
    log.error(errorMessage);
    throw new MiddleError(errorMessage, ErrorCategory.BUS);
  }

  let integrationCopy;
  let accessToken;

  // valid connection - no action required
  if (sellerSAccessToken && hasValidToken(integration)) {
    return sellerSAccessToken;
  }

  // First connection has no access token
  if (!sellerSAccessToken) {
    accessToken = await getNewAccessToken({ key: sellerSKey, secret: sellerSSecret });
    // refresh token expired
  } else {
    try {
      accessToken = await getRefreshedToken(sellerSAccessToken);
      // refresh could fail too
    } catch (error) {
      log.error(`Failed to refresh SM token: ${JSON.stringify(error)}`);
      // get a new token then:
      accessToken = await getNewAccessToken({ key: sellerSKey, secret: sellerSSecret });
    }
  }

  // Update record
  // eslint-disable-next-line prefer-const
  integrationCopy = copyToken(integration, accessToken);
  await updateSConnectionDetails(integrationCopy);

  return accessToken.accessToken;
}

function copyToken(integration: Integration, accessToken: SmToken) {
  const integrationCopy = { ...integration };
  integrationCopy.sellerSAccessToken = accessToken.accessToken;
  integrationCopy.sellerSAccessExpirationDate = addToCurrentTime(accessToken.expiresIn); // Unix time
  return integrationCopy;
}

/**
 * Access can get renewed with previous token
 *
 * @param previousAccessToken
 * @returns
 */
async function getRefreshedToken(previousAccessToken: string) {
  return postRefresh(previousAccessToken);
}

/**
 * SM System has access_token expiration date in seconds
 * and no expiration for refreshing it.
 * Refresh can be done at any moment since access_token hasn't expired yet
 * then a new access_token will be provided
 * @param integration
 * @returns
 */
function hasValidToken(integration: Integration) {
  const { sellerSAccessToken, sellerSAccessExpirationDate } = integration;

  if (!sellerSAccessToken || !sellerSAccessExpirationDate) {
    return false;
  }

  const now = getCurrentUnixTime();
  return sellerSAccessExpirationDate && sellerSAccessExpirationDate >= now;
}

async function getNewAccessToken({ key, secret }: { key: string; secret: string }): Promise<SmToken> {
  return postLogin({ key, secret });
}

/**
 *
 * @param product
 * @param notification
 * @returns
 */
export async function createProduct(product: Product, integration: Integration): Promise<Product> {
  const accessToken = await provideSmAccessToken(integration);

  return postProduct({ product, accessToken });
}

/**
 *
 * @param productId
 * @param notification
 * @returns
 */
export async function getSmProductById(productId: number, integration: Integration): Promise<Product> {
  const accessToken = await provideSmAccessToken(integration);

  return getProduct({ productId, accessToken });
}

/**
 *
 * @param product
 * @param notification
 * @returns
 */
export async function updateProduct(product: Product, integration: Integration): Promise<Product> {
  const accessToken = await provideSmAccessToken(integration);

  return putProduct({ product, accessToken });
}

/**
 *
 * @param param0
 * @returns
 */
export async function removeSmProduct({
  productId,
  integration,
}: {
  productId: number;
  integration: Integration;
}): Promise<any> {
  const accessToken = await provideSmAccessToken(integration);

  return deleteProduct({ productId, accessToken });
}

export async function createSmSku({
  productId,
  sku,
  integration,
}: {
  productId: number;
  sku: Sku;
  integration: Integration;
}) {
  const accessToken = await provideSmAccessToken(integration);
  return postSku({ productId, sku, accessToken });
}

export async function updateSmSku({ sku, integration }: { sku: Sku; integration: Integration }) {
  const accessToken = await provideSmAccessToken(integration);
  return patchSku({ sku, accessToken });
}

export async function deleteSmSku({ skuId, integration }: { skuId: number; integration: Integration }) {
  const accessToken = await provideSmAccessToken(integration);
  return deleteSku({ skuId, accessToken });
}

export async function getSmSku({ skuId, integration }: { skuId: number; integration: Integration }) {
  const accessToken = await provideSmAccessToken(integration);
  return getSku({ skuId, accessToken });
}

export async function getFreshSmBrands() {
  const integrations = await getIntegrationsByStatus(1); // active
  // any integration - Brands are independent of sellers
  const accessToken = await provideSmAccessToken(integrations[0]);
  const brandResponse = await getBrands({ accessToken });
  log.info(`Fetched fresh SM Brands: ${JSON.stringify(brandResponse)}`);
  return brandResponse ? brandResponse.data : [];
}

export async function getFreshSmCategories() {
  const integrations = await getIntegrationsByStatus(1); // active
  const accessToken = await provideSmAccessToken(integrations[0]);
  const categoryResponse = await getCategories({ accessToken });
  log.info(`Fetched fresh SM categories: ${JSON.stringify(categoryResponse)}`);
  return categoryResponse ? categoryResponse.data : [];
}

export async function insertSmBrand(smBrand: Brand) {
  const newBrandRecordKey = await insertSBrand({ sBrand: smBrand });
  return getSmBrandById(newBrandRecordKey.id);
}

export async function insertSmCategory(smCategory: Category) {
  const newRecordKey = await insertSCategory({ sCategory: smCategory });
  return getSmCategoryById(newRecordKey.id);
}

export async function updateSmCategory(smCategory: Category) {
  const result = await updateSCategory({ sCategory: smCategory });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No Sm category updated for internal id ${smCategory.id}`, ErrorCategory.BUS);
  }
  return getSmCategoryByCategoryId(smCategory.id);
}

export async function updateSmBrand(smBrand: Brand) {
  const result = await updateSBrand({ sBrand: smBrand });
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No brand updated for internal id ${smBrand.id}`, ErrorCategory.BUS);
  }
  return getSmBrandByBrandId(smBrand.id);
}

export async function getSmBrandSyncDetails() {
  const [freshSBrands, storedSBrands]
    = await Promise.all([
      getFreshSmBrands(),
      getAllStoredSmBrands(),
    ]);

  return {
    apiSmBrands: freshSBrands,
    dbSmBrands: storedSBrands,
  };
}

export async function getSmCategorySyncDetails() {
  const [freshSCategories, storedSCategories]
    = await Promise.all([
      getFreshSmCategories(),
      getAllStoredSmCategories(),
    ]);

  return {
    apiSmCategories: freshSCategories,
    dbSmCategories: storedSCategories,
  };
}

export async function deleteSmBrand(id: number) {
  // Check for references
  const brand = await getSmBrandById(id);
  // Check TBrandId reference
  if (brand && brand.tBrandId) {
    throw new MiddleError(`Sm Brand ${brand.name} has a Tray Brand reference`, ErrorCategory.BUS);
  }
  const result = await deleteSBrand(id);
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No brand deleted for internal id ${id}`, ErrorCategory.BUS);
  }
  log.info(`Deleted SM brand with id: ${id} - ${JSON.stringify(result)}`);
  return result;
}

export async function deleteSmCategory(id: number) {
  const result = await deleteSCategory(id);
  if (result && result.affectedRows === 0) {
    throw new MiddleError(`No category deleted for internal id ${id}`, ErrorCategory.BUS);
  }
  log.warn(`Deleted SM category with id: ${id} - ${JSON.stringify(result)}`);
  return result;
}

export async function getSmBrandById(id: number) {
  const brands = await getSBrandById(id);
  if (brands && Array.isArray(brands) && brands.length === 1) {
    return brands[0];
  }
  return undefined;
}

export async function getSmCategoryById(id: number) {
  const categories = await getSCategoryById(id);
  if (categories && Array.isArray(categories) && categories.length === 1) {
    return categories[0];
  }
  return undefined;
}

export async function getSmCategoryByCategoryId(id: number) {
  const categories = await getSCategoryByCategoryId(id);
  if (categories && Array.isArray(categories) && categories.length === 1) {
    return categories[0];
  }
  return undefined;
}

export async function getSmBrandByBrandId(id: number) {
  const brands = await getSBrandByBrandId(id);
  if (brands && Array.isArray(brands) && brands.length === 1) {
    return brands[0];
  }
  return undefined;
}

export async function getActiveStoredSmBrands() {
  return getSBrandsByActiveState({ active: true });
}

export async function getAllStoredSmBrands() {
  return getAllSBrands();
}

export async function getActiveStoredSmCategories() {
  return getSCategoriesByActiveState({ active: true });
}

export async function getAllStoredSmCategories() {
  return getAllSCategories();
}

/**
 * 
  [D	2, D,	4, 5, D, 7, 8]  FRESH

  [1, 2, 3, 4, I, 6, 7, I]  DB

  F(F->D) === T - UPDATE
  F(F->D) === F - INSERT

  DB whatever is left in the DB - (Delete)
 */
export function getSBrandActionGroups({
  freshSBrands,
  storedSBrands,
}: {
  freshSBrands: Brand[];
  storedSBrands: ESBrand[];
}) {
  const actionMap = new Map<Action, Brand[]>();
  const sortById = (a: Brand, b: Brand) => {
    return a.id - b.id;
  };

  // First load
  if (storedSBrands.length === 0) {
    actionMap.set(Action.INSERT, freshSBrands.sort(sortById));
  } else {
    const updateGroup: Brand[] = [];
    const insertGroup: Brand[] = [];
    let deleteGroup: Brand[] = [];
    // compare
    freshSBrands.forEach((freshBrand) => {
      const dbBrand = storedSBrands.find((storedBrand) => storedBrand.id === freshBrand.id);
      // update
      if (dbBrand) {
        updateGroup.push(freshBrand);
        const index = storedSBrands.indexOf(dbBrand);
        storedSBrands.splice(index, 1); // remove from stored as it'a a reference
        // insert
      } else {
        insertGroup.push(freshBrand);
      }
    });

    // Commented out for now as this function might not stay
    // delete group
    // if (storedSBrands && storedSBrands.length > 0) {
    //   deleteGroup = storedSBrands.map((smBrand) => convertESBrandToSBrand(smBrand));
    // }

    actionMap.set(Action.INSERT, insertGroup);
    actionMap.set(Action.UPDATE, updateGroup);
    actionMap.set(Action.DELETE, deleteGroup);
  }
  return actionMap;
}

export enum Action {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
