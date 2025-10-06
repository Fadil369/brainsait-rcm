/**
 * Teams Tab - Stakeholder Channels
 * Integrates with BrainSAIT RCM backend API
 */
import React, { useEffect, useState, useCallback } from 'react';
import { app, authentication } from '@microsoft/teams-js';
import {
  FluentProvider,
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
  tokens,
  Button,
  Spinner,
  Input,
  Card,
  CardHeader,
  CardPreview,
  Text,
  makeStyles,
  shorthands,
  Avatar,
  Badge,
  Divider
} from '@fluentui/react-components';
import {
  Chat24Regular,
  ChatAdd24Regular,
  People24Regular,
  Send24Regular,
  Attach24Regular
} from '@fluentui/react-icons';
import axios from 'axios';

// Import types from our shared models
import type {
  Team,
  Channel,
  Message,
  MessageResponse,
  ChannelWithUnread,
  TeamDetail,
  SendMessageRequest
} from '../../../packages/shared-models/src/stakeholder-channels';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1
  },
  sidebar: {
    width: '280px',
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2
  },
  channelList: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding('12px')
  },
  channelItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.padding('12px'),
    ...shorthands.margin('4px', '0'),
    ...shorthands.borderRadius('8px'),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover
    }
  },
  activeChannel: {
    backgroundColor: tokens.colorBrandBackground2
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  chatHeader: {
    ...shorthands.padding('16px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding('16px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px')
  },
  messageInput: {
    ...shorthands.padding('16px'),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    ...shorthands.gap('8px'),
    alignItems: 'flex-end'
  },
  message: {
    display: 'flex',
    ...shorthands.gap('12px'),
    maxWidth: '70%'
  },
  messageSent: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse'
  },
  messageReceived: {
    alignSelf: 'flex-start'
  },
  messageContent: {
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius('8px'),
    backgroundColor: tokens.colorNeutralBackground3
  },
  messageSentContent: {
    backgroundColor: tokens.colorBrandBackground
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  }
});

// API base URL - will be configured via environment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1/channels';

