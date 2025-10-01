import { Hono } from 'hono';
import type { Env, User } from '../types';
import { authMiddleware, requireMinimumRole } from '../middleware/auth';
import { generateId } from '../lib/auth';
import { logAudit } from '../lib/audit';

const letters = new Hono<{ Bindings: Env }>();
letters.use('*', authMiddleware);

letters.post('/', requireMinimumRole('BILLING_STAFF'), async (c) => {
  const user = c.get('user') as User;
  try {
    const body = await c.req.json();
    const id = generateId('ltr');

    await c.env.DB.prepare(
      `INSERT INTO compliance_letters (
        id, rejection_id, letter_type, recipient_name, recipient_email,
        recipient_organization, subject_en, subject_ar, body_en, body_ar,
        status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.rejection_id,
        body.letter_type,
        body.recipient_name,
        body.recipient_email,
        body.recipient_organization || null,
        `Compliance Letter - ${body.letter_type}`,
        `خطاب امتثال - ${body.letter_type}`,
        body.additional_notes || 'Compliance letter generated',
        body.additional_notes || 'خطاب امتثال تم إنشاؤه',
        'SENT',
        user.id,
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    await logAudit(c.env, {
      user_id: user.id,
      event_type: 'CREATE',
      resource_type: 'letter',
      resource_id: id,
      action: 'Created compliance letter',
      ip_address: c.req.header('CF-Connecting-IP') || undefined,
    });

    return c.json({ success: true, data: { id }, message: 'Letter created successfully' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create letter' }, 500);
  }
});

letters.get('/pending', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM compliance_letters WHERE status IN ('DRAFT', 'PENDING') LIMIT 100").all();
  return c.json({ success: true, data: results });
});

export default letters;
