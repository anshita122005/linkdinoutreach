import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

export interface HealthResponse {
  success: true;
  data: {
    status: string;
    service: string;
    timestamp: string;
    database: string;
  };
  meta: {
    timestamp: string;
  };
}

export async function getHealthStatus() {
  const response = await apiClient.get<HealthResponse>("/api/v1/health");
  return response.data;
}

export default apiClient;
