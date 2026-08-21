export type ApiResponse<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

export function createApiResponse<T = undefined>(
  success: boolean,
  message: string,
  data?: T
): ApiResponse<T> {
  return {
    success,
    message,
    ...(data !== undefined && { data }),
  };
}

export function createErrorResponse(message: string, data?: Record<string, unknown>): ApiResponse<Record<string, unknown> | undefined> {
  return {
    success: false,
    message,
    ...(data && { data }),
  };
}

export function createSuccessResponse<T = undefined>(
  message: string,
  data?: T
): ApiResponse<T> {
  return {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };
}

export function logError(error: unknown, context: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] Error: ${errorMessage}`, error);
}
