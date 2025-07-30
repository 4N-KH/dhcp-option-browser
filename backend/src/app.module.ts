import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// --- Application & Controllers ---
import { AppController } from './app.controller';

// --- Auth Providers & Services ---
import { CredentialCspService } from './application/services/auth/csp/credential-csp.service';
import { GridAuthProvider } from './application/providers/grid-auth.provider';
import { CspAuthProvider } from './application/providers/csp-auth.provider';
import { CspAuthLoginService } from './application/services/auth/csp/csp-auth-login.service';
import { CspApiKeyVerifierService } from './application/services/auth/csp/csp-api-key-verifier.service';

// --- API Clients ---
import { NiosClient } from './infrastructure/api-clients/nios.client';
import { CspAuthClient } from './infrastructure/api-clients/csp/auth.client';
import { CspDataClient } from './infrastructure/api-clients/csp/data.client';

// --- Shared ---
import { ApiConfigService } from './shared/config/api-config.service';

// --- Import/Export Controller ---
import { ImportController } from './controller/import.controller';
import { ImportRawDataController } from './controller/csp-import.controller';
import { CredentialsCspController } from './controller/auth/csp/credentials-csp.controller';
import { AuthController } from './controller/auth/auth.controller';
import { CspFullImportController } from './controller/csp-full-import.controller';

// --- DHCP Hierarchy/Option Controllers ---
import { CspLightTreeController } from './controller/csp-light-tree.controller';
import { EffectiveDhcpOptionStackController } from './controller/effective-dhcp-option-stack.controller';

// --- Option Overview Controller & Services ---
import { OptionOverviewController } from './controller/option-overview.controller';
import { OptionOverviewService } from './application/services/option-hierarchy/csp/option-overview.service';
import { OptionValuesService } from './application/services/option-hierarchy/csp/option-values.service';
import { OptionValueEffectivenessService } from './application/services/option-hierarchy/csp/option-value-effectiveness.service';
import { OptionValueExplicitService } from './application/services/option-hierarchy/csp/option-value-explicit.service';

// --- Import Services ---
import { DhcpCspImportOrchestratorService } from './application/services/import/csp/dhcp-import-orchestrator.service';
import { CspSubnetImportService } from './application/services/import/csp/subnet-import.service';
import { CspOptionGroupImportService } from './application/services/import/csp/option-group-import.service';
import { CspOptionGroupDhcpOptionImportService } from './application/services/import/csp/option-group-dhcp-option-import.service';
import { CspIpSpaceImportService } from './application/services/import/csp/ip-space-import.service';
import { CspAddressBlockImportService } from './application/services/import/csp/address-block-import.service';
import { CspRangeImportService } from './application/services/import/csp/range-import.service';
import { CspFixedAddressImportService } from './application/services/import/csp/fixed-address-import.service';
import { CspGlobalConfigImportService } from './application/services/import/csp/global-config-import.service';
import { CspConfigProfileImportService } from './application/services/import/csp/config-profile-import.service';
import { CspOptionCodeImportService } from './application/services/import/csp/option-code-import.service';
import { CspOptionSpaceImportService } from './application/services/import/csp/option-space-import.service';
import { CspOptionFilterImportService } from './application/services/import/csp/option-filter-import.service';

// --- Entities ---
import {
  AddressBlock,
  AddressBlockDhcpOption,
  AddressBlockOptionGroup,
  CspCredentialEntity,
  DhcpGlobalConfig,
  DhcpGlobalConfigOption,
  DhcpGlobalConfigOptionGroup,
  FixedAddress,
  FixedDhcpOption,
  FixedAddressOptionGroup,
  IpSpace,
  IpSpaceDhcpOption,
  IpSpaceOptionGroup,
  OptionCodeEntity,
  OptionFilter,
  OptionGroup,
  OptionGroupDhcpOption,
  OptionSpace,
  Range,
  RangeDhcpOption,
  RangeExclusion,
  RangeOptionGroup,
  Subnet,
  SubnetDhcpOption,
  SubnetOptionGroup,
  UserEntity,
} from './infrastructure/database/csp';

// --- DHCP Hierarchy Services ---
import { GlobalLightTreeLoaderService } from './application/services/option-hierarchy/csp/mappers/light-tree/global-light-tree-loader.service';

// --- Option Repositories ---
import {
  GlobalConfigOptionRepository,
  IpSpaceDhcpOptionRepository,
  AddressBlockDhcpOptionRepository,
  SubnetDhcpOptionRepository,
  RangeDhcpOptionRepository,
  FixedDhcpOptionRepository,
} from './infrastructure/database/csp';

import { AllDhcpOptionAssignmentRepository } from './infrastructure/database/csp/all-dhcp-option-assignment.repository';

