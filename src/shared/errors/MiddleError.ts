export enum HttpStatus {
  Success = 200,
  MultiStatusResponse = 207,
  BadRequest = 400,
  Forbidden = 403,
  NotFound = 404,
  UnprocessableEntity = 422,
  TooManyRequests = 429,
  InternalServerError = 500,
  ServiceUnavailable = 503,
  Unauthorized = 401,
}

export enum ErrorCategory {
  TECH = 'TECH',
  BUS = 'BUS',
  INTERNAL = 'INTERNAL',
}

export class MiddleError extends Error {
  public code?: string;

  public message: string;

  public category: ErrorCategory;

  public httpStatus?: HttpStatus;

  constructor(message: string, category: ErrorCategory, httpStatus?: HttpStatus, code?: string) {
    super(message);
    this.code = code;
    this.message = message;
    this.category = category;
    this.httpStatus = httpStatus;
  }
}
