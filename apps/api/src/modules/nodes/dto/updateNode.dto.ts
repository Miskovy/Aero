import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateNodeDto {
  @ApiProperty({ description: 'The name of the physical server/node' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'The hostname or alias of the server' })
  @IsString()
  @IsOptional()
  hostname?: string;

  @ApiProperty({
    required: false,
    description: 'Optional IP address of the server',
  })
  @IsString()
  @IsOptional()
  ip_address?: string;
}
