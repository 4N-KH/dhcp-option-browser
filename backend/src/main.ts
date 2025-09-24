import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  // Logger used for application startup messages
  const logger = new Logger('Bootstrap');

  try {
    // Create the NestJS app with full log levels enabled
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Allow all log levels across the entire application
    Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);

    // Enable CORS for the frontend
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
    });

    // Apply global DTO validation and transformation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

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
