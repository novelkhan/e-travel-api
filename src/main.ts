// ------------------------------------------------
// src/main.ts
// ------------------------------------------------
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger setup (exact like ASP.NET)
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

  // CORS setup (exact like ASP.NET)
  app.enableCors({
    origin: true, // Allow all origins or specify your frontend URLs
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(7039); // Port 7039 like ASP.NET
}
bootstrap();