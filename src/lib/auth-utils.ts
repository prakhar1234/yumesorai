/**
 * Server-only authentication utilities
 * This module uses bcrypt which requires Node.js runtime
 */

'use server';

import * as bcrypt from 'bcrypt';

/**
 * Hash a password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
