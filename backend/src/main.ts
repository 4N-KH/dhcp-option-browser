import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  // Logger-Instanz für Bootstrap-Meldungen
  const logger = new Logger('Bootstrap');

  try {
    // ----- WICHTIG: Logger explizit für alle Level setzen! -----
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Damit wirklich JEDE Log-Message durchgeht (auch aus Services)
    Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);

    // Enable CORS für dein Frontend
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
    });

    // Globale DTO-Validation aktivieren
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
