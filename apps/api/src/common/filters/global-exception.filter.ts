import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { NestHttpExceptionResponse } from '../interfaces/filters.interface';
import { AeroErrorCode } from '../constants/error-codes';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const responseObj = exceptionResponse as NestHttpExceptionResponse;
        message = responseObj.message || exception.message;
        if (
          status === HttpStatus.NOT_FOUND &&
          (request.url === '/' || request.url === '')
        ) {
          return response.status(HttpStatus.OK).json({
            status: 'ok',
            name: 'Aero Control Plane API',
            version: '1.0',
            docs: '/api/docs',
            api: '/api/v1',
          });
        }

        if (
          status === HttpStatus.NOT_FOUND &&
          typeof responseObj.message === 'string' &&
          responseObj.message.includes('Cannot GET')
        ) {
          message = `The route [${request.method}] ${request.url} does not exist. Available API base is /api/v1`;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception [${request.method} ${request.url}]: ${exception.message}`,
        exception.stack,
      );
      message = 'An unexpected error occurred on the server.';
    } else {
      this.logger.error(
        `Unhandled Non-Error Exception [${request.method} ${request.url}]: ${String(exception)}`,
      );
      message = 'An unexpected error occurred on the server.';
    }

    const messageStr =
      typeof message === 'string'
        ? message
        : Array.isArray(message)
          ? message.join(', ')
          : typeof message === 'object' && message !== null && 'message' in message
            ? Array.isArray((message as any).message)
              ? (message as any).message.join(', ')
              : String((message as any).message)
            : JSON.stringify(message);

    (response as any).responseMessage = messageStr;

    response.status(status).json({
      statusCode: status,
      errorCode: AeroErrorCode.INTERNAL_ERROR, // Can be improved later by mapping HttpException types to AeroErrorCodes
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
