import log from '../logger';
import { Product, TrayToken, Variant } from '../model/tray.model';
import { ErrorHandlerParams, fetchWrapper } from '../shared/api/fetchApi';
import { ErrorCategory, HttpStatus, MiddleError } from '../shared/errors/MiddleError';

// Retrieve Product
export async function getProduct({
  storePath,
  productId,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  storePath: string;
  productId: number;
  accessToken: string;
  fetchFn?: Function;
}): Promise<Product> {
  const url = `${storePath}/products/${productId}?access_token=${accessToken}`;
  return trayFetch({ url, method: 'GET', fetchFn });
}

// Update Variant
export async function putVariant({
  storePath,
  variant,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  storePath: string;
  variant: Variant;
  accessToken: string;
  fetchFn?: Function;
}): Promise<Variant> {
  const url = `${storePath}/products/variants/${variant.Variant.id}?access_token=${accessToken}`;
  return trayFetch({ url, method: 'PUT', body: variant, fetchFn });
}

// // Delete Product
// export async function deleteProduct({
//   productId,
//   accessToken,
//   fetchFn = fetchWrapper,
// }: {
//   productId: number;
//   accessToken: string;
//   fetchFn?: Function;
// }): Promise<any> {
//   // TODO check what type is returned here
//   const url = `${baseUrl}/api/v1/products/${productId}`;
//   return trayFetch({ url, method: 'DELETE', fetchFn, accessToken });
// }

export async function postAuth({
  storePath,
  consumer_key,
  consumer_secret,
  accessCode,
  fetchFn = fetchWrapper,
}: {
  storePath: string;
  consumer_key: string;
  consumer_secret: string;
  accessCode: string;
  fetchFn?: Function;
}): Promise<TrayToken> {
  const url = `${storePath}/auth`;
  return trayFetch({ url, method: 'POST', body: { consumer_key, consumer_secret, code: accessCode }, fetchFn });
}

export async function getAuth({
  storePath,
  refreshToken,
  fetchFn = fetchWrapper,
}: {
  storePath: string;
  refreshToken: string;
  fetchFn?: Function;
}): Promise<TrayToken> {
  const url = `${storePath}/auth?refresh_token=${refreshToken}`;
  return trayFetch({
    url,
    method: 'GET',
    fetchFn,
  });
}

// Variant
export async function getVariant({
  storePath,
  variantId,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  storePath: string;
  variantId: number;
  accessToken: string;
  fetchFn?: Function;
}): Promise<Variant> {
  const url = `${storePath}/products/variants/${variantId}?access_token=${accessToken}`;
  return trayFetch({ url, method: 'GET', fetchFn });
}

async function trayFetch({
  url,
  method,
  body,
  fetchFn,
  accessToken,
  errorHandlerFn = trayFetchErrorHandler,
}: {
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  body?: any;
  fetchFn: Function;
  accessToken?: string;
  errorHandlerFn?: Function;
}) {
  const serviceName = 'Tray';
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // origin: ORIGIN_HEADER_VALUE,
      // TODO - define a tracking id
      // 'X-TrackingID': ctx.trackingId,
      ...(!!accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }
  return fetchFn({ url, serviceName, options, errorHandlerFn });
}

export default function trayFetchErrorHandler({ url, response, responseJson }: ErrorHandlerParams) {
  log.error('Tray API error', { ucode: '5d5cb53', url, error: responseJson });
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
