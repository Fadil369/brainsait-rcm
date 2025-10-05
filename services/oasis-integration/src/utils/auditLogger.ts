/**
 * HIPAA-Compliant Audit Logger
 * Logs all data access and system actions for compliance
 */

import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';
import { AuditLogEntry } from '../types/common.types';

const LOG_DIR = process.env.AUDIT_LOG_PATH || './logs/audit';
const LOG_FILE = path.join(LOG_DIR, `audit-${new Date().toISOString().split('T')[0]}.log`);

export class AuditLogger {
  private logger: pino.Logger;

  constructor() {
    // Ensure log directory exists
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    this.logger = pino(
      {
        name: 'AuditLogger',
        level: 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      pino.destination(LOG_FILE)
    );
  }

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    // HIPAA requirement: All data access must be logged
    this.logger.info({
      auditEntry: {
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      },
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE',
    details?: any
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      action: `DATA_${action}`,
      userId,
      resourceType,
      resourceId,
      details,
    });
  }

  /**
   * Log authentication event
   */
  async logAuth(
    userId: string,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    ipAddress?: string,
    details?: any
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      action: `AUTH_${action}`,
      userId,
      resourceType: 'SESSION',
      resourceId: userId,
      ipAddress,
      details,
    });
  }

  /**
   * Log system error
   */
  async logError(
    userId: string,
    error: Error,
    context?: any
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      action: 'ERROR',
      userId,
      resourceType: 'SYSTEM',
      resourceId: 'ERROR',
      details: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context,
      },
    });
  }
}
