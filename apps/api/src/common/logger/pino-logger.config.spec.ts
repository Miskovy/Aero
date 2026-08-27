import { ConfigService } from '@nestjs/config';
import { getPinoLoggerConfig } from './pino-logger.config';
import { IncomingMessage, ServerResponse } from 'http';

describe('PinoLoggerConfig', () => {
  it('should return development configuration with pino-pretty transport', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'JSON_LOG') return 'false';
        if (key === 'LOG_LEVEL') return 'debug';
        return undefined;
      }),
    } as unknown as ConfigService;

    const config = getPinoLoggerConfig(configService);
    expect(config.pinoHttp).toBeDefined();
    const pinoHttp = config.pinoHttp as any;
    expect(pinoHttp.level).toBe('debug');
    expect(pinoHttp.transport).toBeDefined();
    expect(pinoHttp.transport.target).toBe('pino-pretty');
    expect(pinoHttp.transport.options.ignore).toContain('req');
    expect(pinoHttp.transport.options.ignore).toContain('res');
  });

  it('should return production configuration without transport when JSON_LOG is true', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'JSON_LOG') return 'true';
        if (key === 'LOG_LEVEL') return 'info';
        return undefined;
      }),
    } as unknown as ConfigService;

    const config = getPinoLoggerConfig(configService);
    const pinoHttp = config.pinoHttp as any;
    expect(pinoHttp.level).toBe('info');
    expect(pinoHttp.transport).toBeUndefined();
  });

  it('should generate or propagate request IDs', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const config = getPinoLoggerConfig(configService);
    const pinoHttp = config.pinoHttp as any;

    const mockReq = {
      headers: { 'x-request-id': 'custom-req-id-123' },
    } as unknown as IncomingMessage;

    const setHeaderMock = jest.fn();
    const mockRes = {
      setHeader: setHeaderMock,
    } as unknown as ServerResponse;

    const reqId = pinoHttp.genReqId(mockReq, mockRes);
    expect(reqId).toBe('custom-req-id-123');
    expect(setHeaderMock).toHaveBeenCalledWith('x-request-id', 'custom-req-id-123');
  });

  it('should correctly format success and warning messages including responseMessage', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const config = getPinoLoggerConfig(configService);
    const pinoHttp = config.pinoHttp as any;

    const mockReq = { method: 'GET', url: '/api/v1/users/me' } as any;
    const mockRes = {
      statusCode: 401,
      responseMessage: 'Unauthorized',
      getHeader: jest.fn().mockReturnValue('0570b6d0-f6c6-4b1c-b124-00d585a07efc'),
    } as any;

    const message = pinoHttp.customSuccessMessage(mockReq, mockRes, 2);
    expect(message).toBe('GET /api/v1/users/me 401 - "Unauthorized" +2ms [0570b6d0]');
  });

  it('should correctly determine custom log level based on response status', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const config = getPinoLoggerConfig(configService);
    const pinoHttp = config.pinoHttp as any;

    expect(pinoHttp.customLogLevel({} as any, { statusCode: 200 } as any)).toBe('info');
    expect(pinoHttp.customLogLevel({} as any, { statusCode: 404 } as any)).toBe('warn');
    expect(pinoHttp.customLogLevel({} as any, { statusCode: 500 } as any)).toBe('error');
    expect(pinoHttp.customLogLevel({} as any, { statusCode: 200 } as any, new Error('error'))).toBe('error');
  });

  it('should redact sensitive fields in config', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const config = getPinoLoggerConfig(configService);
    const pinoHttp = config.pinoHttp as any;

    expect(pinoHttp.redact.paths).toContain('req.headers.authorization');
    expect(pinoHttp.redact.paths).toContain('req.body.password');
    expect(pinoHttp.redact.paths).toContain('req.body.token');
    expect(pinoHttp.redact.paths).toContain('req.body.refreshToken');
  });
});
