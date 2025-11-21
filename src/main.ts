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
  // Configure CORS with credentials support. When using credentialed
  // requests (cookies) the Access-Control-Allow-Origin header must be
  // a specific origin (not '*'). Support a comma-separated
  // ALLOWED_ORIGINS env var. If none provided, in production we reflect
  // the incoming origin (so the browser receives a specific origin
  // header) while in non-production we allow all origins for convenience.
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  console.log('Allowed Origins:', allowedOrigins);
  let corsOrigin: boolean | string | string[];
  if (allowedOrigins.length === 0) {
    corsOrigin = process.env.NODE_ENV === 'production' ? true : '*';
  } else if (allowedOrigins.length === 1 && allowedOrigins[0] === '*') {
    // If explicitly '*' is provided, reflect origin (same as true)
    corsOrigin = true;
  } else {
    corsOrigin = allowedOrigins;
  }

  app.enableCors({
    origin: corsOrigin,
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
