import { Hono } from 'hono';
import type { Env, User, Appeal } from '../types';
import { authMiddleware, requireMinimumRole } from '../middleware/auth';
import { generateId } from '../lib/auth';
import { logAudit } from '../lib/audit';

const appeals = new Hono<{ Bindings: Env }>();
appeals.use('*', authMiddleware);

appeals.post('/', requireMinimumRole('BILLING_STAFF'), async (c) => {
  const user = c.get('user') as User;
  try {
    const body = await c.req.json();
    const id = generateId('app');
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO appeals (
        id, rejection_id, appeal_number, appeal_reason,
        supporting_documents, submission_method, submission_date,
        status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.rejection_id,
        body.appeal_number || `APP-${Date.now()}`,
        body.appeal_reason,
        JSON.stringify(body.supporting_documents || []),
        body.submission_method || 'NPHIES',
        body.submission_date || now.split('T')[0],
        'PENDING',
        user.id,
        now,
        now
      )
      .run();

    await logAudit(c.env, {
      user_id: user.id,
      event_type: 'CREATE',
      resource_type: 'appeal',
      resource_id: id,
      action: 'Created appeal',
      description: `Created appeal for rejection ${body.rejection_id}`,
      ip_address: c.req.header('CF-Connecting-IP') || undefined,
    });

    return c.json({ success: true, data: { id }, message: 'Appeal created successfully' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create appeal' }, 500);
  }
});

appeals.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM appeals ORDER BY created_at DESC LIMIT 100').all<Appeal>();
  return c.json({ success: true, data: results });
});

export default appeals;
