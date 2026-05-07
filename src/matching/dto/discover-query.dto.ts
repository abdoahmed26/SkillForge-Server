import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DiscoverQueryDto {
  @ApiPropertyOptional({
    description: 'Number of candidates to return in one batch',
    example: 10,
    minimum: 1,
    maximum: 20,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}
