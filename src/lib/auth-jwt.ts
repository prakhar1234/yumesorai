/**
 * JWT Authentication Library for Ops/Maestro Admin System
 * Handles JWT creation/verification, password hashing, and cookie management
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '8h';
const COOKIE_NAME = 'maestro_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/ops/maestro',
  maxAge: 8 * 60 * 60, // 8 hours in seconds
};

/**
 * Validate JWT secret is configured
 */
function validateJWTSecret(): Uint8Array {
  console.log('[Auth JWT] validateJWTSecret called');
  console.log('[Auth JWT] JWT_SECRET exists:', !!JWT_SECRET);
  console.log('[Auth JWT] JWT_SECRET length:', JWT_SECRET?.length || 0);

  if (!JWT_SECRET) {
    console.error('[Auth JWT] JWT_SECRET not defined in environment');
    throw new Error('JWT_SECRET environment variable is not set');
  }
  if (JWT_SECRET.length < 32) {
    console.error('[Auth JWT] JWT_SECRET too short, length:', JWT_SECRET.length);
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  console.log('[Auth JWT] JWT_SECRET validation passed');
  return new TextEncoder().encode(JWT_SECRET);
}

/**
 * Sign a JWT token
 */
export async function signJWT(payload: Record<string, any>): Promise<string> {
  const secret = validateJWTSecret();

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(secret);

  return token;
}

/**
 * Verify a JWT token
 */
export async function verifyJWT(
  token: string
): Promise<Record<string, any> | null> {
  try {
    console.log('[Auth JWT] Starting JWT verification');
    const secret = validateJWTSecret();
    console.log('[Auth JWT] Secret validated, length:', JWT_SECRET?.length || 0);

    const verified = await jwtVerify(token, secret);
    console.log('[Auth JWT] Token verified successfully');
    return verified.payload as Record<string, any>;
  } catch (error) {
    console.error('[Auth JWT] JWT verification failed:', error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      console.error('[Auth JWT] Error details:', error.stack);
    }
    return null;
  }
}

// Password hashing functions are in auth-utils.ts (server-only)

/**
 * Validate password strength
 * Requirements: min 12 chars, uppercase, lowercase, number, special char
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Set JWT token in httpOnly cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Clear JWT token cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get JWT token from cookies
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token || null;
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(): Promise<Record<string, any> | null> {
  const token = await getAuthToken();
  if (!token) {
    return null;
  }

  const payload = await verifyJWT(token);
  return payload;
}

/**
 * Create JWT payload for user
 */
export function createUserPayload(userId: string, username: string, email: string) {
  return {
    userId,
    username,
    email,
    iat: Math.floor(Date.now() / 1000),
  };
}

export default {
  signJWT,
  verifyJWT,
  validatePasswordStrength,
  setAuthCookie,
  clearAuthCookie,
  getAuthToken,
  getAuthenticatedUser,
  createUserPayload,
};
