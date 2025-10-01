import type { Env, AuditLog, User } from '../types';
import { generateId } from './auth';

/**
 * Log an audit event to both D1 and KV
 */
export async function logAudit(
  env: Env,
  data: {
    user_id: string;
    event_type: string;
    resource_type?: string;
    resource_id?: string;
    action: string;
    description?: string;
    ip_address?: string;
    user_agent?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const id = generateId('aud');

  const auditLog: Partial<AuditLog> = {
    id,
    user_id: data.user_id,
    event_type: data.event_type,
    resource_type: data.resource_type,
    resource_id: data.resource_id,
    action: data.action,
    description: data.description,
    ip_address: data.ip_address,
    user_agent: data.user_agent,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
  };

  // Write to D1
  await env.DB.prepare(
    `INSERT INTO audit_logs (
      id, user_id, event_type, resource_type, resource_id,
      action, description, ip_address, user_agent, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      auditLog.user_id,
      auditLog.event_type,
      auditLog.resource_type || null,
      auditLog.resource_id || null,
      auditLog.action,
      auditLog.description || null,
      auditLog.ip_address || null,
      auditLog.user_agent || null,
      auditLog.metadata || null
    )
    .run();

  // Also store in KV for fast recent access (TTL 30 days)
  await env.AUDIT_LOGS_KV.put(
    `audit:${id}`,
    JSON.stringify(auditLog),
    { expirationTtl: 30 * 24 * 60 * 60 }
  );
}

/**
 * Get suspicious activity (high-risk audit events)
 */
export async function getSuspiciousActivity(env: Env, limit: number = 50): Promise<AuditLog[]> {
  const suspiciousEvents = [
    'DELETE',
    'BULK_DELETE',
    'PERMISSION_CHANGE',
    'ROLE_ESCALATION',
    'FAILED_LOGIN_ATTEMPT',
    'DATA_EXPORT',
  ];

  const { results } = await env.DB.prepare(
    `SELECT * FROM audit_logs
     WHERE event_type IN (${suspiciousEvents.map(() => '?').join(',')})
     ORDER BY timestamp DESC
     LIMIT ?`
  )
    .bind(...suspiciousEvents, limit)
    .all<AuditLog>();

  return results || [];
}

/**
 * Get user's audit trail
 */
export async function getUserAuditTrail(
  env: Env,
  userId: string,
  limit: number = 100
): Promise<AuditLog[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM audit_logs
     WHERE user_id = ?
     ORDER BY timestamp DESC
     LIMIT ?`
  )
    .bind(userId, limit)
    .all<AuditLog>();

  return results || [];
}
