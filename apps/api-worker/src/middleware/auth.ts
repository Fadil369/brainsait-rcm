import { Context, Next } from 'hono';
import type { Env, User } from '../types';
import { extractTokenFromHeader, verifyToken } from '../lib/auth';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to context
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return c.json({ success: false, error: 'No authorization token provided' }, 401);
  }

  try {
    const payload = await verifyToken(token, c.env);

    // Fetch user from database
    const user = await c.env.DB
      .prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
      .bind(payload.user_id)
      .first<User>();

    if (!user) {
      return c.json({ success: false, error: 'User not found or inactive' }, 401);
    }

    // Attach user to context
    c.set('user', user);
    c.set('userId', user.id);

    await next();
  } catch (error) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
}

/**
 * Optional authentication middleware
 * Verifies token if present, but doesn't require it
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    try {
      const payload = await verifyToken(token, c.env);

      const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
        .bind(payload.user_id)
        .first<User>();

      if (user) {
        c.set('user', user);
        c.set('userId', user.id);
      }
    } catch (error) {
      // Token invalid, but we don't fail - just continue without user
    }
  }

  await next();
}

/**
 * Role-based access control middleware
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as User | undefined;

    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          error: 'Insufficient permissions',
          message: `This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Minimum role middleware (hierarchy-based)
 */
export function requireMinimumRole(minimumRole: string) {
  const roleHierarchy: Record<string, number> = {
    'VIEWER': 1,
    'BILLING_STAFF': 2,
    'PHYSICIAN': 3,
    'MANAGER': 4,
    'ADMIN': 5,
  };

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as User | undefined;

    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      return c.json(
        {
          success: false,
          error: 'Insufficient permissions',
          message: `This endpoint requires ${minimumRole} role or higher`,
        },
        403
      );
    }

    await next();
  };
}
