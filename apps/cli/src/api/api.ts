import axios, { AxiosRequestConfig, AxiosError } from "axios";

// (TODO: production CLI, save this to a local file like ~/.aero/config.json)
export const cliState = {
  token: null as string | null,
};

const apiClient = axios.create({
  baseURL: "http://localhost:3500",
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