// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { ValidationPipe } from './shared/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser যোগ করুন
  app.use(cookieParser());
  
  // Global exception filter যোগ করুন
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Global validation pipe যোগ করুন - ASP.NET Core এর মতো validation errors এর জন্য
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
    .setTitle('ETravelApi')
    .setDescription('The ETravel API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  // Global prefix 'api' for all endpoints
  app.setGlobalPrefix('api');

  await app.listen(7039);
  console.log('Application is running on: http://localhost:7039');
}
bootstrap();