import { RateLimiterMemory } from "rate-limiter-flexible";

// Initialize rate limiter (memory store for development, can be upgraded to Redis)
const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 requests
  duration: 60, // per 60 seconds
});

export type ApiResponse<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

export async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    await rateLimiter.consume(ip);
    return true;
  } catch {
    return false;
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

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

  // Log to Sentry if configured
  if (typeof window === "undefined" && process.env.SENTRY_DSN) {
    try {
      // Sentry integration would go here
      // For now, just log to console
      console.error(`[Sentry] ${context}: ${errorMessage}`);
    } catch (sentryError) {
      console.error("Failed to log to Sentry:", sentryError);
    }
  }
}
