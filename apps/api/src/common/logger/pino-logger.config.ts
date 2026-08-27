import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';

/**
 * Creates the configuration options for nestjs-pino LoggerModule
 * dynamically using the application ConfigService.
 */
export const getPinoLoggerConfig = (
  configService: ConfigService,
): Params => {
  const isProduction =
    configService.get<string>('NODE_ENV') === 'production';
  const isJsonLog =
    configService.get<string>('JSON_LOG') === 'true' ||
    configService.get<boolean>('JSON_LOG') === true;
  const logLevel =
    configService.get<string>('LOG_LEVEL') ||
    (isProduction ? 'info' : 'debug');

  return {
    pinoHttp: {
      level: logLevel,
      transport:
        !isJsonLog && !isProduction
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: false,
                translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                ignore:
                  'pid,hostname,req,res,responseTime,context,responseMessage',
                messageFormat: '{if context}({context}) {end}{msg}',
                errorLikeObjectKeys: ['err', 'error'],
              },
            }
          : undefined,
      autoLogging: {
        ignore: (req: IncomingMessage) => {
          const url = req.url || '';
          return (
            url.endsWith('/favicon.ico') ||
            url === '/api/v1/health' ||
            url === '/health'
          );
        },
      },
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const existingId =
          (req.headers['x-request-id'] as string) ||
          (req.headers['x-correlation-id'] as string);
        const reqId = existingId || randomUUID();
        res.setHeader('x-request-id', reqId);
        return reqId;
      },
      customProps: (_req: IncomingMessage, res: ServerResponse) => ({
        context: 'HTTP',
        responseMessage: (res as any).responseMessage,
      }),
      customLogLevel: (
        _req: IncomingMessage,
        res: ServerResponse,
        err?: Error,
      ) => {
        if (res.statusCode >= 500 || err) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },
      customSuccessMessage: (
        req: IncomingMessage,
        res: ServerResponse,
        responseTime: number,
      ) => {
        const responseMsg = (res as any).responseMessage;
        const msgDetails = responseMsg ? ` - "${responseMsg}"` : '';
        const reqId = (res.getHeader('x-request-id') as string) || '';
        const reqIdSuffix = reqId ? ` [${reqId.substring(0, 8)}]` : '';
        return `${req.method} ${req.url} ${res.statusCode}${msgDetails} +${responseTime}ms${reqIdSuffix}`;
      },
      customErrorMessage: (
        req: IncomingMessage,
        res: ServerResponse,
        err: Error,
      ) => {
        const responseMsg =
          (res as any).responseMessage ||
          err?.message ||
          res.statusMessage ||
          'Internal Server Error';
        const reqId = (res.getHeader('x-request-id') as string) || '';
        const reqIdSuffix = reqId ? ` [${reqId.substring(0, 8)}]` : '';
        return `${req.method} ${req.url} ${res.statusCode} - "${responseMsg}"${reqIdSuffix}`;
      },
      serializers: {
        req: (req: any) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        }),
        res: (res: any) => ({
          statusCode: res.statusCode,
          responseMessage: res.responseMessage,
        }),
        err: (err: any) => ({
          type: err.type || err.name,
          message: err.message,
          stack: err.stack,
        }),
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'req.headers["x-vault-token"]',
          'req.headers["x-auth-token"]',
          'req.body.password',
          'req.body.currentPassword',
          'req.body.newPassword',
          'req.body.confirmPassword',
          'req.body.token',
          'req.body.refreshToken',
          'req.body.secret',
          'req.body.apiKey',
          'req.body.cardNumber',
          'req.body.cvc',
          'req.body.cvv',
          'req.body.creditCard',
        ],
        censor: '[REDACTED]',
      },
    },
  };
};
