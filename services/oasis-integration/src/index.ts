/**
 * OASIS Integration Service - Main Entry Point
 * Fastify API server for OASIS+ integration
 */

import Fastify from 'fastify';
import { config } from 'dotenv';
import { SyncService } from './services/SyncService';
import { OASISCredentials, OASISSyncConfig, OASISCredentialsSchema, OASISSyncConfigSchema } from './types/oasis.types';
import { RCMRejectionRecord } from './types/rcm.types';
import pino from 'pino';

config();

const logger = pino({
  name: 'oasis-integration',
  level: process.env.LOG_LEVEL || 'info',
});

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '3002');
const HOST = process.env.HOST || '0.0.0.0';

const credentials: OASISCredentials = {
  username: process.env.OASIS_USERNAME || '',
  password: process.env.OASIS_PASSWORD || '',
  baseUrl: process.env.OASIS_URL || 'http://128.1.1.185/prod/faces/Home',
};

const syncConfig: OASISSyncConfig = {
  enabled: process.env.SYNC_ENABLED === 'true',
  syncInterval: parseInt(process.env.SYNC_INTERVAL || '60'),
  syncRejections: true,
  syncPending: process.env.SYNC_PENDING === 'true',
  syncApproved: process.env.SYNC_APPROVED === 'true',
  lookbackDays: parseInt(process.env.LOOKBACK_DAYS || '30'),
  notifyOnNewRejections: process.env.NOTIFY_ON_REJECTIONS === 'true',
  notificationEmail: process.env.NOTIFICATION_EMAIL,
};

// RCM API configuration
const RCM_API_URL = process.env.RCM_API_URL || 'http://localhost:3000/api';
const RCM_API_KEY = process.env.RCM_API_KEY || '';

// ============================================================================
// Fastify Server
// ============================================================================

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Global sync service instance
let syncService: SyncService | null = null;

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handler for when new rejection data is ready
 * Sends data to RCM API
 */
async function handleDataReady(records: RCMRejectionRecord[]): Promise<void> {
  logger.info({ count: records.length }, 'Sending rejection data to RCM API...');

  try {
    // Send to RCM API
    const response = await fetch(`${RCM_API_URL}/rejections/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RCM_API_KEY}`,
      },
      body: JSON.stringify({ rejections: records }),
    });

    if (!response.ok) {
      throw new Error(`RCM API returned ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    logger.info({ result }, 'Successfully imported rejections to RCM');
  } catch (error) {
    logger.error({ error }, 'Failed to send data to RCM API');
    throw error;
  }
}

// ============================================================================
// Routes
// ============================================================================

/**
 * Health check
 */
server.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    service: 'oasis-integration',
    timestamp: new Date().toISOString(),
  };
});

/**
 * Get integration status
 */
server.get('/api/status', async (request, reply) => {
  if (!syncService) {
    return {
      connected: false,
      message: 'Sync service not started',
    };
  }

  return syncService.getStatus();
});

/**
 * Start sync service
 */
server.post('/api/sync/start', async (request, reply) => {
  if (syncService) {
    return reply.code(400).send({
      error: 'Sync service already running',
    });
  }

  try {
    // Validate credentials
    OASISCredentialsSchema.parse(credentials);
    OASISSyncConfigSchema.parse(syncConfig);

    syncService = new SyncService(credentials, syncConfig, handleDataReady);
    await syncService.start();

    return {
      message: 'Sync service started successfully',
      config: syncConfig,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to start sync service');
    return reply.code(500).send({
      error: 'Failed to start sync service',
      details: String(error),
    });
  }
});

/**
 * Stop sync service
 */
server.post('/api/sync/stop', async (request, reply) => {
  if (!syncService) {
    return reply.code(400).send({
      error: 'Sync service not running',
    });
  }

  try {
    await syncService.stop();
    syncService = null;

    return {
      message: 'Sync service stopped successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Failed to stop sync service');
    return reply.code(500).send({
      error: 'Failed to stop sync service',
      details: String(error),
    });
  }
});

/**
 * Trigger manual sync
 */
server.post('/api/sync/trigger', async (request, reply) => {
  if (!syncService) {
    return reply.code(400).send({
      error: 'Sync service not running',
    });
  }

  try {
    const result = await syncService.triggerManualSync();
    return result;
  } catch (error) {
    logger.error({ error }, 'Manual sync failed');
    return reply.code(500).send({
      error: 'Manual sync failed',
      details: String(error),
    });
  }
});

/**
 * Update sync configuration
 */
server.put<{ Body: Partial<OASISSyncConfig> }>('/api/config', async (request, reply) => {
  try {
    const newConfig = { ...syncConfig, ...request.body };

    // Validate new config
    OASISSyncConfigSchema.parse(newConfig);

    // Update config
    Object.assign(syncConfig, newConfig);

    logger.info({ config: syncConfig }, 'Configuration updated');

    return {
      message: 'Configuration updated successfully',
      config: syncConfig,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to update configuration');
    return reply.code(400).send({
      error: 'Invalid configuration',
      details: String(error),
    });
  }
});

/**
 * Get current configuration
 */
server.get('/api/config', async (request, reply) => {
  return {
    ...syncConfig,
    // Don't expose credentials
  };
});

// ============================================================================
// Startup
// ============================================================================

async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });

    logger.info(`
╔════════════════════════════════════════════════════════════╗
║         OASIS Integration Service Started                  ║
║         Port: ${PORT}                                        ║
║         Environment: ${process.env.NODE_ENV || 'development'}                               ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Auto-start sync if enabled
    if (syncConfig.enabled) {
      logger.info('Auto-starting sync service...');
      syncService = new SyncService(credentials, syncConfig, handleDataReady);
      await syncService.start();
    }
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  if (syncService) {
    await syncService.stop();
  }

  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');

  if (syncService) {
    await syncService.stop();
  }

  await server.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  start();
}

export { server, start };
