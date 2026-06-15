import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiPropertyOptional({
    description: 'The current password (required if a password is set)',
  })
  @IsString()
  @IsOptional()
  current_password?: string;

  @ApiProperty({ description: 'The new password (min 8 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  new_password: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;
}
