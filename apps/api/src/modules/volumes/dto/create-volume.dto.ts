import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVolumeDto {
  @ApiProperty({ example: 'data-vol' })
  @IsString()
  name: string;

  @ApiProperty({ example: '/var/lib/data' })
  @IsString()
  mount_path: string;

  @ApiProperty({ example: '/var/aero/volumes/data', required: false })
  @IsString()
  @IsOptional()
  host_path?: string;

  @ApiProperty({ example: 'local', required: false })
  @IsString()
  @IsOptional()
  driver?: string;
}
