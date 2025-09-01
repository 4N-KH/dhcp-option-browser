import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

// --- Redundancy Overview ---
import { RedundancyOverviewController } from './controller/redundancy-overview.controller';
import { RedundancyOverviewService } from './application/services/option-hierarchy/csp/redundancy-overview.service';

// --- Option Group Overview ---
import { OptionGroupOverviewController } from './controller/option-group-overview.controller';
import { OptionGroupOverviewService } from './application/services/option-hierarchy/csp/option-group-overview.service';
import { OptionGroupOverviewRepository } from './infrastructure/database/csp/option-group-overview.repository';

// --- Import Services & Orchestrator ---
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

// --- EFFECTIVE STACK SERVICES ---
import { EffectiveDhcpOptionStackService } from './application/services/option-hierarchy/csp/effective-dhcp-option-stack.service';
import { ContextChainBuilder } from './application/services/option-hierarchy/csp/context-chain.builder';
import { ExplicitOptionsLoader } from './application/services/option-hierarchy/csp/types/explicit-options.loader';
import { OptionGroupsLoader } from './application/services/option-hierarchy/csp/types/option-groups.loader';
import { OptionStackAssemblerService } from './application/services/option-hierarchy/csp/types/option-stack-assembler/option-stack-assembler-orchestrator.service';
import { StackBuilderService } from './application/services/option-hierarchy/csp/types/option-stack-assembler/stack-builder.service';
import { SlimDtoFactoryService } from './application/services/option-hierarchy/csp/types/option-stack-assembler/slim-dto-factory.service';
import { OptionInheritanceStackEntryFactory } from './application/services/option-hierarchy/csp/option-stack-entry.factory';
import { OptionGroupMetaFactory } from './application/services/option-hierarchy/csp/option-group-meta.factory';
import { DhcpOptionRawMapper } from './application/services/option-hierarchy/csp/dhcp-option-raw.mapper';

// --- String Sanitizer ---
import { EncodingSanitizer } from './application/services/import/transformers/encoding-sanitizer.interface';
import { DefaultEncodingSanitizerService } from './application/services/import/transformers/default-encoding-sanitizer.service';

// --- NEW: Use-Case & Repository-Port/Adapter ---
import { StartFullImportUseCase } from './application/use-cases/start-full-import.usecase';
import { InMemoryImportJobRepositoryAdapter } from './infrastructure/repositories/inmemory-import-job.repository.adapter';

// --- NEW: Tokens & Config for orchestrated steps ---
import {
  IMPORT_CONFIG,
  IMPORT_STEPS,
} from './application/services/import/tokens';
import { DefaultImportConfig } from './infrastructure/config/default-import.config';

// --- Types for step wiring ---
import { ImportStepPort } from './domain/ports/import-step.port';

// --- NEW: Performance Indexes Service ---
import { CreatePerformanceIndexesService } from './application/services/maintenance/create-performance-indexes.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('TypeORM');
        const host = config.get<string>('DB_HOST');
        const port = Number(config.get('DB_PORT') || 5432);
        const username = config.get<string>('DB_USERNAME');
        const database = config.get<string>('DB_NAME');
        const password = String(config.get('DB_PASSWORD') ?? '');
        logger.log(
          `Initialising TypeORM (host=${host}, port=${port}, db=${database}, user=${username}, password=[hidden])`,
        );

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
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
        };
      },
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
    CredentialsCspController,
    AuthController,
    CspFullImportController,
    CspLightTreeController,
    EffectiveDhcpOptionStackController,
    OptionOverviewController,
    RedundancyOverviewController,
    OptionGroupOverviewController,
  ],
  providers: [
    // Auth / API / Shared
    CredentialCspService,
    GridAuthProvider,
    CspAuthProvider,
    CspApiKeyVerifierService,
    CspAuthLoginService,
    NiosClient,
    CspAuthClient,
    CspDataClient,
    ApiConfigService,

    // Import Services
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

    // Hierarchy / Repositories
    GlobalLightTreeLoaderService,
    GlobalConfigOptionRepository,
    IpSpaceDhcpOptionRepository,
    AddressBlockDhcpOptionRepository,
    SubnetDhcpOptionRepository,
    RangeDhcpOptionRepository,
    FixedDhcpOptionRepository,
    AllDhcpOptionAssignmentRepository,

    // Effective Stack
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

    // Option / Redundancy Overview
    OptionOverviewService,
    OptionValuesService,
    OptionValueEffectivenessService,
    OptionValueExplicitService,
    RedundancyOverviewService,
    OptionGroupOverviewService,
    OptionGroupOverviewRepository,

    // Use-Case & Repo Binding
    StartFullImportUseCase,
    InMemoryImportJobRepositoryAdapter,
    {
      provide: 'ImportJobRepositoryPort',
      useClass: InMemoryImportJobRepositoryAdapter,
    },

    // Import Config & Steps
    { provide: IMPORT_CONFIG, useClass: DefaultImportConfig },
    {
      provide: IMPORT_STEPS,
      useFactory: (
        optionSpace: CspOptionSpaceImportService,
        optionCode: CspOptionCodeImportService,
        optionGroup: CspOptionGroupImportService,
        optionGroupDhcp: CspOptionGroupDhcpOptionImportService,
        globalConfig: CspGlobalConfigImportService,
        configProfiles: CspConfigProfileImportService,
        ipSpaces: CspIpSpaceImportService,
        addressBlocks: CspAddressBlockImportService,
        subnets: CspSubnetImportService,
        ranges: CspRangeImportService,
        fixedAddresses: CspFixedAddressImportService,
      ): ReadonlyArray<ImportStepPort> => {
        const step = (
          name: string,
          fn: (args: {
            onProgress?: (current: number, total: number) => void;
            isCancelled?: () => boolean;
          }) => Promise<unknown>,
        ): ImportStepPort => ({
          name,
          run: async (args) => {
            await fn(args);
          },
        });

        return [
          step('optionSpaces', (args) => optionSpace.importOptionSpaces(args)),
          step('optionCodes', (args) => optionCode.importOptionCodes(args)),
          step('optionGroups', (args) => optionGroup.importOptionGroups(args)),
          step('optionGroupDhcpOptions', (args) =>
            optionGroupDhcp.importOptionGroupDhcpOptions(args),
          ),
          step('globalConfig', (args) =>
            globalConfig.importGlobalDhcpConfig(args),
          ),
          step('configProfiles', (args) =>
            configProfiles.importConfigProfiles(args),
          ),
          step('ipSpaces', (args) => ipSpaces.importIpSpaces(args)),
          step('addressBlocks', (args) =>
            addressBlocks.importAddressBlocks(args),
          ),
          step('subnets', (args) => subnets.importSubnets(args)),
          step('ranges', (args) => ranges.importRanges(args)),
          step('fixedAddresses', (args) =>
            fixedAddresses.importFixedAddresses(args),
          ),
        ];
      },
      inject: [
        CspOptionSpaceImportService,
        CspOptionCodeImportService,
        CspOptionGroupImportService,
        CspOptionGroupDhcpOptionImportService,
        CspGlobalConfigImportService,
        CspConfigProfileImportService,
        CspIpSpaceImportService,
        CspAddressBlockImportService,
        CspSubnetImportService,
        CspRangeImportService,
        CspFixedAddressImportService,
      ],
    },

    // Sanitizer
    DefaultEncodingSanitizerService,
    { provide: EncodingSanitizer, useClass: DefaultEncodingSanitizerService },

    // NEW: Performance Indexes at startup
    CreatePerformanceIndexesService,
  ],
})
export class AppModule {}
