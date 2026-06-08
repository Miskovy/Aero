import { IsString, IsOptional, IsArray, MaxLength, MinLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ description: 'A friendly name for this webhook', example: 'GitHub Push Hook' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Webhook provider', enum: ['github', 'gitlab', 'bitbucket', 'custom'], default: 'github' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Events to listen for', example: ['push'], default: ['push'] })
  @IsOptional()
  @IsArray()
  events?: string[];

  @ApiPropertyOptional({ description: 'Branch filter — only trigger on pushes to this branch', example: 'main' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branchFilter?: string;
}
