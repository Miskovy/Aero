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
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      message = 'An unexpected error occurred on the server.';
    }

    response.status(status).json({
      statusCode: status,
      errorCode: AeroErrorCode.INTERNAL_ERROR, // Can be improved later by mapping HttpException types to AeroErrorCodes
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
