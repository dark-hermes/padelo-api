// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // <-- Import
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { resolve } from 'path';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Padelo API Documentation')
    .setDescription('Dokumentasi lengkap untuk API Padelo.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Serve uploads directory. Use process.cwd() to ensure path resolves correctly
  // regardless of whether the app is run from ts-node or compiled into dist/.
  const uploadsPath: string = resolve(process.cwd(), 'uploads');
  console.log('[main] Serving uploads from:', uploadsPath);
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/', // URL prefix, e.g., http://localhost:3000/uploads/avatars/file.png
  });

  app.enableShutdownHooks();
  await app.listen(process.env.PORT || 8000);
}
void bootstrap();
