import * as bcrypt from 'bcryptjs';
import * as jose from 'jose';
import type { Env, JWTPayload, User } from '../types';

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(user: User, env: Env): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const expiresIn = parseInt(env.ACCESS_TOKEN_EXPIRE_MINUTES) * 60; // seconds

  const payload: JWTPayload = {
    user_id: user.id,
    email: user.email,
    role: user.role,
  };

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: env.JWT_ALGORITHM || 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secret);

  return jwt;
}

/**
 * Generate JWT refresh token (longer expiry)
 */
export async function generateRefreshToken(user: User, env: Env): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const expiresIn = parseInt(env.REFRESH_TOKEN_EXPIRE_DAYS || '7') * 24 * 60 * 60; // seconds

  const payload: JWTPayload = {
    user_id: user.id,
    email: user.email,
    role: user.role,
  };

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: env.JWT_ALGORITHM || 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secret);

  return jwt;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string, env: Env): Promise<JWTPayload> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Generate random ID
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Role hierarchy check (higher roles include lower roles)
 */
export function hasMinimumRole(userRole: string, minimumRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    'VIEWER': 1,
    'BILLING_STAFF': 2,
    'PHYSICIAN': 3,
    'MANAGER': 4,
    'ADMIN': 5,
  };

  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
}
