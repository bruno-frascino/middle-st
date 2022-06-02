import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';
import log from '../../logger';
import { ErrorCategory, HttpStatus, MiddleError } from '../errors/MiddleError';

interface DownstreamServiceRequest {
  url: string;
  serviceName: string;
  options?: RequestInit;
  fetchFn?: typeof fetchApi;
  errorHandlerFn?: (p: ErrorHandlerParams) => string;
}
export interface ErrorHandlerParams {
  errorReceived?: any;
  response: Response;
  responseJson: any;
  url: string;
}

export async function fetchWrapper({
  url,
  serviceName,
  options = {},
  fetchFn = fetchApi,
  errorHandlerFn = (p) => p.toString(),
}: DownstreamServiceRequest) {
  let response: Response;
  const requestTime = new Date();
  let responseTime;
  try {
    // TODO don't log sensitive data
    log.debug(
      `Calling ${serviceName}, ${JSON.stringify({
        ucode: '73f97d7',
        requestTime,
        request: {
          ...options,
          url,
        },
      })}`,
    );
    response = await fetchFn(url, options);
    responseTime = new Date();
  } catch (err) {
    log.error(
      `${serviceName} network error: ${JSON.stringify({
        ucode: 'b2bb06a',
        requestTime,
        responseTime: new Date(),
        error: err,
      })}`,
    );
    throw new MiddleError(
      `Failed to fetch ${url} from ${serviceName}`,
      ErrorCategory.TECH,
      HttpStatus.InternalServerError,
    );
  }

  let responseJson = null;
  try {
    responseJson = await response.json();
  } catch (err) {
    log.error(`${serviceName} returned a response with an invalid json `, {
      ucode: '6d4c212',
      requestTime,
      responseTime,
      error: err,
    });
    throw new MiddleError(
      `Invalid Response(${url}, ${serviceName})`,
      ErrorCategory.TECH,
      HttpStatus.InternalServerError,
    );
  }

  // Handle the error
  if (response.status >= 400 || !responseJson) {
    const errorReceived = responseJson || response.statusText;
    log.error(`${serviceName} returned an error (${response.status}) "${url}"`, {
      ucode: 'f115e88',
      requestTime,
      responseTime,
      response: {
        ...response,
        data: responseJson,
      },
    });
    // Default error handler if service layer doesn't define it
    const errorMsg = errorHandlerFn({ url, response, responseJson, errorReceived });
    log.error(`Returning response for url "${url}": ${errorMsg}`, {
      ucode: 'dde2ec4',
      requestTime,
      responseTime,
    });
    throw new MiddleError(
      `Unexpected error for ${url} from ${serviceName}. Error: ${errorMsg}`,
      ErrorCategory.TECH,
      HttpStatus.InternalServerError,
    );
  }

  log.info(`${serviceName} call successful (${response.status}) "${url}"`, {
    ucode: '4a6a9c7',
    requestTime,
    responseTime,
    response: {
      ...response,
    },
  });
  log.debug(`${serviceName} "${url}" call response`, {
    ucode: 'd97e601',
    data: responseJson,
  });
  return Promise.resolve(responseJson);
}

export async function fetchApi(url: RequestInfo, init?: RequestInit) {
  if (!init) {
    // eslint-disable-next-line no-param-reassign
    init = { headers: {} };
  }
  // TODO - headers TBD
  // init.headers = {

  // }
  return fetch(url, init);
}
