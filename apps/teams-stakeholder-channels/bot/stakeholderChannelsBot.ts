/**
 * Teams Bot - Stakeholder Channels Bot
 * Handles conversational interactions with Adaptive Cards
 */
import {
  TeamsActivityHandler,
  TurnContext,
  CardFactory,
  MessageFactory,
  Activity,
  Attachment
} from 'botbuilder';
import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1/channels';

export class StakeholderChannelsBot extends TeamsActivityHandler {
  constructor() {
    super();

    // Handle messages
    this.onMessage(async (context, next) => {
      const text = context.activity.text?.trim().toLowerCase();

      if (text === 'help' || text === 'start') {
        await this.sendWelcomeCard(context);
      } else if (text === 'list channels' || text === 'channels') {
        await this.sendChannelsList(context);
      } else if (text === 'create channel') {
        await this.sendCreateChannelCard(context);
      } else if (text === 'team info' || text === 'teams') {
        await this.sendTeamInfo(context);
      } else {
        await context.sendActivity('I didn\'t understand that. Type **help** for available commands.');
      }

      await next();
    });

    // Handle adaptive card actions
    this.onAdaptiveCardInvoke(async (context, invokeValue) => {
      const verb = invokeValue.action.verb;

      switch (verb) {
        case 'viewChannel':
          return await this.handleViewChannel(context, invokeValue.action.data);
        case 'createChannel':
          return await this.handleCreateChannel(context, invokeValue.action.data);
        case 'sendMessage':
          return await this.handleSendMessage(context, invokeValue.action.data);
        default:
          return { statusCode: 200 };
      }
    });

    // Handle member added
    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (const member of membersAdded || []) {
        if (member.id !== context.activity.recipient.id) {
          await this.sendWelcomeCard(context);
        }
      }
      await next();
    });
  }

  /**
   * Send welcome card with bot introduction
   */
  private async sendWelcomeCard(context: TurnContext): Promise<void> {
    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: '👋 Welcome to Stakeholder Channels',
              size: 'Large',
              weight: 'Bolder',
              color: 'Accent'
            },
            {
              type: 'TextBlock',
              text: 'I can help you manage your stakeholder channels, teams, and messages.',
              wrap: true,
              spacing: 'Medium'
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: '**Available Commands:**',
              weight: 'Bolder'
            },
            {
              type: 'FactSet',
              facts: [
                {
                  title: '📋 List Channels',
                  value: 'View all stakeholder channels'
                },
                {
                  title: '➕ Create Channel',
                  value: 'Create a new channel'
                },
                {
                  title: '👥 Team Info',
                  value: 'Get team information'
                },
                {
                  title: '❓ Help',
                  value: 'Show this help message'
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '📋 List Channels',
          data: { verb: 'listChannels' }
        },
        {
          type: 'Action.Submit',
          title: '➕ Create Channel',
          data: { verb: 'createChannel' }
        }
      ]
    };

    await context.sendActivity({
      attachments: [CardFactory.adaptiveCard(card)]
    });
  }

  /**
   * Send channels list with adaptive card
   */
  private async sendChannelsList(context: TurnContext): Promise<void> {
    try {
      // Get auth token from context
      const token = await this.getAuthToken(context);
      
      // Fetch channels from API
      const response = await axios.get(`${API_BASE_URL}/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const teams = response.data;

      if (!teams || teams.length === 0) {
        await context.sendActivity('No teams found. Create your first team to get started!');
        return;
      }

      // Get detailed info for first team
      const teamDetailResponse = await axios.get(`${API_BASE_URL}/teams/${teams[0].id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const teamDetail = teamDetailResponse.data;
      const channels = teamDetail.channels || [];

      const card = {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'Container',
            items: [
              {
                type: 'TextBlock',
                text: `📋 Channels in ${teamDetail.name}`,
                size: 'Large',
                weight: 'Bolder'
              },
              {
                type: 'TextBlock',
                text: `${channels.length} channel${channels.length !== 1 ? 's' : ''} • ${teamDetail.members.length} members`,
                isSubtle: true,
                spacing: 'None'
              }
            ]
          },
          {
            type: 'Container',
            spacing: 'Medium',
            separator: true,
            items: channels.map((channel: any) => ({
              type: 'Container',
              items: [
                {
                  type: 'ColumnSet',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [
                        {
                          type: 'TextBlock',
                          text: this.getChannelIcon(channel.type),
                          size: 'Large'
                        }
                      ]
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        {
                          type: 'TextBlock',
                          text: `**${channel.name}**`,
                          wrap: true
                        },
                        {
                          type: 'TextBlock',
                          text: channel.description || 'No description',
                          wrap: true,
                          isSubtle: true,
                          spacing: 'None'
                        }
                      ]
                    },
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [
                        {
                          type: 'ActionSet',
                          actions: [
                            {
                              type: 'Action.Submit',
                              title: 'View',
                              data: {
                                verb: 'viewChannel',
                                channelId: channel.id,
                                channelName: channel.name
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ],
              spacing: 'Medium'
            }))
          }
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: '➕ Create New Channel',
            data: { verb: 'createChannel' }
          }
        ]
      };

      await context.sendActivity({
        attachments: [CardFactory.adaptiveCard(card)]
      });
    } catch (error) {
      console.error('Error fetching channels:', error);
      await context.sendActivity('❌ Failed to fetch channels. Please try again.');
    }
  }

  /**
   * Send create channel card
   */
  private async sendCreateChannelCard(context: TurnContext): Promise<void> {
    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '➕ Create New Channel',
          size: 'Large',
          weight: 'Bolder'
        },
        {
          type: 'TextBlock',
          text: 'Fill in the details below to create a new stakeholder channel.',
          wrap: true,
          spacing: 'Medium'
        },
        {
          type: 'Input.Text',
          id: 'channelName',
          label: 'Channel Name',
          placeholder: 'e.g., urgent-denials',
          isRequired: true
        },
        {
          type: 'Input.Text',
          id: 'channelDescription',
          label: 'Description',
          placeholder: 'Brief description of the channel',
          isMultiline: true
        },
        {
          type: 'Input.ChoiceSet',
          id: 'channelType',
          label: 'Channel Type',
          isRequired: true,
          value: 'general',
          choices: [
            { title: '💬 General', value: 'general' },
            { title: '📋 Claims', value: 'claims' },
            { title: '⚠️ Denials', value: 'denials' },
            { title: '✅ Compliance', value: 'compliance' },
            { title: '🛠️ Technical', value: 'technical' },
            { title: '📢 Announcements', value: 'announcements' }
          ]
        },
        {
          type: 'Input.Toggle',
          id: 'isPrivate',
          title: 'Make this channel private',
          value: 'false'
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Create Channel',
          data: { verb: 'createChannel' }
        },
        {
          type: 'Action.Submit',
          title: 'Cancel',
          data: { verb: 'cancel' }
        }
      ]
    };

    await context.sendActivity({
      attachments: [CardFactory.adaptiveCard(card)]
    });
  }

  /**
   * Send team info
   */
  private async sendTeamInfo(context: TurnContext): Promise<void> {
    try {
      const token = await this.getAuthToken(context);
      
      const response = await axios.get(`${API_BASE_URL}/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const teams = response.data;

      if (!teams || teams.length === 0) {
        await context.sendActivity('No teams found.');
        return;
      }

      const card = {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: '👥 Your Teams',
            size: 'Large',
            weight: 'Bolder'
          },
          {
            type: 'Container',
            spacing: 'Medium',
            items: teams.map((team: any) => ({
              type: 'Container',
              items: [
                {
                  type: 'TextBlock',
                  text: `**${team.name}**`,
                  size: 'Medium'
                },
                {
                  type: 'TextBlock',
                  text: team.description || 'No description',
                  wrap: true,
                  isSubtle: true
                },
                {
                  type: 'FactSet',
                  facts: [
                    {
                      title: 'Type',
                      value: team.type
                    },
                    {
                      title: 'Members',
                      value: `${team.member_ids?.length || 0}`
                    },
                    {
                      title: 'Channels',
                      value: `${team.channel_ids?.length || 0}`
                    }
                  ]
                }
              ],
              separator: true,
              spacing: 'Medium'
            }))
          }
        ]
      };

      await context.sendActivity({
        attachments: [CardFactory.adaptiveCard(card)]
      });
    } catch (error) {
      console.error('Error fetching teams:', error);
      await context.sendActivity('❌ Failed to fetch team info.');
    }
  }

  /**
   * Handle view channel action
   */
  private async handleViewChannel(context: TurnContext, data: any): Promise<any> {
    try {
      const token = await this.getAuthToken(context);
      
      const response = await axios.get(
        `${API_BASE_URL}/channels/${data.channelId}/messages?limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const messages = response.data.items || [];

      const card = {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: `💬 ${data.channelName}`,
            size: 'Large',
            weight: 'Bolder'
          },
          {
            type: 'TextBlock',
            text: `Recent messages (${messages.length})`,
            isSubtle: true
          },
          {
            type: 'Container',
            spacing: 'Medium',
            separator: true,
            items: messages.slice(0, 5).map((msg: any) => ({
              type: 'Container',
              items: [
                {
                  type: 'TextBlock',
                  text: `**${msg.sender_profile?.name || 'Unknown'}**`,
                  size: 'Small'
                },
                {
                  type: 'TextBlock',
                  text: msg.content,
                  wrap: true,
                  spacing: 'None'
                },
                {
                  type: 'TextBlock',
                  text: new Date(msg.created_at).toLocaleString(),
                  size: 'Small',
                  isSubtle: true,
                  spacing: 'None'
                }
              ],
              separator: true,
              spacing: 'Small'
            }))
          }
        ]
      };

      await context.sendActivity({
        attachments: [CardFactory.adaptiveCard(card)]
      });

      return { statusCode: 200 };
    } catch (error) {
      console.error('Error viewing channel:', error);
      return { statusCode: 500 };
    }
  }

  /**
   * Handle create channel action
   */
  private async handleCreateChannel(context: TurnContext, data: any): Promise<any> {
    try {
      if (data.verb === 'cancel') {
        await context.sendActivity('Channel creation cancelled.');
        return { statusCode: 200 };
      }

      const token = await this.getAuthToken(context);
      
      // Create channel via API
      const createRequest = {
        teamId: data.teamId || 'default-team', // TODO: Get from context
        name: data.channelName,
        description: data.channelDescription,
        type: data.channelType,
        isPrivate: data.isPrivate === 'true'
      };

      await axios.post(`${API_BASE_URL}/channels`, createRequest, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      await context.sendActivity(`✅ Channel **${data.channelName}** created successfully!`);
      return { statusCode: 200 };
    } catch (error) {
      console.error('Error creating channel:', error);
      await context.sendActivity('❌ Failed to create channel. Please try again.');
      return { statusCode: 500 };
    }
  }

  /**
   * Handle send message action
   */
  private async handleSendMessage(context: TurnContext, data: any): Promise<any> {
    // Implementation for sending messages
    return { statusCode: 200 };
  }

  /**
   * Get channel icon based on type
   */
  private getChannelIcon(type: string): string {
    const icons: Record<string, string> = {
      general: '💬',
      claims: '📋',
      denials: '⚠️',
      compliance: '✅',
      technical: '🛠️',
      announcements: '📢'
    };
    return icons[type] || '📝';
  }

  /**
   * Get authentication token from context
   */
  private async getAuthToken(context: TurnContext): Promise<string> {
    // TODO: Implement proper token retrieval
    // For now, return a placeholder
    return process.env.API_TOKEN || 'demo-token';
  }
}
