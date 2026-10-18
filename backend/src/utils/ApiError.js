/**
 * Custom operational API Error class with HTTP status code and error code
 */
export class ApiError extends Error {
  constructor(statusCode, message, errorCode = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
