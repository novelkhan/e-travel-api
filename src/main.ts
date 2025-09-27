// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser'; // এই লাইনটি ঠিক আছে

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser যোগ করুন - এভাবে ব্যবহার করুন
  app.use(cookieParser());

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