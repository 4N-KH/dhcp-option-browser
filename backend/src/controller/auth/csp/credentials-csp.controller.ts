import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CredentialCspService } from '@/application/services/auth/csp/credential-csp.service';
import { SaveCspCredentialDto } from '@/domain/dto/csp/auth/save-csp-credential.dto';
import { CspCredentialQueryDto } from '@/domain/dto/csp/auth/csp-credential-query.dto';
import { AuthenticatedRequest } from '@/domain/interfaces/csp/authenticated-request.interface';
import { JwtAuthGuard } from '@/application/guards/jwt-auth.guard';

/**
 * Handles CRUD operations for CSP credentials, always user-scoped.
 * All routes require JWT authentication.
 */
@Controller('credentials/csp')
@UseGuards(JwtAuthGuard) // Enforces that req.user is always present (production-safe)
export class CredentialsCspController {
  constructor(private readonly cspService: CredentialCspService) {}

  /**
   * Stores a CSP API key for the current user and region, encrypted.
   */
  @Post()
  async saveCredential(
    @Body() body: SaveCspCredentialDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const { region, apiKey } = body;
    const entity = await this.cspService.saveCredential(userId, region, apiKey);
    return { success: true, id: entity.id };
  }

  /**
   * Retrieves the decrypted CSP API key for the current user and region.
   */
  @Get()
  async getCredential(
    @Query() query: CspCredentialQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const { region } = query;
    const apiKey = await this.cspService.getCredential(userId, region);
    return { apiKey };
  }

  /**
   * Deletes the stored CSP API key for the given user and region.
   */
  @Delete()
  async deleteCredential(
    @Query() query: CspCredentialQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const { region } = query;
    await this.cspService.deleteCredential(userId, region);
    return { success: true };
  }
}
