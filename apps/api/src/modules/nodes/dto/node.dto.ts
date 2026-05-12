import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNodeDto {
  @ApiProperty({ description: 'The name of the physical server/node' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The hostname or alias of the server' })
  @IsString()
  @IsNotEmpty()
  hostname: string;

  @ApiProperty({
    required: false,
    description: 'Optional IP address of the server',
  })
  @IsString()
  @IsOptional()
  ip_address?: string;
}
