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
import { EffectiveDhcpOptionStackController } from './controller/effective-dhcp-option-stack.controller'; // <-- NEU
import { DebugController } from './controller/csp-debug.controller';

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
import { AddressBlock } from './infrastructure/database/csp/address-block.entity';
import { AddressBlockDhcpOption } from './infrastructure/database/csp/address-block-dhcp-option.entity';
import { AddressBlockOptionGroup } from './infrastructure/database/csp/address-block-option-group.entity';
import { CspCredentialEntity } from './infrastructure/database/csp/csp-credential.entity';
import { DhcpGlobalConfig } from './infrastructure/database/csp/global-config.entity';
import { DhcpGlobalConfigOption } from './infrastructure/database/csp/global-config-option.entity';
import { DhcpGlobalConfigOptionGroup } from './infrastructure/database/csp/global-config-option-group.entity';
import { FixedAddress } from './infrastructure/database/csp/fixed-address.entity';
import { FixedDhcpOption } from './infrastructure/database/csp/fixed-dhcp-option.entity';
import { FixedAddressOptionGroup } from './infrastructure/database/csp/fixed-address-option-group.entity';
import { IpSpace } from './infrastructure/database/csp/ip-space.entity';
import { IpSpaceDhcpOption } from './infrastructure/database/csp/ip-space-dhcp-option.entity';
import { IpSpaceOptionGroup } from './infrastructure/database/csp/ip-space-option-group.entity';
import { OptionCodeEntity } from './infrastructure/database/csp/option-code.entity';
import { OptionFilter } from './infrastructure/database/csp/option-filter.entity';
import { OptionGroup } from './infrastructure/database/csp/option-group.entity';
import { OptionGroupDhcpOption } from './infrastructure/database/csp/option-group-dhcp-option.entity';
import { OptionSpace } from './infrastructure/database/csp/option-space.entity';
import { Range } from './infrastructure/database/csp/range.entity';
import { RangeDhcpOption } from './infrastructure/database/csp/range-dhcp-option.entity';
import { RangeExclusion } from './infrastructure/database/csp/range-exclusion.entity';
import { RangeOptionGroup } from './infrastructure/database/csp/range-option-group.entity';
import { Subnet } from './infrastructure/database/csp/subnet.entity';
import { SubnetDhcpOption } from './infrastructure/database/csp/subnet-dhcp-option.entity';
import { SubnetOptionGroup } from './infrastructure/database/csp/subnet-option-group.entity';
import { UserEntity } from './infrastructure/database/csp/user.entity';

// --- DHCP Hierarchy Services ---
import { GlobalLightTreeLoaderService } from './application/services/option-hierarchy/csp/mappers/light-tree/global-light-tree-loader.service';

// --- Option Repositories (provide them for DI) ---
import {
  GlobalConfigOptionRepository,
  IpSpaceDhcpOptionRepository,
  AddressBlockDhcpOptionRepository,
  SubnetDhcpOptionRepository,
  RangeDhcpOptionRepository,
  FixedDhcpOptionRepository,
} from './infrastructure/database/csp';

// --- EFFECTIVE STACK SERVICES (SOLID) ---
import { EffectiveDhcpOptionStackService } from './application/services/option-hierarchy/csp/effective-dhcp-option-stack.service';
import { ContextChainBuilder } from './application/services/option-hierarchy/csp/context-chain.builder';
import { ExplicitOptionsLoader } from './application/services/option-hierarchy/csp/types/explicit-options.loader';
import { OptionGroupsLoader } from './application/services/option-hierarchy/csp/types/option-groups.loader';
import { OptionStackAssembler } from './application/services/option-hierarchy/csp/types/option-stack.assembler';
import { OptionInheritanceStackEntryFactory } from './application/services/option-hierarchy/csp/option-stack-entry.factory';
import { OptionGroupMetaFactory } from './application/services/option-hierarchy/csp/option-group-meta.factory';
import { DhcpOptionRawMapper } from './application/services/option-hierarchy/csp/dhcp-option-raw.mapper';

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
    DebugController, // <-- NEU
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
    GlobalConfigOptionRepository,
    IpSpaceDhcpOptionRepository,
    AddressBlockDhcpOptionRepository,
    SubnetDhcpOptionRepository,
    RangeDhcpOptionRepository,
    FixedDhcpOptionRepository,
    // EFFECTIVE STACK SERVICES (SOLID!)
    EffectiveDhcpOptionStackService,
    ContextChainBuilder,
    ExplicitOptionsLoader,
    OptionGroupsLoader,
    OptionStackAssembler,
    OptionInheritanceStackEntryFactory,
    OptionGroupMetaFactory,
    DhcpOptionRawMapper,
  ],
})
export class AppModule {}
