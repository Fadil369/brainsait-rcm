import { Hono } from 'hono';
import type { Env, User } from '../types';
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, generateId, verifyToken } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /auth/register
 * Register new user (ADMIN only)
 */
auth.post('/register', authMiddleware, async (c) => {
  const currentUser = c.get('user') as User;

  // Only admins can register new users
  if (currentUser.role !== 'ADMIN') {
    return c.json({ success: false, error: 'Only administrators can register new users' }, 403);
  }

  try {
    const body = await c.req.json();
    const { email, password, full_name, role, department, branch } = body;

    // Validation
    if (!email || !password || !full_name || !role) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    if (password.length < 8) {
      return c.json({ success: false, error: 'Password must be at least 8 characters' }, 400);
    }

    const validRoles = ['ADMIN', 'MANAGER', 'PHYSICIAN', 'BILLING_STAFF', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return c.json({ success: false, error: 'Invalid role' }, 400);
    }

    // Check if email already exists
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existing) {
      return c.json({ success: false, error: 'Email already registered' }, 409);
    }

    // Hash password
    const password_hash = await hashPassword(password);
    const userId = generateId('usr');

    // Insert user
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, department, branch, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    )
      .bind(userId, email, password_hash, full_name, role, department || null, branch || null)
      .run();

    // Audit log
    await logAudit(c.env, {
      user_id: currentUser.id,
      event_type: 'CREATE',
      resource_type: 'user',
      resource_id: userId,
      action: 'User registration',
      description: `Registered new user: ${email} with role ${role}`,
      ip_address: c.req.header('CF-Connecting-IP') || undefined,
      user_agent: c.req.header('User-Agent') || undefined,
    });

    return c.json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: userId,
        email,
        full_name,
        role,
      },
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password required' }, 400);
    }

    // Fetch user
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
      .bind(email)
      .first<User>();

    if (!user) {
      // Audit failed login attempt
      await logAudit(c.env, {
        user_id: 'system',
        event_type: 'FAILED_LOGIN_ATTEMPT',
        action: 'Login failed',
        description: `Failed login attempt for email: ${email}`,
        ip_address: c.req.header('CF-Connecting-IP') || undefined,
        metadata: { email },
      });

      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      // Audit failed login
      await logAudit(c.env, {
        user_id: user.id,
        event_type: 'FAILED_LOGIN_ATTEMPT',
        action: 'Login failed',
        description: 'Invalid password',
        ip_address: c.req.header('CF-Connecting-IP') || undefined,
      });

      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Generate tokens
    const accessToken = await generateAccessToken(user, c.env);
    const refreshToken = await generateRefreshToken(user, c.env);

    // Store session
    const sessionId = generateId('sess');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(c.env.REFRESH_TOKEN_EXPIRE_DAYS || '7'));

    await c.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, refresh_token, access_token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        sessionId,
        user.id,
        refreshToken,
        accessToken,
        c.req.header('CF-Connecting-IP') || null,
        c.req.header('User-Agent') || null,
        expiresAt.toISOString()
      )
      .run();

    // Store in KV for fast access
    await c.env.SESSIONS.put(`session:${sessionId}`, JSON.stringify({ userId: user.id, refreshToken }), {
      expirationTtl: parseInt(c.env.REFRESH_TOKEN_EXPIRE_DAYS || '7') * 24 * 60 * 60,
    });

    // Audit successful login
    await logAudit(c.env, {
      user_id: user.id,
      event_type: 'LOGIN',
      action: 'User login',
      description: 'Successful login',
      ip_address: c.req.header('CF-Connecting-IP') || undefined,
      user_agent: c.req.header('User-Agent') || undefined,
    });

    // Return tokens and user info (without password hash)
    const { password_hash, ...userWithoutPassword } = user;

    return c.json({
      success: true,
      data: {
        user: userWithoutPassword,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: parseInt(c.env.ACCESS_TOKEN_EXPIRE_MINUTES) * 60,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return c.json({ success: false, error: 'Refresh token required' }, 400);
    }

    // Verify refresh token
    const payload = await verifyToken(refresh_token, c.env);

    // Check if session exists and is valid
    const session = await c.env.DB.prepare(
      'SELECT * FROM sessions WHERE refresh_token = ? AND revoked = 0 AND expires_at > ?'
    )
      .bind(refresh_token, new Date().toISOString())
      .first();

    if (!session) {
      return c.json({ success: false, error: 'Invalid or expired refresh token' }, 401);
    }

    // Fetch user
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
      .bind(payload.user_id)
      .first<User>();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }

    // Generate new access token
    const newAccessToken = await generateAccessToken(user, c.env);

    // Update session with new access token
    await c.env.DB.prepare('UPDATE sessions SET access_token = ? WHERE refresh_token = ?')
      .bind(newAccessToken, refresh_token)
      .run();

    const { password_hash, ...userWithoutPassword } = user;

    return c.json({
      success: true,
      data: {
        user: userWithoutPassword,
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: parseInt(c.env.ACCESS_TOKEN_EXPIRE_MINUTES) * 60,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return c.json({ success: false, error: 'Token refresh failed' }, 401);
  }
});

/**
 * POST /auth/logout
 * Logout and revoke session
 */
auth.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user') as User;

  try {
    const body = await c.req.json();
    const { refresh_token } = body;

    if (refresh_token) {
      // Revoke specific session
      await c.env.DB.prepare('UPDATE sessions SET revoked = 1 WHERE refresh_token = ? AND user_id = ?')
        .bind(refresh_token, user.id)
        .run();
    }

    // Audit logout
    await logAudit(c.env, {
      user_id: user.id,
      event_type: 'LOGOUT',
      action: 'User logout',
      description: 'User logged out',
      ip_address: c.req.header('CF-Connecting-IP') || undefined,
    });

    return c.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ success: false, error: 'Logout failed' }, 500);
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const { password_hash, ...userWithoutPassword } = user;

  return c.json({
    success: true,
    data: userWithoutPassword,
  });
});

export default auth;
