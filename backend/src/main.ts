import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // enable CORS
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
    });

    // configure port
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
