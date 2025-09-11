import { Controller, Get, Logger } from '@nestjs/common';
import { GlobalLightTreeLoaderService } from '@/application/services/option-hierarchy/csp/mappers/light-tree/global-light-tree-loader.service';

@Controller('api/csp/tree/light')
export class CspLightTreeController {
  private readonly logger = new Logger(CspLightTreeController.name);

  constructor(
    private readonly globalLightTreeLoader: GlobalLightTreeLoaderService,
  ) {}

  @Get()
  async getLightTree() {
    try {
      return await this.globalLightTreeLoader.getGlobalLightTree();
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        'Failed to load light tree',
        error.stack || String(err),
      );
      throw err;
    }
  }
}
