import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AddDomainDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  domain: string;
}
