import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import helmet from 'helmet';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();

  const redisIoAdapter = new RedisIoAdapter(app);
  redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.useStaticAssets(path.join(process.cwd(), 'public'));

  app.use(cookieParser());
  app.use(helmet());
  app.setGlobalPrefix('api/v1');

  // Parse CORS origins from env
  const corsOrigins = process.env.AERO_CORS_ORIGINS
    ? process.env.AERO_CORS_ORIGINS.split(',').map((o) => o.trim())
    : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://localhost:8080', // CLI callback
    ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true, // Required for HttpOnly cookie support
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('Aero API')
    .setDescription('The Aero API REST documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('aero_rt')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  const PORT = process.env.PORT ?? 3000;
  await app.listen(PORT);
  logger.log(`Aero API is running on port ${PORT}`, 'Bootstrap');
  logger.log(`Swagger documentation available at /api/docs`, 'Bootstrap');
}
bootstrap().catch((err) => {
  console.error('Fatal error during application bootstrap:', err);
  process.exit(1);
});
