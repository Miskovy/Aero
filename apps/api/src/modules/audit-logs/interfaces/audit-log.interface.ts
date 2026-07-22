import { PaginationDto } from '../../../common/dto/pagination.dto';

export interface AuditLogQueryDto extends PaginationDto {
  action?: string;
  resource_type?: string;
  user_id?: string;
}
