/**
 * OASIS Sync Service
 * Scheduled synchronization of rejection data from OASIS to RCM
 */

import { OASISClient } from '../client/OASISClient';
import { ClaimExtractor } from '../extractors/ClaimExtractor';
import { OASISToRCMTransformer } from '../transformers/OASISToRCMTransformer';
import { AuditLogger } from '../utils/auditLogger';
import { OASISCredentials, OASISSyncConfig, OASISIntegrationStatus } from '../types/oasis.types';
import { OASISToRCMSyncResult, RCMRejectionRecord } from '../types/rcm.types';
import pino from 'pino';

const logger = pino({ name: 'SyncService' });

export class SyncService {
  private client: OASISClient;
  private extractor: ClaimExtractor;
  private transformer: OASISToRCMTransformer;
  private auditLogger: AuditLogger;
  private config: OASISSyncConfig;
  private syncInterval?: NodeJS.Timeout;
  private status: OASISIntegrationStatus;

  constructor(
    credentials: OASISCredentials,
    config: OASISSyncConfig,
    private onDataReady: (records: RCMRejectionRecord[]) => Promise<void>
  ) {
    this.auditLogger = new AuditLogger();
    this.client = new OASISClient(credentials, this.auditLogger);
    this.extractor = new ClaimExtractor(this.client);
    this.transformer = new OASISToRCMTransformer();
    this.config = config;

    this.status = {
      connected: false,
      lastSyncStatus: 'NEVER_RAN',
      statistics: {
        totalClaimsProcessed: 0,
        totalRejectionsFound: 0,
        lastBatchSize: 0,
      },
    };
  }

