export interface NestHttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}