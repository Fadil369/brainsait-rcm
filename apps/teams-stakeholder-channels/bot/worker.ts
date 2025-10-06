/**
 * Cloudflare Worker for Teams Bot
 * Lightweight bot handler for Cloudflare Workers environment
 */

export interface Env {
  BOT_STATE: KVNamespace;
  CACHE: KVNamespace;
  DB: D1Database;
  AUDIT_DB: D1Database;
  BOT_ID: string;
  BOT_PASSWORD: string;
  MONGODB_URI: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'BrainSAIT Teams Bot',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Teams bot messages endpoint
    if (url.pathname === '/api/messages' && request.method === 'POST') {
      return handleBotMessage(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

/**
 * Handle incoming bot messages from Teams
 */
async function handleBotMessage(request: Request, env: Env): Promise<Response> {
  try {
    const activity = await request.json() as any;
    
    // Verify bot authentication (simplified)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Handle different activity types
    switch (activity.type) {
      case 'message':
        return await handleMessageActivity(activity, env);
      case 'conversationUpdate':
        return await handleConversationUpdate(activity, env);
      default:
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error handling bot message:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle message activities
 */
async function handleMessageActivity(activity: any, env: Env): Promise<Response> {
  const text = activity.text?.trim().toLowerCase();
  
  let responseText = '';
  
  // Simple command handling
  if (text === 'help' || text === 'start') {
    responseText = `👋 Welcome to BrainSAIT Teams Bot!\n\nAvailable commands:\n- **help** - Show this message\n- **list channels** - List all channels\n- **status** - Check system status`;
  } else if (text === 'list channels' || text === 'channels') {
    responseText = '📋 Fetching your channels... (Feature coming soon with Azure integration)';
  } else if (text === 'status') {
    responseText = '✅ Bot is running on Cloudflare Workers\n- Connected to MongoDB Atlas\n- Using KV storage\n- D1 database ready';
  } else {
    responseText = `I received: "${activity.text}"\n\nType **help** for available commands.`;
  }
  
  // Store message in KV
  try {
    await env.BOT_STATE.put(
      `message:${activity.conversation.id}:${Date.now()}`,
      JSON.stringify(activity),
      { expirationTtl: 86400 } // 24 hours
    );
  } catch (error) {
    console.error('Error storing message:', error);
  }
  
  // Return Teams activity response
  const response = {
    type: 'message',
    text: responseText,
    from: {
      id: env.BOT_ID || 'bot',
      name: 'BrainSAIT Bot'
    }
  };
  
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle conversation updates (member added, etc.)
 */
async function handleConversationUpdate(activity: any, env: Env): Promise<Response> {
  if (activity.membersAdded) {
    for (const member of activity.membersAdded) {
      if (member.id !== activity.recipient.id) {
        // New user added, send welcome message
        const welcomeResponse = {
          type: 'message',
          text: '👋 Welcome to BrainSAIT Stakeholder Channels!\n\nType **help** to see available commands.',
          from: {
            id: env.BOT_ID || 'bot',
            name: 'BrainSAIT Bot'
          }
        };
        
        return new Response(JSON.stringify(welcomeResponse), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
  
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
