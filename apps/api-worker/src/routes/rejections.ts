import { Hono } from 'hono';
import type { Env, User, Rejection } from '../types';
import { authMiddleware, requireMinimumRole } from '../middleware/auth';
import { generateId } from '../lib/auth';
import { logAudit } from '../lib/audit';

const rejections = new Hono<{ Bindings: Env }>();

// All rejection routes require authentication
rejections.use('*', authMiddleware);

/**
 * GET /rejections
 * List all rejections with filters
 */
rejections.get('/', async (c) => {
  try {
    const { status, tpa_name, from_date, to_date, limit = '100' } = c.req.query();

    let query = 'SELECT * FROM rejections WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (tpa_name) {
      query += ' AND tpa_name = ?';
      params.push(tpa_name);
    }

    if (from_date) {
      query += ' AND submission_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND submission_date <= ?';
      params.push(to_date);
    }

    query += ' ORDER BY submission_date DESC LIMIT ?';
    params.push(parseInt(limit));

    const { results } = await c.env.DB.prepare(query).bind(...params).all<Rejection>();

    return c.json({
      success: true,
      data: results,
      count: results?.length || 0,
    });
  } catch (error) {
    console.error('Get rejections error:', error);
    return c.json({ success: false, error: 'Failed to fetch rejections' }, 500);
  }
});

/**
 * POST /rejections
 * Create new rejection record
 */
rejections.post('/', requireMinimumRole('BILLING_STAFF'), async (c) => {
  const user = c.get('user') as User;

  try {
    const body = await c.req.json();

    const id = generateId('rej');
    const now = new Date().toISOString();

    // Calculate deadline (30 days from submission)
    const deadline = new Date(body.submission_date);
    deadline.setDate(deadline.getDate() + 30);

    await c.env.DB.prepare(
      `INSERT INTO rejections (
        id, claim_id, patient_id, patient_name,
        tpa_name, insurance_company, policy_number,
        billed_amount_net, billed_amount_vat, billed_amount_total,
        rejected_amount_net, rejected_amount_vat, rejected_amount_total,
        service_date, submission_date, rejection_date, response_deadline,
        status, rejection_reason, rejection_code,
        physician_name, specialty,
        is_within_30_days, days_until_deadline,
        nphies_reference, reception_mode,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.claim_id,
        body.patient_id,
        body.patient_name,
        body.tpa_name,
        body.insurance_company,
        body.policy_number || null,
        body.billed_amount?.net || 0,
        body.billed_amount?.vat || 0,
        body.billed_amount?.total || 0,
        body.rejected_amount?.net || 0,
        body.rejected_amount?.vat || 0,
        body.rejected_amount?.total || 0,
        body.service_date,
        body.submission_date,
        body.rejection_date || null,
        deadline.toISOString().split('T')[0],
        body.status || 'PENDING_REVIEW',
        body.rejection_reason,
        body.rejection_code || null,
        body.physician_name || null,
        body.specialty || null,
        1, // is_within_30_days
        30, // days_until_deadline
        body.nphies_reference || null,
        body.reception_mode || null,
        user.id,
        now,
        now
      )
      .run();

    await logAudit(c.env, {
      user_id: user.id,
      event_type: 'CREATE',
      resource_type: 'rejection',
      resource_id: id,
      action: 'Created rejection record',
      description: `Created rejection for claim ${body.claim_id}`,
      ip_address: c.req.header('CF-Connecting-IP') || undefined,
    });

    return c.json({ success: true, data: { id }, message: 'Rejection created successfully' }, 201);
  } catch (error) {
    console.error('Create rejection error:', error);
    return c.json({ success: false, error: 'Failed to create rejection' }, 500);
  }
});

/**
 * GET /rejections/:id
 * Get rejection by ID
 */
rejections.get('/:id', async (c) => {
  const id = c.req.param('id');

  const rejection = await c.env.DB.prepare('SELECT * FROM rejections WHERE id = ?')
    .bind(id)
    .first<Rejection>();

  if (!rejection) {
    return c.json({ success: false, error: 'Rejection not found' }, 404);
  }

  return c.json({ success: true, data: rejection });
});

/**
 * GET /rejections/current-month
 * Get current month's rejections
 */
rejections.get('/stats/current-month', async (c) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM rejections WHERE submission_date >= ? ORDER BY submission_date DESC'
  )
    .bind(startOfMonth)
    .all<Rejection>();

  return c.json({ success: true, data: results, count: results?.length || 0 });
});

export default rejections;
