// backend/src/controller/app.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth(): string {
    return 'DHCP Option Browser API is operational';
  }

  @Get('version')
  getVersion(): string {
    return 'v1.0.0 (dev)';
  }
}
