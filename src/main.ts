// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { ValidationPipe } from './shared/pipes/validation.pipe';
import { Logger } from '@nestjs/common';
import { openBrowser } from './shared/utils/open-browser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Cookie parser যোগ করুন
  app.use(cookieParser());
  
  // Global exception filter যোগ করুন
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Global validation pipe যোগ করুন
  app.useGlobalPipes(new ValidationPipe());

  // CORS setup
  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With, Cookie',
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('ETravelApi - NestJS')
    .setDescription('The ETravel API description - NestJS Version')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  
  // Swagger UI setup
  SwaggerModule.setup('swagger', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'ETravel API - NestJS',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Global prefix 'api' for all endpoints
  app.setGlobalPrefix('api');

  const port = 7039;
  await app.listen(port);
  
  const swaggerUrl = `http://localhost:${port}/swagger`;
  const apiUrl = `http://localhost:${port}/api`;
  
  logger.log('🚀 ========================================');
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: ${swaggerUrl}`);
  logger.log(`🛠️ API endpoints: ${apiUrl}`);
  logger.log('🚀 ========================================');
  
  // Automatically open browser in development
  if (process.env.NODE_ENV !== 'production') {
    setTimeout(() => {
      openBrowser(swaggerUrl);
    }, 2000); // 2 seconds delay to ensure server is ready
  }
}

bootstrap();