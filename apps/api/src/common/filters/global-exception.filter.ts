import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface NestHttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

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
          typeof responseObj.message === 'string' && 
          responseObj.message.includes('Cannot GET')
        ) {
           message = `The route [${request.method}] ${request.url} does not exist.`;
        }
      }
    } 
    else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = 'An unexpected error occurred on the server.';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}