export default function StakeholderChannelsTab() {
  const styles = useStyles();
  const [theme, setTheme] = useState(teamsLightTheme);
  const [initialized, setInitialized] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  // State
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<TeamDetail | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChannelWithUnread | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Initialize Teams SDK
  useEffect(() => {
    app.initialize().then(() => {
      app.getContext().then((context) => {
        // Set theme based on Teams theme
        switch (context.app.theme) {
          case 'dark':
            setTheme(teamsDarkTheme);
            break;
          case 'contrast':
            setTheme(teamsHighContrastTheme);
            break;
          default:
            setTheme(teamsLightTheme);
        }
        
        setInitialized(true);
        
        // Get authentication token
        getAuthToken();
      });

      // Listen for theme changes
      app.registerOnThemeChangeHandler((theme) => {
        switch (theme) {
          case 'dark':
            setTheme(teamsDarkTheme);
            break;
          case 'contrast':
            setTheme(teamsHighContrastTheme);
            break;
          default:
            setTheme(teamsLightTheme);
        }
      });
    });
  }, []);

  // Get authentication token
  const getAuthToken = async () => {
    try {
      const token = await authentication.getAuthToken();
      setAuthToken(token);
      loadTeams(token);
    } catch (error) {
      console.error('Failed to get auth token:', error);
      setLoading(false);
    }
  };

  // Load teams
  const loadTeams = async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(response.data);
      
      // Load first team by default
      if (response.data.length > 0) {
        await loadTeamDetail(response.data[0].id, token);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load team details
  const loadTeamDetail = async (teamId: string, token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveTeam(response.data);
      
      // Load first channel
      if (response.data.channels.length > 0) {
        await loadChannelMessages(response.data.channels[0], token);
      }
    } catch (error) {
      console.error('Failed to load team details:', error);
    }
  };

  // Load channel messages
  const loadChannelMessages = async (channel: ChannelWithUnread, token: string) => {
    try {
      setActiveChannel(channel);
      setMessages([]);
      
      const response = await axios.get(
        `${API_BASE_URL}/channels/${channel.id}/messages?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(response.data.items.reverse());
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !activeChannel || !authToken) return;

    setSendingMessage(true);
    try {
      const request: SendMessageRequest = {
        channelId: activeChannel.id,
        content: messageInput.trim(),
        priority: 'normal' as any
      };

      const response = await axios.post(`${API_BASE_URL}/messages`, request, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Add message to list
      setMessages([...messages, response.data]);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!initialized || loading) {
    return (
      <div className={styles.loading}>
        <Spinner label="Loading Stakeholder Channels..." />
      </div>
    );
  }

  return (
    <FluentProvider theme={theme}>
      <div className={styles.root}>
        {/* Sidebar - Channels List */}
        <div className={styles.sidebar}>
          <div style={{ padding: '16px' }}>
            <Text size={500} weight="semibold">
              {activeTeam?.name || 'Stakeholder Channels'}
            </Text>
            <Text size={200} style={{ display: 'block', marginTop: '4px' }}>
              {activeTeam?.members.length || 0} members
            </Text>
          </div>
          <Divider />
          
          <div className={styles.channelList}>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text size={300} weight="semibold">Channels</Text>
              <Button
                appearance="subtle"
                icon={<ChatAdd24Regular />}
                size="small"
              />
            </div>
            
            {activeTeam?.channels.map((channel) => (
              <div
                key={channel.id}
                className={`${styles.channelItem} ${
                  activeChannel?.id === channel.id ? styles.activeChannel : ''
                }`}
                onClick={() => authToken && loadChannelMessages(channel, authToken)}
              >
                <Chat24Regular style={{ marginRight: '8px' }} />
                <div style={{ flex: 1 }}>
                  <Text size={300}>{channel.name}</Text>
                  {channel.unreadCount > 0 && (
                    <Badge appearance="filled" color="danger" size="small">
                      {channel.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={styles.chatArea}>
          {activeChannel ? (
            <>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                <div>
                  <Text size={400} weight="semibold">
                    {activeChannel.name}
                  </Text>
                  <Text size={200} style={{ display: 'block' }}>
                    {activeChannel.description}
                  </Text>
                </div>
                <Button
                  appearance="subtle"
                  icon={<People24Regular />}
                >
                  Members
                </Button>
              </div>

              {/* Messages */}
              <div className={styles.messagesContainer}>
                {messages.map((message) => {
                  const isSent = message.senderId === 'current-user'; // TODO: Get from context
                  return (
                    <div
                      key={message.id}
                      className={`${styles.message} ${
                        isSent ? styles.messageSent : styles.messageReceived
                      }`}
                    >
                      {!isSent && (
                        <Avatar
                          name={message.senderProfile?.name || 'User'}
                          size={32}
                        />
                      )}
                      <div>
                        {!isSent && (
                          <Text size={200} weight="semibold" style={{ display: 'block', marginBottom: '4px' }}>
                            {message.senderProfile?.name}
                          </Text>
                        )}
                        <div
                          className={`${styles.messageContent} ${
                            isSent ? styles.messageSentContent : ''
                          }`}
                        >
                          <Text>{message.content}</Text>
                          <Text size={100} style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
                            {formatTime(message.createdAt)}
                          </Text>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <div className={styles.messageInput}>
                <Button
                  appearance="subtle"
                  icon={<Attach24Regular />}
                />
                <Input
                  style={{ flex: 1 }}
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sendingMessage}
                />
                <Button
                  appearance="primary"
                  icon={<Send24Regular />}
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                >
                  {sendingMessage ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Chat24Regular style={{ fontSize: '48px', opacity: 0.5 }} />
                <Text size={400} style={{ display: 'block', marginTop: '16px' }}>
                  Select a channel to start
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>
    </FluentProvider>
  );
}
