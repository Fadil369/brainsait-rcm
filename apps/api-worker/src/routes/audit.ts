import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware, requireMinimumRole } from '../middleware/auth';
import { getSuspiciousActivity, getUserAuditTrail } from '../lib/audit';

const audit = new Hono<{ Bindings: Env }>();
audit.use('*', authMiddleware);

audit.get('/trail/:userId', requireMinimumRole('MANAGER'), async (c) => {
  const userId = c.req.param('userId');
  const limit = parseInt(c.req.query('limit') || '100');

  const logs = await getUserAuditTrail(c.env, userId, limit);

  return c.json({ success: true, data: logs });
});

audit.get('/suspicious', requireMinimumRole('MANAGER'), async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');

  const logs = await getSuspiciousActivity(c.env, limit);

  return c.json({ success: true, data: logs });
});

export default audit;