  /**
   * Start the sync service
   */
  async start(): Promise<void> {
    logger.info({ config: this.config }, 'Starting OASIS sync service...');

    if (!this.config.enabled) {
      logger.info('Sync service is disabled in configuration');
      return;
    }

    try {
      // Initialize client
      await this.client.initialize();
      await this.client.authenticate();

      this.status.connected = true;
      logger.info('OASIS client connected successfully');

      // Run initial sync
      await this.runSync();

      // Schedule periodic syncs
      if (this.config.syncInterval > 0) {
        const intervalMs = this.config.syncInterval * 60 * 1000;
        this.syncInterval = setInterval(() => {
          this.runSync().catch(error => {
            logger.error({ error }, 'Scheduled sync failed');
          });
        }, intervalMs);

        this.status.nextScheduledSync = new Date(Date.now() + intervalMs);
        logger.info({ interval: this.config.syncInterval }, 'Scheduled sync enabled');
      }

      await this.auditLogger.log({
        timestamp: new Date().toISOString(),
        action: 'SYNC_SERVICE_START',
        userId: 'system',
        resourceType: 'SERVICE',
        resourceId: 'oasis-sync',
        details: { config: this.config },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to start sync service');
      this.status.connected = false;
      this.status.lastSyncStatus = 'FAILED';
      this.status.lastSyncError = String(error);
      throw error;
    }
  }

  /**
   * Stop the sync service
   */
  async stop(): Promise<void> {
    logger.info('Stopping OASIS sync service...');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    await this.client.close();

    this.status.connected = false;

    await this.auditLogger.log({
      timestamp: new Date().toISOString(),
      action: 'SYNC_SERVICE_STOP',
      userId: 'system',
      resourceType: 'SERVICE',
      resourceId: 'oasis-sync',
      details: { statistics: this.status.statistics },
    });

    logger.info('Sync service stopped');
  }

  /**
   * Run a single sync operation
   */
  async runSync(): Promise<OASISToRCMSyncResult> {
    const syncId = `SYNC-${Date.now()}`;
    const startTime = new Date().toISOString();

    logger.info({ syncId }, 'Starting sync operation...');

    const result: OASISToRCMSyncResult = {
      syncId,
      startTime,
      endTime: '',
      duration: 0,
      source: {
        system: 'OASIS',
        dateRange: {
          from: '',
          to: '',
        },
      },
      results: {
        totalFetched: 0,
        totalProcessed: 0,
        totalImported: 0,
        totalSkipped: 0,
        totalErrors: 0,
      },
      imported: {
        newRejections: 0,
        updatedRejections: 0,
        rejectionIds: [],
      },
      skipped: [],
      errors: [],
      status: 'SUCCESS',
    };

    try {
      // Calculate date range
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - this.config.lookbackDays);

      result.source.dateRange = {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      };

      logger.info({ dateRange: result.source.dateRange }, 'Fetching rejections...');

      // Extract rejections from OASIS
      const rejections = await this.extractor.extractRejections({
        fromDate: result.source.dateRange.from,
        toDate: result.source.dateRange.to,
        status: this.buildStatusFilter(),
      });

      result.results.totalFetched = rejections.length;
      logger.info({ count: rejections.length }, 'Rejections fetched');

      // Transform and import each rejection
      const transformedRecords: RCMRejectionRecord[] = [];

      for (const rejection of rejections) {
        try {
          // Fetch the full claim details
          const claim = await this.fetchClaimForRejection(rejection.claimNumber);

          if (!claim) {
            result.results.totalSkipped++;
            result.skipped.push({
              claimNumber: rejection.claimNumber,
              reason: 'Claim details not found',
            });
            continue;
          }

          // Transform to RCM format
          const rcmRecord = this.transformer.transform(rejection, claim);
          transformedRecords.push(rcmRecord);

          result.results.totalProcessed++;
        } catch (error) {
          logger.error({ error, claimNumber: rejection.claimNumber }, 'Failed to process rejection');
          result.results.totalErrors++;
          result.errors.push({
            claimNumber: rejection.claimNumber,
            error: String(error),
          });
        }
      }

      // Send to RCM system
      if (transformedRecords.length > 0) {
        await this.onDataReady(transformedRecords);

        result.results.totalImported = transformedRecords.length;
        result.imported.newRejections = transformedRecords.length;
        result.imported.rejectionIds = transformedRecords.map(r => r.id);

        logger.info({ count: transformedRecords.length }, 'Records imported to RCM');
      }

      // Update statistics
      this.status.statistics.totalClaimsProcessed += result.results.totalProcessed;
      this.status.statistics.totalRejectionsFound += result.results.totalFetched;
      this.status.statistics.lastBatchSize = result.results.totalImported;
      this.status.lastSyncTime = new Date();

      // Determine sync status
      if (result.results.totalErrors === 0) {
        result.status = 'SUCCESS';
        this.status.lastSyncStatus = 'SUCCESS';
      } else if (result.results.totalImported > 0) {
        result.status = 'PARTIAL';
        this.status.lastSyncStatus = 'PARTIAL';
      } else {
        result.status = 'FAILED';
        this.status.lastSyncStatus = 'FAILED';
      }

      // Schedule next sync
      if (this.config.syncInterval > 0) {
        this.status.nextScheduledSync = new Date(Date.now() + this.config.syncInterval * 60 * 1000);
      }

      const endTime = new Date().toISOString();
      result.endTime = endTime;
      result.duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      // Audit log
      await this.auditLogger.log({
        timestamp: new Date().toISOString(),
        action: 'SYNC_COMPLETE',
        userId: 'system',
        resourceType: 'SYNC',
        resourceId: syncId,
        details: result,
      });

      logger.info({ syncId, result }, 'Sync operation completed');

      // Send notification if configured
      if (this.config.notifyOnNewRejections && result.imported.newRejections > 0) {
        await this.sendNotification(result);
      }

      return result;
    } catch (error) {
      logger.error({ error, syncId }, 'Sync operation failed');

      result.status = 'FAILED';
      result.endTime = new Date().toISOString();
      result.duration = new Date(result.endTime).getTime() - new Date(startTime).getTime();
      result.errors.push({
        error: String(error),
      });

      this.status.lastSyncStatus = 'FAILED';
      this.status.lastSyncError = String(error);

      await this.auditLogger.logError('system', error as Error, { syncId });

      throw error;
    }
  }

  /**
   * Get current integration status
   */
  getStatus(): OASISIntegrationStatus {
    return { ...this.status };
  }

  /**
   * Trigger manual sync
   */
  async triggerManualSync(): Promise<OASISToRCMSyncResult> {
    logger.info('Manual sync triggered');

    await this.auditLogger.log({
      timestamp: new Date().toISOString(),
      action: 'MANUAL_SYNC_TRIGGER',
      userId: 'user',
      resourceType: 'SYNC',
      resourceId: 'manual',
      details: {},
    });

    return this.runSync();
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private buildStatusFilter(): ('SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PENDING' | 'UNDER_REVIEW')[] {
    const statuses: ('SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PENDING' | 'UNDER_REVIEW')[] = [];

    if (this.config.syncRejections) {
      statuses.push('REJECTED');
    }

    if (this.config.syncPending) {
      statuses.push('PENDING', 'UNDER_REVIEW');
    }

    if (this.config.syncApproved) {
      statuses.push('APPROVED');
    }

    return statuses.length > 0 ? statuses : ['REJECTED'];
  }

  private async fetchClaimForRejection(claimNumber: string): Promise<any> {
    try {
      // Search for the specific claim
      const searchResult = await this.extractor.searchClaims({
        fromDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year back
        toDate: new Date().toISOString().split('T')[0],
        claimNumber,
      });

      return searchResult.claims[0] || null;
    } catch (error) {
      logger.error({ error, claimNumber }, 'Failed to fetch claim details');
      return null;
    }
  }

  private async sendNotification(result: OASISToRCMSyncResult): Promise<void> {
    if (!this.config.notificationEmail) {
      return;
    }

    logger.info({ email: this.config.notificationEmail, newRejections: result.imported.newRejections },
      'Sending notification...');

    // TODO: Implement email notification
    // For now, just log
    logger.info('Notification sent (implementation pending)');
  }
}
