# BrainSAIT Teams Integration Service

Microsoft Teams integration service for stakeholder communication channels, built using [Microsoft 365 Agents Toolkit](https://github.com/OfficeDev/microsoft-365-agents-toolkit-samples).

## Overview

This service enables BrainSAIT to send compliance letters, rejection summaries, and alerts directly to stakeholders via Microsoft Teams channels. It leverages adaptive cards for rich, interactive notifications with bilingual (Arabic/English) support.

## Features

- **📢 Teams Channel Notifications**: Send notifications to Teams channels, groups, and personal chats
- **🎴 Adaptive Cards**: Rich, interactive cards with bilingual content
- **🔔 Compliance Alerts**: Automated compliance letter notifications with 30-day deadline tracking
- **📊 Rejection Summaries**: Monthly reports with statistics and top rejection reasons
- **💾 Conversation Storage**: MongoDB-based storage for Teams conversation references
- **🌐 Multi-Channel Broadcasting**: Send notifications to all registered Teams installations

## Architecture

```
services/teams-integration/
├── src/
│   ├── bot/
│   │   └── teamsNotificationBot.ts       # Core notification bot logic
│   ├── cards/
│   │   ├── cardBuilder.ts                # Adaptive card builder utilities
│   │   ├── complianceLetterCard.json     # Compliance letter template
│   │   └── rejectionSummaryCard.json     # Rejection summary template
│   ├── storage/
│   │   └── conversationStore.ts          # MongoDB conversation reference storage
│   ├── config/
│   │   └── teamsConfig.ts                # Configuration loader
│   └── index.ts                          # Main service entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+ or 20+ or 22+
- MongoDB 6.0+
- Microsoft 365 tenant with Teams
- Azure AD app registration (for bot authentication)

### Setup Steps

1. **Install dependencies:**
   ```bash
   cd services/teams-integration
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   # Copy from root .env.example
   BOT_ID=your-bot-app-id
   BOT_PASSWORD=your-bot-app-password
   MONGO_URI=mongodb://localhost:27017/brainsait_rcm
   BASE_URL=https://your-domain.com
   ```

3. **Create Azure AD App Registration:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to Azure Active Directory > App registrations
   - Click "New registration"
   - Name: "BrainSAIT Teams Bot"
   - Supported account types: "Accounts in any organizational directory"
   - Register and note the Application (client) ID
   - Create a client secret under "Certificates & secrets"
   - Copy the BOT_ID (client ID) and BOT_PASSWORD (client secret)

4. **Register Teams Bot:**
   - Go to [Teams Developer Portal](https://dev.teams.microsoft.com)
   - Create a new app or use existing
   - Configure Bot under "App features"
   - Link your Azure AD app ID
   - Generate an app package and install in Teams

5. **Build the service:**
   ```bash
   npm run build
   ```

6. **Start the service:**
   ```bash
   npm start
   ```

## Usage

### Initializing the Service

```typescript
import { initializeTeamsService, shutdownTeamsService } from '@brainsait/teams-integration';

// Initialize on app startup
await initializeTeamsService();

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await shutdownTeamsService();
});
```

### Sending Compliance Letter Notification

```typescript
import { sendComplianceLetterNotification } from '@brainsait/teams-integration';

await sendComplianceLetterNotification({
  titleEn: 'Compliance Letter Required',
  titleAr: 'مطلوب خطاب الامتثال',
  insuranceCompany: 'Bupa Arabia',
  claimId: 'CLM-2024-001',
  amountSAR: 5000.00,
  rejectionDate: new Date('2024-01-15'),
  deadlineDays: 30,
  messageEn: 'Your claim has been rejected. Please submit an appeal within 30 days.',
  messageAr: 'تم رفض مطالبتك. يرجى تقديم استئناف خلال 30 يومًا.',
  isWarning: true,
});
```

### Sending Monthly Rejection Summary

```typescript
import { sendMonthlyRejectionSummary } from '@brainsait/teams-integration';

await sendMonthlyRejectionSummary({
  month: 'January',
  year: 2024,
  totalClaims: 1500,
  rejectionRate: 12.5,
  totalAmountSAR: 750000.00,
  recoveryRate: 65.0,
  topReasons: [
    { reasonEn: 'Incomplete Documentation', reasonAr: 'وثائق غير مكتملة', count: 45 },
    { reasonEn: 'Pre-authorization Required', reasonAr: 'التصريح المسبق مطلوب', count: 38 },
    { reasonEn: 'Coding Error', reasonAr: 'خطأ في الترميز', count: 30 },
  ],
  pendingLetters: 12,
});
```

### Broadcasting Simple Messages

```typescript
import { notificationBot } from '@brainsait/teams-integration';

