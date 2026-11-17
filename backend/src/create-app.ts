import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

export async function createNestApp(
  expressApp?: Express,
): Promise<INestApplication> {
  const app = expressApp
    ? await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
        bodyParser: true,
      })
    : await NestFactory.create(AppModule, { rawBody: false });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const origins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origins.includes('*') || origins.includes(origin)) return cb(null, true);
      if (/\.vercel\.app$/i.test(origin)) return cb(null, true);
      return cb(null, origins.length === 0);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  return app;
}
