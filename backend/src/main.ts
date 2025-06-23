import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for local frontend
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
    });

    // Global validation pipe for DTO validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip unknown fields
        forbidNonWhitelisted: true, // Throw on unknown fields
        transform: true, // Auto-transform payloads
      }),
    );

    // Set application port
    const port = process.env.PORT ? Number(process.env.PORT) : 3001;

    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Application failed to start:', error.message);
      logger.error(error.stack);
    } else {
      logger.error('Application failed to start due to an unknown error');
    }
    process.exit(1);
  }
}

void bootstrap();
