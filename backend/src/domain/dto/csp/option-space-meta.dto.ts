import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptionSpaceMetaDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  protocol: string;

  @ApiPropertyOptional()
  comment?: string | null;

  @ApiPropertyOptional()
  createdAt?: string | null;

  @ApiPropertyOptional()
  updatedAt?: string | null;
}
