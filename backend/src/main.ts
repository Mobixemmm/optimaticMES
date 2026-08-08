import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnv } from './config/validate-env';
import { LoggingInterceptor } from './logging.interceptor';

async function bootstrap() {
  // Zatrzymuje start jeśli brakuje sekretów albo konfiguracja jest niebezpieczna
  // (np. NODE_ENV=production bez COOKIE_SECURE=true) — lepiej nie wystartować
  // wcale, niż wystartować z dziurawą konfiguracją na hali.
  validateEnv();

  const isProd = process.env.NODE_ENV === 'production';
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: isProd ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // CSP wyłączone: to API JSON (poza Swagger UI w dev), a domyślna CSP helmeta
  // blokuje inline-skrypty, na których opiera się Swagger UI.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.set('trust proxy', 1); // za reverse proxy (nginx/traefik) — poprawne IP do throttlera

  // CORS — pozwól frontendowi (domyślnie localhost:5173/8080, nadpisywalne przez CORS_ORIGINS)
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:8080'];
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Walidacja DTO — odrzuca nieznane pola i rzutuje typy z query/params
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger — tylko poza produkcją, żeby nie publikować mapy API na hali
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('OptimaticMES API')
      .setDescription('API systemu MES')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port);
  logger.log(`OptimaticMES API nasłuchuje na porcie ${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
}
void bootstrap();
