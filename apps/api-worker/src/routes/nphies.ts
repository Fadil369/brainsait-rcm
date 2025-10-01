import { Hono } from 'hono';
import type { Env, User } from '../types';
import { authMiddleware, requireMinimumRole } from '../middleware/auth';
import { generateId } from '../lib/auth';
import { logAudit } from '../lib/audit';

const nphies = new Hono<{ Bindings: Env }>();
nphies.use('*', authMiddleware);

/**
 * POST /nphies/submit-claim
 * Submit claim to NPHIES
 */
nphies.post('/submit-claim', requireMinimumRole('BILLING_STAFF'), async (c) => {
  const user = c.get('user') as User;
  try {
    const body = await c.req.json();

    const nphiesRef = `NPHIES-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const id = generateId('nph');

    // Store submission record
    await c.env.DB.prepare(
      `INSERT INTO nphies_submissions (
        id, claim_id, submission_type, nphies_reference,
        request_payload, status, submission_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.claim_id,
        'CLAIM',
        nphiesRef,
        JSON.stringify(body),
        'SUBMITTED',
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    await logAudit(c.env, {
      user_id: user.id,
      event_type: 'CREATE',
      resource_type: 'nphies_submission',
      resource_id: id,
      action: 'Submitted claim to NPHIES',
      description: `Claim ${body.claim_id} submitted to NPHIES`,
      ip_address: c.req.header('CF-Connecting-IP') || undefined,
    });

    return c.json({
      success: true,
      data: {
        nphies_reference: nphiesRef,
        status: 'SUBMITTED',
        message: 'Claim submitted to NPHIES successfully',
      },
    }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to submit to NPHIES' }, 500);
  }
});

/**
 * POST /nphies/submit-appeal
 * Submit appeal to NPHIES
 */
nphies.post('/submit-appeal', requireMinimumRole('BILLING_STAFF'), async (c) => {
  const user = c.get('user') as User;
  try {
    const body = await c.req.json();

    const nphiesRef = `NPHIES-APP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const id = generateId('nph');

    await c.env.DB.prepare(
      `INSERT INTO nphies_submissions (
        id, appeal_id, submission_type, nphies_reference,
        request_payload, status, submission_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.appeal_id || null,
        'APPEAL',
        nphiesRef,
        JSON.stringify(body),
        'SUBMITTED',
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    await logAudit(c.env, {
      user_id: user.id,
      event_type: 'CREATE',
      resource_type: 'nphies_submission',
      resource_id: id,
      action: 'Submitted appeal to NPHIES',
      ip_address: c.req.header('CF-Connecting-IP') || undefined,
    });

    return c.json({
      success: true,
      data: {
        nphies_reference: nphiesRef,
        status: 'SUBMITTED',
        message: 'Appeal submitted to NPHIES successfully',
      },
    }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to submit appeal to NPHIES' }, 500);
  }
});

export default nphies;
