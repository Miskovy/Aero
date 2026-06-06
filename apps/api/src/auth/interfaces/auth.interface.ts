import { Request } from 'express';

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  html_url: string;
  avatar_url: string;
}

export interface GitHubEmail {
  email: string;
  primary: boolean;
}

/** Request with the refresh token extracted from the HttpOnly cookie */
export interface RefreshTokenRequest extends Request {
  refreshToken: string;
}
