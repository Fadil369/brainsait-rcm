# Teams Stakeholder Channels App

Microsoft Teams integration for BrainSAIT RCM Stakeholder Channels - enabling real-time collaboration between HeadQ, Branches, Providers, Payers, and Auditors.

## 🎯 Overview

This Teams app provides:
- **📱 Tab UI**: Modern React interface for channel management
- **🤖 Bot**: Conversational interface with Adaptive Cards
- **🔗 API Integration**: Direct connection to BrainSAIT RCM backend
- **🔐 SSO**: Seamless authentication with Azure AD

## 📦 Project Structure

```
teams-stakeholder-channels/
├── appPackage/              # Teams app manifest and icons
│   ├── manifest.json        # App configuration
│   ├── color.png           # App icon (color)
│   └── outline.png         # App icon (outline)
├── src/                    # Tab (React app)
│   └── components/
│       └── StakeholderChannelsTab.tsx
├── bot/                    # Bot service
│   ├── index.ts           # Bot server
│   ├── stakeholderChannelsBot.ts  # Bot logic
│   └── package.json
├── env/                    # Environment configs
│   └── .env.local
├── m365agents.yml         # M365 Agents Toolkit config
└── package.json
```

## 🚀 Quick Start

### Prerequisites

1. **Microsoft 365 Account** with Teams access
2. **Azure Subscription** (for app registration)
3. **Node.js** (v18 or higher)
4. **Microsoft 365 Agents Toolkit** VS Code extension

### Step 1: Install Dependencies

```bash
cd apps/teams-stakeholder-channels

# Install root dependencies
npm install

# Install tab dependencies
cd src && npm install && cd ..

# Install bot dependencies
cd bot && npm install && cd ..
```

### Step 2: Configure Environment

1. Copy `.env.local.example` to `.env.local`:
```bash
cp env/.env.local.example env/.env.local
```

2. Update the following in `.env.local`:
```env
# API Configuration - Point to your BrainSAIT RCM backend
API_BASE_URL=http://localhost:8000/api/v1/channels
REACT_APP_API_URL=http://localhost:8000/api/v1/channels
BRAINSAIT_API_URL=http://localhost:8000

# MongoDB (if running locally)
MONGODB_URI=mongodb://localhost:27017/brainsait_rcm
```

### Step 3: Provision Teams App

Using Microsoft 365 Agents Toolkit in VS Code:

1. Open the project in VS Code
2. Open Command Palette (`Cmd/Ctrl + Shift + P`)
3. Select: `Teams: Provision`
4. Follow the prompts to:
   - Sign in to Microsoft 365
   - Sign in to Azure
   - Provision resources

This will:
- Create Azure AD app registration
- Create Bot registration
- Create Teams app
- Update environment variables

### Step 4: Start Backend API

Make sure your BrainSAIT RCM backend is running:

```bash
# In the main project directory
cd apps/api
uvicorn main:app --reload --port 8000
```

Verify the API is accessible:
```bash
curl http://localhost:8000/api/v1/health
```

### Step 5: Start the Teams App

#### Option A: Using M365 Agents Toolkit (Recommended)

1. In VS Code, press `F5` or click the "Run and Debug" button
2. Select "Debug in Teams"
3. This will start both Tab and Bot services

#### Option B: Manual Start

```bash
# Terminal 1: Start Tab (React app)
cd src
npm start

# Terminal 2: Start Bot
cd bot
npm run dev

# Terminal 3: Start API (if not already running)
cd ../../api
uvicorn main:app --reload
```

### Step 6: Test in Teams

1. Teams will open automatically (or click the link in terminal)
2. Click "Add" to install the app
3. Open the "Channels" tab to see the UI
4. Type "help" to the bot to see available commands

## 🔧 API Integration Details

### Backend Endpoints Used

The Teams app connects to these BrainSAIT RCM API endpoints:

```
GET    /api/v1/channels/teams              # List teams
GET    /api/v1/channels/teams/{id}         # Get team details
POST   /api/v1/channels/teams              # Create team
GET    /api/v1/channels/channels/{id}/messages  # Get messages
POST   /api/v1/channels/messages           # Send message
POST   /api/v1/channels/channels           # Create channel
POST   /api/v1/channels/teams/{id}/members # Add member
```

### Authentication Flow

1. User signs into Teams
2. Teams SDK provides authentication token
3. Token is passed to backend API
4. Backend validates token and processes request

### Data Models

The app uses shared TypeScript models from:
```
packages/shared-models/src/stakeholder-channels.ts
```

These models are synchronized with the Python backend models.

## 🤖 Bot Commands