await notificationBot.broadcastMessage(
  '🚨 URGENT: System maintenance scheduled for tonight at 10 PM | صيانة النظام المجدولة الليلة الساعة 10 مساءً'
);
```

## API Endpoints

The service exposes the following REST API endpoints via the main FastAPI backend:

### POST `/api/teams/notifications/compliance-letter`

Send a compliance letter notification.

**Request Body:**
```json
{
  "title_en": "Compliance Letter Required",
  "title_ar": "مطلوب خطاب الامتثال",
  "insurance_company": "Bupa Arabia",
  "claim_id": "CLM-2024-001",
  "amount_sar": 5000.00,
  "rejection_date": "2024-01-15T00:00:00Z",
  "deadline_days": 30,
  "message_en": "Your claim has been rejected...",
  "message_ar": "تم رفض مطالبتك...",
  "is_warning": true
}
```

### POST `/api/teams/notifications/rejection-summary`

Send a monthly rejection summary.

**Request Body:**
```json
{
  "month": "January",
  "year": 2024,
  "total_claims": 1500,
  "rejection_rate": 12.5,
  "total_amount_sar": 750000.00,
  "recovery_rate": 65.0,
  "top_reasons": [
    {
      "reasonEn": "Incomplete Documentation",
      "reasonAr": "وثائق غير مكتملة",
      "count": 45
    }
  ],
  "pending_letters": 12
}
```

### POST `/api/teams/notifications/broadcast`

Broadcast a simple text message.

**Request Body:**
```json
{
  "message": "🚨 URGENT: System maintenance..."
}
```

### GET `/api/teams/installations`

Get list of Teams installations where the bot is active.

**Response:**
```json
{
  "count": 3,
  "installations": [
    {
      "type": "channel",
      "conversation_id": "19:..."
    }
  ]
}
```

### GET `/api/teams/health`

Health check for Teams integration service.

## Adaptive Cards

### Compliance Letter Card

Features:
- BrainSAIT logo
- Bilingual title and subtitle
- Fact set with claim details (Insurance, Claim ID, Amount, Dates)
- Bilingual message body
- Color-coded severity indicator (warning/info)
- Action buttons: "View Details" and "Submit Appeal"

### Rejection Summary Card

Features:
- Monthly period header
- Key metrics: Total Claims, Rejection Rate, Total Amount, Recovery Rate
- Top rejection reasons (bilingual)
- Pending compliance letters count
- Action buttons: "Open Dashboard" and "View Report"

## Database Schema

### teams_conversations Collection

```javascript
{
  _id: ObjectId("..."),
  key: "conversation-unique-id",
  reference: {
    conversation: {
      id: "19:...",
      conversationType: "channel",
      tenantId: "..."
    },
    serviceUrl: "https://smba.trafficmanager.net/...",
    channelId: "msteams",
    bot: {
      id: "28:...",
      name: "BrainSAIT Bot"
    }
  },
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-15T10:30:00Z")
}
```

## Integration with Existing Services

### WhatsApp Notifications

The Teams integration complements the existing WhatsApp notification service:

```typescript
// Send via both Teams and WhatsApp
await Promise.all([
  sendComplianceLetterNotification(data),
  sendWhatsAppNotification(data),
]);
```

### Notification Service Package

Teams notifications can be triggered from the `packages/notification-service`:

```typescript
import { sendComplianceLetter } from '@brainsait/notification-service';

// Will automatically route to both Teams and WhatsApp
await sendComplianceLetter({
  channels: ['teams', 'whatsapp'],
  ...data
});
```

## Monitoring & Logging

All Teams operations are logged with structured logging:

```
2024-01-15 10:30:00 - teams-integration - INFO - ✅ Teams Integration Service initialized
2024-01-15 10:30:15 - teams-integration - INFO - Sending compliance letter to 3 installations
2024-01-15 10:30:16 - teams-integration - INFO - Successfully sent to channel installation
```

## Troubleshooting

### Bot Not Receiving Messages

1. Verify bot is installed in Teams channel/chat
2. Check Azure AD app permissions
3. Verify BOT_ID and BOT_PASSWORD environment variables
4. Check conversation references in MongoDB

### Notifications Not Sending

1. Check MongoDB connection
2. Verify conversation references are being stored
3. Check bot authentication credentials
4. Review service logs for errors

### Adaptive Cards Not Rendering

1. Verify card JSON schema is valid (v1.4)
2. Check for missing required fields in data binding
3. Test cards in [Adaptive Card Designer](https://adaptivecards.io/designer/)

## References

- [Microsoft 365 Agents Toolkit Samples](https://github.com/OfficeDev/microsoft-365-agents-toolkit-samples)
- [Adaptive Cards Documentation](https://adaptivecards.io/)
- [Teams Bot Framework](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
- [Azure Bot Service](https://azure.microsoft.com/en-us/services/bot-services/)

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, contact BrainSAIT support or create an issue in the repository.
