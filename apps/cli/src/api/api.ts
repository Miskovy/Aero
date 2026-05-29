import axios, { AxiosRequestConfig, AxiosError } from "axios";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.aero');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function loadStoredToken(): string | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(data);
      return config.token || null;
    }
  } catch { /* Ignore read errors */ }
  return null;
}

export function saveStoredToken(token: string | null) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token }), 'utf-8');
    cliState.token = token; // Update memory state too
  } catch (err) {
    console.error('Failed to save configuration file.', err);
  }
}

export const cliState = {
  token: loadStoredToken(),
};

export const apiClient = axios.create({
  baseURL: "https://aero-y6mm.onrender.com",
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  if (cliState.token && config.headers) {
    config.headers.Authorization = `Bearer ${cliState.token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error: AxiosError) => {
    const serverMessage = (error.response?.data as any)?.message;
    const errorMessage = serverMessage || error.message || 'An unknown API error occurred.';
    return Promise.reject(new Error(errorMessage));
  }
);

export async function apiRequest<T = any>(config: AxiosRequestConfig): Promise<T> {
  return apiClient.request<any, T>(config);
}


export async function exchangeGithubTokenWithAero(githubAccessToken: string): Promise<{ access_token: string }> {
  return apiRequest({
    method: 'POST',
    url: '/auth/github/exchange',
    data: { accessToken: githubAccessToken }
  });
}