import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { AppService } from './app.service';
import { AppController } from './app.controller';

import { CredentialEntity } from './infrastructure/database/credential.entity';

import { AuthController } from './controller/auth.controller';
import { AuthService } from './application/auth.service';
import { CredentialService } from './application/services/credential.service';

import { GridAuthProvider } from './application/providers/grid-auth.provider';
import { CspAuthProvider } from './application/providers/csp-auth.provider';

import { NiosClient } from './infrastructure/api-clients/nios.client';
import { CspAuthClient } from './infrastructure/api-clients/csp/auth.client';

// CSP-specific imports
import { CspDataClient } from './infrastructure/api-clients/csp/data.client';
import { ApiConfigService } from './shared/config/api-config.service';
import { ImportController } from './controller/import.controller';

// IMPORT-SERVICES
import { DhcpCspImportOrchestratorService } from './application/services/import/csp/dhcp-import-orchestrator.service';
import { CspSubnetImportService } from './application/services/import/csp/subnet-import.service';
import { CspOptionGroupImportService } from './application/services/import/csp/option-group-import.service';
import { CspIpSpaceImportService } from './application/services/import/csp/ip-space-import.service';
import { CspAddressBlockImportService } from './application/services/import/csp/address-block-import.service';
import { CspRangeImportService } from './application/services/import/csp/range-import.service';
import { CspFixedAddressImportService } from './application/services/import/csp/fixed-address-import.service';
import { CspGlobalConfigImportService } from './application/services/import/csp/global-config-import.service';
import { CspConfigProfileImportService } from './application/services/import/csp/config-profile-import.service';
import { CspOptionCodeImportService } from './application/services/import/csp/option-code-import.service';
import { CspAddressBlockController } from './controller/csp-address-block.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [CredentialEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([CredentialEntity]),
  ],
  controllers: [
    AppController,
    AuthController,
    ImportController,
    CspAddressBlockController,
  ],
  providers: [
    AppService,
    // DhcpManagerService entfernt
    AuthService,
    CredentialService,
    GridAuthProvider,
    CspAuthProvider,
    NiosClient,
    CspAuthClient,
    CspDataClient,
    ApiConfigService,

    // Alle Import- und Orchestrator-Services:
    DhcpCspImportOrchestratorService,
    CspSubnetImportService,
    CspOptionGroupImportService,
    CspIpSpaceImportService,
    CspAddressBlockImportService,
    CspRangeImportService,
    CspFixedAddressImportService,
    CspGlobalConfigImportService,
    CspConfigProfileImportService,
    CspOptionCodeImportService,
  ],
})
export class AppModule {}