// --- EFFECTIVE STACK SERVICES (Neue Architektur) ---
import { EffectiveDhcpOptionStackService } from './application/services/option-hierarchy/csp/effective-dhcp-option-stack.service';
import { ContextChainBuilder } from './application/services/option-hierarchy/csp/context-chain.builder';
import { ExplicitOptionsLoader } from './application/services/option-hierarchy/csp/types/explicit-options.loader';
import { OptionGroupsLoader } from './application/services/option-hierarchy/csp/types/option-groups.loader';
// Refaktoriert:
import { OptionStackAssemblerService } from './application/services/option-hierarchy/csp/types/option-stack-assembler/option-stack-assembler-orchestrator.service';
import { StackBuilderService } from './application/services/option-hierarchy/csp/types/option-stack-assembler/stack-builder.service';
import { SlimDtoFactoryService } from './application/services/option-hierarchy/csp/types/option-stack-assembler/slim-dto-factory.service';

import { OptionInheritanceStackEntryFactory } from './application/services/option-hierarchy/csp/option-stack-entry.factory';
import { OptionGroupMetaFactory } from './application/services/option-hierarchy/csp/option-group-meta.factory';
import { DhcpOptionRawMapper } from './application/services/option-hierarchy/csp/dhcp-option-raw.mapper';

// --- String Sanitizer (neu) ---
import { EncodingSanitizer } from './application/services/import/transformers/encoding-sanitizer.interface';
import { DefaultEncodingSanitizerService } from './application/services/import/transformers/default-encoding-sanitizer.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [
        CspCredentialEntity,
        UserEntity,
        AddressBlock,
        AddressBlockDhcpOption,
        AddressBlockOptionGroup,
        Subnet,
        SubnetDhcpOption,
        SubnetOptionGroup,
        Range,
        RangeDhcpOption,
        RangeExclusion,
        RangeOptionGroup,
        OptionGroup,
        OptionGroupDhcpOption,
        OptionCodeEntity,
        OptionSpace,
        OptionFilter,
        IpSpace,
        IpSpaceDhcpOption,
        IpSpaceOptionGroup,
        DhcpGlobalConfig,
        DhcpGlobalConfigOption,
        DhcpGlobalConfigOptionGroup,
        FixedAddress,
        FixedDhcpOption,
        FixedAddressOptionGroup,
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      CspCredentialEntity,
      UserEntity,
      AddressBlock,
      AddressBlockDhcpOption,
      AddressBlockOptionGroup,
      Subnet,
      SubnetDhcpOption,
      SubnetOptionGroup,
      Range,
      RangeDhcpOption,
      RangeExclusion,
      RangeOptionGroup,
      OptionGroup,
      OptionGroupDhcpOption,
      OptionCodeEntity,
      OptionSpace,
      OptionFilter,
      IpSpace,
      IpSpaceDhcpOption,
      IpSpaceOptionGroup,
      DhcpGlobalConfig,
      DhcpGlobalConfigOption,
      DhcpGlobalConfigOptionGroup,
      FixedAddress,
      FixedDhcpOption,
      FixedAddressOptionGroup,
    ]),
  ],
  controllers: [
    AppController,
    ImportController,
    ImportRawDataController,
    CredentialsCspController,
    AuthController,
    CspFullImportController,
    CspLightTreeController,
    EffectiveDhcpOptionStackController,
    OptionOverviewController,
  ],
  providers: [
    // Auth + Clients
    CredentialCspService,
    GridAuthProvider,
    CspAuthProvider,
    CspApiKeyVerifierService,
    CspAuthLoginService,
    NiosClient,
    CspAuthClient,
    CspDataClient,
    ApiConfigService,

    // Import
    DhcpCspImportOrchestratorService,
    CspSubnetImportService,
    CspOptionGroupImportService,
    CspOptionGroupDhcpOptionImportService,
    CspIpSpaceImportService,
    CspAddressBlockImportService,
    CspRangeImportService,
    CspFixedAddressImportService,
    CspGlobalConfigImportService,
    CspConfigProfileImportService,
    CspOptionCodeImportService,
    CspOptionSpaceImportService,
    CspOptionFilterImportService,

    // Tree Loader
    GlobalLightTreeLoaderService,

    // Repositories
    GlobalConfigOptionRepository,
    IpSpaceDhcpOptionRepository,
    AddressBlockDhcpOptionRepository,
    SubnetDhcpOptionRepository,
    RangeDhcpOptionRepository,
    FixedDhcpOptionRepository,
    AllDhcpOptionAssignmentRepository,

    // Stack Services (neue Architektur)
    EffectiveDhcpOptionStackService,
    ContextChainBuilder,
    ExplicitOptionsLoader,
    OptionGroupsLoader,
    OptionStackAssemblerService,
    StackBuilderService,
    SlimDtoFactoryService,
    OptionInheritanceStackEntryFactory,
    OptionGroupMetaFactory,
    DhcpOptionRawMapper,

    // Option Overview & Explorer
    OptionOverviewService,
    OptionValuesService,
    OptionValueEffectivenessService,
    OptionValueExplicitService,

    DefaultEncodingSanitizerService,
    {
      provide: EncodingSanitizer,
      useClass: DefaultEncodingSanitizerService,
    },
  ],
})
export class AppModule {}
