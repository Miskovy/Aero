import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.use(cookieParser());

  app.enableCors({
    origin: [
      'http://localhost:3001', // Web dashboard
      'http://localhost:8080', // CLI callback
    ],
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
  console.log(`Aero API is running on port ${PORT}`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
