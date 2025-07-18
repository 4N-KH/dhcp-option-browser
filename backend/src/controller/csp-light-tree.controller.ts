import { Controller, Get } from '@nestjs/common';
import { GlobalLightTreeLoaderService } from '@/application/services/option-hierarchy/csp/mappers/light-tree/global-light-tree-loader.service';

@Controller('api/csp/tree/light')
export class CspLightTreeController {
  constructor(
    private readonly globalLightTreeLoader: GlobalLightTreeLoaderService,
  ) {}
  @Get()
  async getLightTree() {
    return await this.globalLightTreeLoader.getGlobalLightTree();
  }
}
