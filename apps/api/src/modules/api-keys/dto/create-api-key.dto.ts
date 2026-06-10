import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'A friendly name for this API key',
    example: 'CI/CD Pipeline Key',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Organization to scope this key to' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Permissions array',
    example: ['*'],
    default: ['*'],
  })
  @IsOptional()
  @IsArray()
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Expiration date (ISO 8601). Null = never expires.',
    example: '2027-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
