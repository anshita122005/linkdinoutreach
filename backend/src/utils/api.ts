export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
  };
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

export function errorResponse(message: string, details?: unknown): ApiResponse<never> {
  return {
    success: false,
    error: {
      message,
      details,
    },
  };
}
