import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  nodeId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  git_branch?: string;

  @IsOptional()
  @IsString()
  build_command?: string;

  @IsOptional()
  @IsString()
  start_command?: string;

  @IsOptional()
  @IsNumber()
  internal_port?: number;

  @IsOptional()
  @IsNumber()
  replicas?: number;

  @IsOptional()
  @IsObject()
  resource_limits?: Record<string, string>;

  @IsOptional()
  @IsObject()
  health_check?: Record<string, string>;

  @IsOptional()
  @IsObject()
  restart_policy?: Record<string, any>;
}
