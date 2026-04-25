import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'newemail@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'John Doe Jr.' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'New securely hashed password string' })
  @IsString()
  @IsOptional()
  password_hash?: string;
}
