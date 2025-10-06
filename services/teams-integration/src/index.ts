/**
 * BrainSAIT Teams Integration Service
 * Main entry point for Teams stakeholder communication
 */

import { CloudAdapter } from '@microsoft/agents-hosting';
import { TeamsNotificationBot } from './bot/teamsNotificationBot';
import { MongoConversationStore } from './storage/conversationStore';
import { AdaptiveCardBuilder } from './cards/cardBuilder';
import { teamsConfig } from './config/teamsConfig';

// Initialize Teams adapter
const adapter = new CloudAdapter(teamsConfig.authConfig);

// Initialize conversation storage
const conversationStore = new MongoConversationStore(teamsConfig.mongoConnectionString);

// Initialize notification bot
const notificationBot = new TeamsNotificationBot(
  adapter,
  conversationStore,
  teamsConfig.botId
);

// Export main components
export {
  notificationBot,
  adapter,
  conversationStore,
  AdaptiveCardBuilder,
  TeamsNotificationBot,
  MongoConversationStore,
};

// Export types
export * from './bot/teamsNotificationBot';
export * from './storage/conversationStore';
export * from './cards/cardBuilder';

/**
 * Service initialization
 */
export async function initializeTeamsService(): Promise<void> {
  try {
    await conversationStore.connect();
    console.log('✅ Teams Integration Service initialized');
    console.log(`   Bot ID: ${teamsConfig.botId}`);
    console.log(`   Base URL: ${teamsConfig.baseUrl}`);
  } catch (error) {
    console.error('❌ Failed to initialize Teams Integration Service:', error);
    throw error;
  }
}

/**
 * Service cleanup
 */
export async function shutdownTeamsService(): Promise<void> {
  try {
    await conversationStore.close();
    console.log('✅ Teams Integration Service shut down gracefully');
  } catch (error) {
    console.error('⚠️ Error during Teams service shutdown:', error);
  }
}

/**
 * Convenience function to send a compliance letter notification
 */
export async function sendComplianceLetterNotification(options: {
  titleEn: string;
  titleAr: string;
  insuranceCompany: string;
  claimId: string;
  amountSAR: number;
  rejectionDate: Date;
  deadlineDays: number;
  messageEn: string;
  messageAr: string;
  isWarning: boolean;
}): Promise<void> {
  const card = AdaptiveCardBuilder.buildBilingualComplianceLetter({
    ...options,
    baseUrl: teamsConfig.baseUrl,
  });

  await notificationBot.broadcastAdaptiveCard(card);
}

/**
 * Convenience function to send monthly rejection summary
 */
export async function sendMonthlyRejectionSummary(options: {
  month: string;
  year: number;
  totalClaims: number;
  rejectionRate: number;
  totalAmountSAR: number;
  recoveryRate: number;
  topReasons: Array<{ reasonEn: string; reasonAr: string; count: number }>;
  pendingLetters: number;
}): Promise<void> {
  const card = AdaptiveCardBuilder.buildMonthlyRejectionSummary({
    ...options,
    baseUrl: teamsConfig.baseUrl,
  });

  await notificationBot.broadcastAdaptiveCard(card);
}