The bot supports these commands:

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `list channels` | Display all channels with adaptive card |
| `create channel` | Show channel creation form |
| `team info` | Display team information |

## 📱 Tab Features

- **Teams List**: View all your teams
- **Channel Browser**: Navigate between channels
- **Real-time Messaging**: Send and receive messages
- **Unread Badges**: See unread message counts
- **Channel Types**: Support for all channel types (general, claims, denials, etc.)
- **Fluent UI**: Native Teams look and feel
- **Theme Support**: Light, dark, and high contrast

## 🎨 Customization

### Adding New Bot Commands

Edit `bot/stakeholderChannelsBot.ts`:

```typescript
if (text === 'your-command') {
  await this.sendYourCustomCard(context);
}
```

### Modifying Tab UI

Edit `src/components/StakeholderChannelsTab.tsx`:

```typescript
// Add your custom components and logic
```

### Updating Manifest

Edit `appPackage/manifest.json` to:
- Add new tabs
- Add bot commands
- Update permissions
- Change app info

## 🔐 Security

### Authentication

- Uses Azure AD SSO
- Tokens automatically managed by Teams SDK
- Backend validates all tokens

### Permissions

The app requests:
- `identity`: Get user identity
- `messageTeamMembers`: Send messages to team members

### Data Privacy

- All data is stored in your BrainSAIT RCM database
- No data is sent to external services
- Messages are encrypted in transit

## 🚢 Deployment

### Deploy to Azure

1. Provision Azure resources:
```bash
# Using M365 Agents Toolkit
Teams: Provision
```

2. Deploy the app:
```bash
# Using M365 Agents Toolkit
Teams: Deploy
```

3. Publish to Teams:
```bash
# Using M365 Agents Toolkit
Teams: Publish
```

### Environment-Specific Configs

- **Local**: `env/.env.local`
- **Development**: `env/.env.dev`
- **Production**: `env/.env.prod`

## 📊 Monitoring

### Logs

- **Tab logs**: Browser console
- **Bot logs**: Server console / Azure App Insights
- **API logs**: Check backend logs

### Health Checks

- Bot health: `http://localhost:3978/health`
- API health: `http://localhost:8000/api/v1/health`

## 🐛 Troubleshooting

### Bot not responding

1. Check bot is running: `curl http://localhost:3978/health`
2. Verify BOT_ID and BOT_PASSWORD in `.env.local`
3. Check bot logs for errors

### Tab not loading

1. Check tab is running: Open `http://localhost:53000`
2. Verify REACT_APP_API_URL points to backend
3. Check browser console for errors

### API connection failed

1. Verify backend is running: `curl http://localhost:8000/api/v1/health`
2. Check CORS settings in backend
3. Verify authentication token

### Teams app not installing

1. Validate manifest: `Teams: Validate Manifest`
2. Check app package: `appPackage/build/appPackage.local.zip`
3. Verify all environment variables are set

## 📚 Resources

### Documentation

- [Microsoft Teams App Docs](https://docs.microsoft.com/microsoftteams/platform/)
- [M365 Agents Toolkit](https://github.com/OfficeDev/microsoft-365-agents-toolkit)
- [Adaptive Cards](https://adaptivecards.io/)
- [Fluent UI](https://react.fluentui.dev/)

### Samples

Based on official samples:
- `hello-world-tab-with-backend`
- `bot-sso`
- `adaptive-card-notification`

### Support

- GitHub Issues: [Create an issue](https://github.com/Fadil369/brainsait-rcm/issues)
- Documentation: `/STAKEHOLDER_CHANNELS.md`
- API Docs: `/API_DOCUMENTATION.md`

## 🎯 Next Steps

1. ✅ Install and test locally
2. ✅ Connect to your backend API
3. ✅ Test bot commands and tab UI
4. 🔄 Deploy to Azure (optional)
5. 🔄 Publish to Teams store (optional)
6. 🔄 Add more custom features

## 📝 Development Notes

### Adding Real-Time Updates

To add WebSocket support for real-time messages:

1. Install SignalR:
```bash
npm install @microsoft/signalr
```

2. Connect to backend:
```typescript
import { HubConnectionBuilder } from '@microsoft/signalr';

const connection = new HubConnectionBuilder()
  .withUrl(`${API_BASE_URL}/hubs/channels`)
  .build();

connection.on('newMessage', (message) => {
  // Handle new message
});
```

### Testing with Sample Data

Use the backend API to create test data:

```bash
# Create a team
curl -X POST http://localhost:8000/api/v1/channels/teams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Team",
    "type": "private"
  }'
```

---

**Built with ❤️ for BrainSAIT RCM**  
**Last Updated**: October 6, 2025  
**Version**: 1.0.0
