/**
 * Common Types
 * Shared types across OASIS integration
 */

// Bilingual text support (Arabic + English)
export interface BilingualText {
  ar: string;
  en: string;
}

// Audit log entry
export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  details?: any;
  ipAddress?: string;
}

// Configuration
export interface Config {
  oasis: {
    baseUrl: string;
    username: string;
    password: string;
    timeout: number;
  };

  sync: {
    enabled: boolean;
    interval: number; // minutes
    lookbackDays: number;
  };

  rcm: {
    apiUrl: string;
    apiKey: string;
  };

  security: {
    encryptionKey: string;
    enableAuditLogging: boolean;
  };
}
