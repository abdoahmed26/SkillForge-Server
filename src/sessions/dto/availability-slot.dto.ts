import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AvailabilitySlotInputDto {
  @ApiProperty({ example: 0, minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;
}

export class BulkUpdateAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotInputDto] })
  @IsArray()
  @ArrayMaxSize(196)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotInputDto)
  slots: AvailabilitySlotInputDto[];
}

export class UpdateAvailabilitySlotDto {
  @ApiProperty({ example: 0, minimum: 0, maximum: 6, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiProperty({
    example: '09:00',
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
    required: false,
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;
}
