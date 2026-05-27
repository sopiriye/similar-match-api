import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // Application bootstrap flow:
  // Construct the Nest application container that will host all modules, providers, and route handlers.
  const app = await NestFactory.create(AppModule);

  // Application bootstrap flow:
  // Enable shutdown and validation behavior so requests are sanitized and resources close cleanly on exit.
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Application bootstrap flow:
  // Build and expose the OpenAPI document so the current backend contract stays discoverable during implementation.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('UCARD Paystation Merchant Onboarding API')
    .setDescription(
      'Assessment backend for merchant onboarding, duplicate detection, and admin review.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  // Application bootstrap flow:
  // Start the HTTP server only after runtime validation and documentation setup complete successfully.
  await app.listen(process.env.PORT ?? 3000);
}

(async () => {
  await bootstrap();
})().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
}); //Codex Note: Dont change this to a normal function call, it needs to be an IIFE to properly handle async/await and error catching at the top level.
