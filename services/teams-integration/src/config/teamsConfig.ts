/**
 * BrainSAIT Teams Integration - Configuration
 * Teams Bot and authentication configuration
 */

import { AuthConfiguration, loadAuthConfigFromEnv } from '@microsoft/agents-hosting';
import * as dotenv from 'dotenv';

dotenv.config();

export interface TeamsIntegrationConfig {
  botId: string;
  botPassword: string;
  mongoConnectionString: string;
  baseUrl: string;
  authConfig: AuthConfiguration;
}

export function loadTeamsConfig(): TeamsIntegrationConfig {
  const botId = process.env.BOT_ID || process.env.TEAMS_BOT_ID;
  const botPassword = process.env.BOT_PASSWORD || process.env.TEAMS_BOT_PASSWORD;
  const mongoConnectionString = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  if (!botId || !botPassword) {
    throw new Error(
      'Teams Bot credentials not configured. Please set BOT_ID and BOT_PASSWORD environment variables.'
    );
  }

  // Load Microsoft authentication configuration
  const authConfig = loadAuthConfigFromEnv();

  return {
    botId,
    botPassword,
    mongoConnectionString,
    baseUrl,
    authConfig,
  };
}

export const teamsConfig = loadTeamsConfig();
