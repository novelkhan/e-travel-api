// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS setup
  app.enableCors({
  origin: true,//['http://localhost:4200', 'http://localhost:5173'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
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

  await app.listen(7039); // Port 7039 like ASP.NET
}
bootstrap();