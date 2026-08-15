import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Portfolio API')
    .setDescription(
      'Blog content and admin management API for the portfolio site',
    )
    .setVersion('1.0')
    .addBearerAuth() // JWT Bearer token support in Swagger UI
    .addCookieAuth('portfolio_admin_token') // HttpOnly cookie auth support
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Global ValidationPipe: strip unknown fields (whitelist) and reject requests with extra fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter: consistent error shape, no stack traces to clients
  app.useGlobalFilters(new AllExceptionsFilter());

  // ClassSerializerInterceptor respects @Exclude() on response DTOs (e.g. password hash)
  // app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const frontendUrl = configService.get<string>('FRONTEND_URL')!;
  // credentials: true is required for cross-origin cookie auth — must pair with
  // sameSite: 'none' + secure: true on the cookie itself (see Known Pitfalls in AGENTS.md)
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  logger.log(`Portfolio API running on port ${port}`);
  logger.log(`CORS allowed origin: ${frontendUrl}`);
}

bootstrap();
