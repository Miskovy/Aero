import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsObject,
} from 'class-validator';
import { SourceType } from '../../../../generated/prisma/client';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType;

  @IsString()
  @IsOptional()
  repo?: string;

  @IsString()
  @IsOptional()
  branch?: string;

  @IsString()
  @IsOptional()
  dockerImage?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsNumber()
  @IsOptional()
  internalPort?: number;

  @IsObject()
  @IsOptional()
  envVars?: Record<string, string>;

  @IsString()
  @IsOptional()
  buildCmd?: string;

  @IsString()
  @IsOptional()
  startCmd?: string;
}
