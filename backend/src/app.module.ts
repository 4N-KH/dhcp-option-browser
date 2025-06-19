import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { AppService } from './app.service';
import { AppController } from './app.controller';

import { DhcpOption } from './infrastructure/database/dhcp-option.entity';
import { CredentialEntity } from './infrastructure/database/credential.entity';

import { DhcpOptionController } from './controller/dhcp-option.controller';
import { DhcpManagerService } from './application/dhcp-manager.service';

import { AuthController } from './controller/auth.controller';
import { AuthService } from './application/auth.service';
import { CredentialService } from './application/services/credential.service';

import { GridAuthProvider } from './application/providers/grid-auth.provider';
import { CspAuthProvider } from './application/providers/csp-auth.provider';

import { NiosClient } from './infrastructure/api-clients/nios.client';
import { CspClient } from './infrastructure/api-clients/csp.client';

// CSP-specific imports
import { CspDataClient } from './infrastructure/api-clients/csp-data.client';
import { ApiConfigService } from './shared/config/api-config.service';
import { SubnetController } from './controller/subnet.controller';
import { DebugController } from './controller/debug.controller';

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
      entities: [DhcpOption, CredentialEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([DhcpOption, CredentialEntity]),
  ],
  controllers: [
    AppController,
    DebugController,
    DhcpOptionController,
    AuthController,
    SubnetController,
  ],
  providers: [
    AppService,
    DhcpManagerService,
    AuthService,
    CredentialService,
    GridAuthProvider,
    CspAuthProvider,
    NiosClient,
    CspClient,
    CspDataClient,
    ApiConfigService,
  ],
})
export class AppModule {}
