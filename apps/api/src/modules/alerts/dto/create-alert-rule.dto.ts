import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  AlertMetric,
  AlertOperator,
  AlertChannel,
} from '../../../../generated/prisma/client';

export class CreateAlertRuleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  service_id?: string;

  @ApiProperty({ enum: AlertMetric })
  @IsEnum(AlertMetric)
  metric: AlertMetric;

  @ApiProperty({ enum: AlertOperator })
  @IsEnum(AlertOperator)
  operator: AlertOperator;

  @ApiProperty()
  @IsNumber()
  threshold: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  duration_seconds?: number;

  @ApiProperty({ enum: AlertChannel })
  @IsEnum(AlertChannel)
  channel: AlertChannel;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  channel_config?: any;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
