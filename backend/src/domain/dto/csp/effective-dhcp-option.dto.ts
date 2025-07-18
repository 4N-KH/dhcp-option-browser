import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptionSpaceMetaDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() protocol: string;
  @ApiPropertyOptional() comment?: string;
  @ApiPropertyOptional() createdAt?: string;
  @ApiPropertyOptional() updatedAt?: string;
}

export class EffectiveDhcpOptionDto {
  @ApiProperty() code: string;
  @ApiPropertyOptional() name?: string | null;
  @ApiPropertyOptional() type?: string | null;
  @ApiPropertyOptional() value?: string | null;

  @ApiPropertyOptional({ type: OptionSpaceMetaDto })
  optionSpace?: OptionSpaceMetaDto;

  @ApiProperty() sourceLevel: string;
  @ApiPropertyOptional() sourceId?: number | null;

  @ApiProperty() isExplicit: boolean;
  @ApiProperty() isInherited: boolean;
  @ApiPropertyOptional() isOverridden?: boolean;

  @ApiPropertyOptional()
  overriddenBy?: {
    level: string;
    id: number;
    value: string;
  };

  @ApiPropertyOptional() comment?: string | null;
  @ApiPropertyOptional() array?: boolean | null;
  @ApiPropertyOptional() createdAt?: string | null;
  @ApiPropertyOptional() updatedAt?: string | null;
}
