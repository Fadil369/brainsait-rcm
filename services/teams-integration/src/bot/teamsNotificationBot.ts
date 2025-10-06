/**
 * BrainSAIT Teams Integration - Notification Bot
 * Simplified Teams notification service adapted from Microsoft 365 Agents Toolkit
 */

import { CloudAdapter, TurnContext, CardFactory } from '@microsoft/agents-hosting';
import { TeamsInfo } from '@microsoft/agents-hosting-teams';
import { ConversationReference, ActivityTypes } from '@microsoft/agents-activity';
import { IConversationReferenceStore, getConversationReferenceKey } from '../storage/conversationStore';

export interface NotificationTarget {
  type?: string;
  sendMessage(text: string): Promise<{ id?: string }>;
  sendAdaptiveCard(card: unknown): Promise<{ id?: string }>;
}

export class TeamsBotInstallation implements NotificationTarget {
  public readonly adapter: CloudAdapter;
  public readonly conversationReference: Partial<ConversationReference>;
  public readonly type?: string;
  public readonly botAppId: string;

  constructor(
    adapter: CloudAdapter,
    conversationReference: Partial<ConversationReference>,
    botAppId: string
  ) {
    this.adapter = adapter;
    this.conversationReference = conversationReference;
    this.type = conversationReference.conversation?.conversationType;
    this.botAppId = botAppId;
  }

  async sendMessage(text: string): Promise<{ id?: string }> {
    const response: { id?: string } = {};
    await this.adapter.continueConversation(
      this.conversationReference as ConversationReference,
      async (context) => {
        try {
          const res = await context.sendActivity(text);
          response.id = res?.id;
        } catch (error) {
          console.error('Failed to send message:', error);
          throw error;
        }
      }
    );
    return response;
  }

  async sendAdaptiveCard(card: unknown): Promise<{ id?: string }> {
    const response: { id?: string } = {};
    await this.adapter.continueConversation(
      this.conversationReference as ConversationReference,
      async (context) => {
        try {
          const adaptiveCard = {
            attachments: [CardFactory.adaptiveCard(card)],
            type: ActivityTypes.Message,
          };
          const res = await context.sendActivity(adaptiveCard as any);
          response.id = res?.id;
        } catch (error) {
          console.error('Failed to send adaptive card:', error);
          throw error;
        }
      },
      true
    );
    return response;
  }
}

export class TeamsNotificationBot {
  private readonly conversationStore: IConversationReferenceStore;
  private readonly adapter: CloudAdapter;
  private readonly botAppId: string;

  constructor(
    adapter: CloudAdapter,
    store: IConversationReferenceStore,
    botAppId: string
  ) {
    this.conversationStore = store;
    this.adapter = adapter;
    this.botAppId = botAppId;
    
    // Add middleware to track conversation references
    this.adapter.use(async (context, next) => {
      await this.trackConversation(context);
      await next();
    });
  }

  private async trackConversation(context: TurnContext): Promise<void> {
    try {
      const reference = context.activity.getConversationReference();
      const key = getConversationReferenceKey(reference);
      await this.conversationStore.add(key, reference);
    } catch (error) {
      console.error('Failed to track conversation:', error);
    }
  }

  async getInstallations(): Promise<TeamsBotInstallation[]> {
    const installations: TeamsBotInstallation[] = [];
    let continuationToken: string | undefined;

    do {
      const result = await this.conversationStore.list(50, continuationToken);
      continuationToken = result.continuationToken;

      for (const reference of result.data) {
        installations.push(
          new TeamsBotInstallation(this.adapter, reference, this.botAppId)
        );
      }
    } while (continuationToken);

    return installations;
  }

  async broadcastMessage(text: string): Promise<void> {
    const installations = await this.getInstallations();
    
    const sendPromises = installations.map(async (installation) => {
      try {
        await installation.sendMessage(text);
      } catch (error) {
        console.error(`Failed to send to ${installation.type}:`, error);
      }
    });

    await Promise.all(sendPromises);
  }

  async broadcastAdaptiveCard(card: unknown): Promise<void> {
    const installations = await this.getInstallations();
    
    const sendPromises = installations.map(async (installation) => {
      try {
        await installation.sendAdaptiveCard(card);
      } catch (error) {
        console.error(`Failed to send card to ${installation.type}:`, error);
      }
    });

    await Promise.all(sendPromises);
  }
}
