import config from 'config';
import log from '../logger';
import { Product } from '../model/sm.model';
import { ErrorHandlerParams, fetchWrapper } from '../shared/api/fetchApi';
import { ErrorCategory, HttpStatus, MiddleError } from '../shared/errors/MiddleError';

const baseUrl = config.get('sBaseUrl');

export enum Embedded {
  GALLERY = 'GALLERY',
  BRAND = 'BRAND',
  CATEGORIES = 'CATEGORIES',
  ATTRIBUTES = 'ATTRIBUTES',
  SKUS = 'SKUS',
}

function getAllEmbedded() {
  return Object.values(Embedded).join(',');
}

// Product Endpoints
// Create
export async function postProduct({
  product,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  product: Product;
  accessToken: string;
  fetchFn?: Function;
}): Promise<Product> {
  const url = `${baseUrl}/api/v1/products`;
  return smFetch({ url, method: 'POST', body: product, fetchFn, accessToken });
}

// Retrieve
export async function getProduct({
  productId,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  productId: number;
  accessToken: string;
  fetchFn?: Function;
}): Promise<Product> {
  const url = `${baseUrl}/api/v1/products/${productId}?embedded=${getAllEmbedded()}`;
  return smFetch({ url, method: 'GET', fetchFn, accessToken });
}

// Update
export async function putProduct({
  product,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  product: Product;
  accessToken: string;
  fetchFn?: Function;
}): Promise<Product> {
  const url = `${baseUrl}/api/v1/products/${product.id}`;
  return smFetch({ url, method: 'PUT', body: product, fetchFn, accessToken });
}

// Delete
export async function deleteProduct({
  productId,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  productId: number;
  accessToken: string;
  fetchFn?: Function;
}): Promise<any> {
  // TODO check what type is returned here
  const url = `${baseUrl}/api/v1/products/${productId}`;
  return smFetch({ url, method: 'DELETE', fetchFn, accessToken });
}

async function smFetch({
  url,
  method,
  body,
  fetchFn,
  accessToken,
  errorHandlerFn = smFetchErrorHandler,
}: {
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  body?: any;
  fetchFn: Function;
  accessToken: string;
  errorHandlerFn?: Function;
}) {
  const serviceName = 'SM Places';
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // origin: ORIGIN_HEADER_VALUE,
      // TODO - define a tracking id
      // 'X-TrackingID': ctx.trackingId,
      Authentication: accessToken,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }
  return fetchFn({ url, serviceName, options, errorHandlerFn });
}

export default function smFetchErrorHandler({ url, response, responseJson }: ErrorHandlerParams) {
  log.error('SM API error', { ucode: '5d5cb53', error: responseJson });
  // TODO Identify different responses
  // if (isSimpleError(responseJson)) {
  //   errorMessage = responseJson.errorMessage;
  //   muleErrorStatus = Number(response.status);
  // }

  // TODO Check this response structure
  if (response.status === 400) {
    throw new MiddleError(`Bad request for ${url} Error: ${responseJson}`, ErrorCategory.TECH, HttpStatus.BadRequest);
  }
  // {
  //   "message": "Unauthenticated."
  // }
  if (response.status === 401) {
    throw new MiddleError(
      `Unauthenticated request for ${url} Error: ${responseJson}`,
      ErrorCategory.TECH,
      HttpStatus.Unauthorized,
    );
  }
  // {
  //   "status": 404,
  //   "error": 404,
  //   "messages": {
  //       "error": "Not Found"
  //   }
  // }
  if (response.status === 404) {
    throw new MiddleError(
      `Resource not found for ${url} Error: ${responseJson}`,
      ErrorCategory.TECH,
      HttpStatus.NotFound,
    );
  }

  // {
  //   "message": "The given data was invalid.",
  //   "errors": {
  //       "reference_code": [
  //           "Você já possui um produto com este código de referência. Por favor, defina outro código"
  //       ],
  //       "skus.1.dimensions.weight": [
  //           "O peso do produto é obrigatório para o cálculo de frete"
  //       ],
  //     }
  //   }
  if (response.status === 422) {
    throw new MiddleError(
      `The given data was invalid for ${url} Error: ${responseJson}`,
      ErrorCategory.TECH,
      HttpStatus.UnprocessableEntity,
    );
  }

  throw new MiddleError(
    `Unrecognized error for ${url} Error: ${responseJson}`,
    ErrorCategory.TECH,
    HttpStatus.InternalServerError,
  );
}
