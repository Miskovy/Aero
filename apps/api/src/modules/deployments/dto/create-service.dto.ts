import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  repo!: string;

  @IsString()
  @IsNotEmpty()
  branch!: string;

  @IsString()
  @IsOptional()
  buildCmd?: string;

  @IsString()
  @IsOptional()
  startCmd?: string;
}
