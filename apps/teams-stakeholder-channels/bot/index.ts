/**
 * Bot Index - Entry point for Teams Bot
 */
import * as restify from 'restify';
import {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication,
  TurnContext
} from 'botbuilder';
import { StakeholderChannelsBot } from './stakeholderChannelsBot';

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
  console.log('\nTo test your bot in Teams, sideload the app manifest.zip file within Teams');
});

// Create adapter
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.BOT_ID,
  MicrosoftAppPassword: process.env.BOT_PASSWORD,
  MicrosoftAppType: 'MultiTenant'
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
  {},
  credentialsFactory
);

const adapter = new CloudAdapter(botFrameworkAuthentication);

// Error handling
adapter.onTurnError = async (context: TurnContext, error: Error) => {
  console.error(`\n [onTurnError] unhandled error: ${error}`);
  await context.sendTraceActivity(
    'OnTurnError Trace',
    `${error}`,
    'https://www.botframework.com/schemas/error',
    'TurnError'
  );
  await context.sendActivity('The bot encountered an error or bug.');
};

// Create bot
const bot = new StakeholderChannelsBot();

// Listen for incoming requests
server.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, (context) => bot.run(context));
});

// Health check endpoint
server.get('/health', (req, res, next) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  next();
});
