import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CredentialCspService } from '@/application/services/auth/csp/credential-csp.service';
import { SaveCspCredentialDto } from '@/domain/dto/csp/auth/save-csp-credential.dto';
import { AuthenticatedRequest } from '@/domain/interfaces/csp/authenticated-request.interface';
import { JwtAuthGuard } from '@/application/guards/jwt-auth.guard';

@Controller('credentials/csp')
@UseGuards(JwtAuthGuard)
export class CredentialsCspController {
  constructor(private readonly cspService: CredentialCspService) {}

  @Post()
  async saveCredential(
    @Body() body: SaveCspCredentialDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const loginHash = req.user?.hash;
    if (!loginHash) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const { apiKey } = body as unknown as { apiKey: string };

    const entity = await this.cspService.saveCredential(loginHash, apiKey);
    return { success: true, id: entity.id };
  }

  @Get()
  async getCredential(@Req() req: AuthenticatedRequest) {
    const loginHash = req.user?.hash;
    if (!loginHash) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const apiKey = await this.cspService.getCredential(loginHash);
    return { apiKey };
  }

  @Delete()
  async deleteCredential(@Req() req: AuthenticatedRequest) {
    const loginHash = req.user?.hash;
    if (!loginHash) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.cspService.deleteCredential(loginHash);
    return { success: true };
  }
}
