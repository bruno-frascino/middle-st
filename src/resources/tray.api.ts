import log from '../logger';
import { Product, TrayToken, Variant } from '../model/tray.model';
import { ErrorHandlerParams, fetchWrapper } from '../shared/api/fetchApi';
import { ErrorCategory, HttpStatus, MiddleError } from '../shared/errors/MiddleError';

// Retrieve Product
export async function getProduct({
  domain,
  productId,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  domain: string;
  productId: number;
  accessToken: string;
  fetchFn?: Function;
}): Promise<Product> {
  const url = `https://${domain}/products/${productId}?access_token=${accessToken}`;
  return trayFetch({ url, method: 'GET', fetchFn });
}

// Update Variant
export async function putVariant({
  domain,
  variant,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  domain: string;
  variant: Variant;
  accessToken: string;
  fetchFn?: Function;
}): Promise<Variant> {
  const url = `https://${domain}/products/variants/${variant.Variant.id}?access_token=${accessToken}`;
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
  domain,
  consumer_key,
  consumer_secret,
  code,
  fetchFn = fetchWrapper,
}: {
  domain: string;
  consumer_key: string;
  consumer_secret: string;
  code: string;
  fetchFn?: Function;
}): Promise<TrayToken> {
  const url = `https://${domain}/auth`;
  return trayFetch({ url, method: 'POST', body: { consumer_key, consumer_secret, code }, fetchFn });
}

export async function getAuth({
  domain,
  refreshToken,
  fetchFn = fetchWrapper,
}: {
  domain: string;
  refreshToken: string;
  fetchFn?: Function;
}): Promise<TrayToken> {
  const url = `https://${domain}/auth?refresh_token=${refreshToken}`;
  return trayFetch({
    url,
    method: 'GET',
    fetchFn,
  });
}

// Variant
export async function getVariant({
  domain,
  variantId,
  accessToken,
  fetchFn = fetchWrapper,
}: {
  domain: string;
  variantId: number;
  accessToken: string;
  fetchFn?: Function;
}): Promise<Variant> {
  const url = `https://${domain}/products/variants/${variantId}?access_token=${accessToken}`;
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
