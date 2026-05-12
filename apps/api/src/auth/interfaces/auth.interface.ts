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
