import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';
import { OptionGroupMetaDto } from './option-group-meta.dto';
import { OptionSpaceMetaDto } from './option-space-meta.dto';

export class OptionInheritanceStackEntryDto {
  @ApiProperty({ enum: ObjectType })
  level: ObjectType;

  @ApiProperty()
  levelId: number;

  @ApiProperty()
  value: string | null;

  @ApiProperty()
  isExplicit: boolean;

  @ApiProperty()
  isInherited: boolean;

  @ApiProperty()
  isOverridden: boolean;

  @ApiPropertyOptional()
  overriddenBy?: {
    level: ObjectType;
    levelId: number;
    value: string | null;
    optionGroup?: {
      id: number;
      name: string;
      comment?: string | null;
    };
  };

  @ApiPropertyOptional({ type: OptionGroupMetaDto })
  optionGroup?: OptionGroupMetaDto | null;

  @ApiPropertyOptional()
  comment?: string | null;

  @ApiPropertyOptional()
  createdAt?: string | null;

  @ApiPropertyOptional()
  updatedAt?: string | null;

  @ApiPropertyOptional()
  name: string | null;

  @ApiPropertyOptional()
  type?: string | null;

  @ApiPropertyOptional()
  array?: boolean | null;

  @ApiPropertyOptional()
  optionCodeComment?: string | null;

  @ApiPropertyOptional()
  optionCodeSource?: string | null;

  @ApiPropertyOptional({ type: OptionSpaceMetaDto })
  optionSpace?: OptionSpaceMetaDto | null;

  // === Redundanz-Information ===
  @ApiPropertyOptional()
  redundant?: boolean;

  @ApiPropertyOptional()
  redundantWith?: {
    code: string;
    level: ObjectType;
    levelId: number;
    groupId?: number;
    groupName?: string;
    value?: string | null;
  };
}
