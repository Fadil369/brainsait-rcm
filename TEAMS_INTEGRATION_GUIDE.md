# Teams Stakeholder Channels Integration Guide

Complete guide for integrating Microsoft Teams as a stakeholder communication channel in BrainSAIT Healthcare Claims Management System.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Usage Examples](#usage-examples)
5. [API Reference](#api-reference)
6. [Adaptive Cards](#adaptive-cards)
7. [Integration Patterns](#integration-patterns)
8. [Troubleshooting](#troubleshooting)

## Overview

The Teams integration enables BrainSAIT to deliver compliance letters, rejection summaries, and urgent alerts directly to stakeholder Teams channels. Built using the [Microsoft 365 Agents Toolkit](https://github.com/OfficeDev/microsoft-365-agents-toolkit-samples), it provides:

- **Multi-channel delivery**: Send to Teams channels, group chats, and personal messages
- **Rich adaptive cards**: Interactive, bilingual (Arabic/English) notifications
- **Automated workflows**: Trigger notifications from rejection events and deadlines
- **Conversation tracking**: MongoDB-based storage of Teams conversation references
- **Broadcast capabilities**: Send announcements to all registered channels

### Key Use Cases

1. **Compliance Letter Notifications**: Automated alerts when 30-day deadline approaches
2. **Monthly Rejection Reports**: Statistics and trends delivered to management channels
3. **Urgent Alerts**: System-wide broadcasts for critical updates
4. **Status Updates**: Real-time claim processing notifications

## Architecture

### Components Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BrainSAIT Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐      ┌──────────────────┐     ┌──────────┐   │
│  │   FastAPI   │─────▶│ Teams Integration│────▶│  MongoDB │   │
│  │   Backend   │      │     Service      │     │  Store   │   │
│  └─────────────┘      └──────────────────┘     └──────────┘   │
│        │                       │                                │
│        │                       │                                │
│        ▼                       ▼                                │
│  ┌─────────────┐      ┌──────────────────┐                    │
│  │ Notification│      │  Adaptive Card   │                    │
│  │   Service   │      │     Builder      │                    │
│  └─────────────┘      └──────────────────┘                    │
│                                                                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               │ Teams Bot Framework API
                               │
                               ▼
                 ┌──────────────────────────────┐
                 │   Microsoft Teams Channels   │
                 ├──────────────────────────────┤
                 │  • Insurance Company Teams   │
                 │  • Branch Manager Chats      │
                 │  • Executive Dashboards      │
                 │  • TPA Integration Channels  │
                 └──────────────────────────────┘
```

### Service Structure

```
services/teams-integration/
├── src/
│   ├── bot/
│   │   └── teamsNotificationBot.ts      # Core Teams bot logic
│   ├── cards/
│   │   ├── cardBuilder.ts               # Template binding utilities
│   │   ├── complianceLetterCard.json    # Compliance letter template
│   │   └── rejectionSummaryCard.json    # Monthly report template
│   ├── storage/
│   │   └── conversationStore.ts         # MongoDB conversation storage
│   ├── config/
│   │   └── teamsConfig.ts               # Environment configuration
│   └── index.ts                         # Service entry point & exports
├── package.json
├── tsconfig.json
└── README.md
```

## Setup & Configuration

### Step 1: Azure AD App Registration

1. **Create Azure AD Application:**
   ```bash
   # Navigate to Azure Portal
   https://portal.azure.com
   
   # Go to: Azure Active Directory > App registrations > New registration
   ```

2. **Configure the app:**
   - **Name**: `BrainSAIT Teams Bot`
   - **Supported account types**: Accounts in any organizational directory (Multi-tenant)
   - **Redirect URI**: Leave blank (not needed for bots)

3. **Create Client Secret:**
   - Navigate to: Certificates & secrets
   - Click "New client secret"
   - Description: `BrainSAIT Bot Secret`
   - Expires: 24 months
   - Copy the **Value** (this is your `BOT_PASSWORD`)

4. **Copy Application ID:**
   - Navigate to: Overview
   - Copy the **Application (client) ID** (this is your `BOT_ID`)

### Step 2: Teams App Registration

1. **Go to Teams Developer Portal:**
   ```
   https://dev.teams.microsoft.com/apps
   ```

2. **Create New App:**
   - Click "New app"
   - Basic information:
     - Short name: `BrainSAIT RCM`
     - Full name: `BrainSAIT Healthcare Claims Management`
     - Short description: `Healthcare claims and rejections management notifications`
     - Developer company: `BrainSAIT`
     - Website: `https://brainsait.com`
     - Privacy policy: `https://brainsait.com/privacy`
     - Terms of use: `https://brainsait.com/terms`

3. **Configure Bot:**
   - Navigate to: App features > Bot
   - Click "Create a new bot"
   - Select "Use existing bot registration"
   - Enter your Azure AD App ID (`BOT_ID`)
   - Bot messaging endpoint: `https://your-domain.com/api/teams/messages`
   - Scopes: Select "Team", "Group Chat", "Personal"

4. **Set Permissions:**
   - Navigate to: Permissions
   - Add: `RSC` (Resource-specific consent) permissions
     - `ChannelMessage.Send`
     - `TeamMember.Read.Group`

5. **Create App Package:**
   - Navigate to: Publish > Publish to org
   - Or download package for manual installation

### Step 3: Environment Configuration

Add to your `.env` file:

```bash
# Microsoft Teams Integration
BOT_ID=00000000-0000-0000-0000-000000000000
BOT_PASSWORD=your-client-secret-value-here
TEAMS_BOT_ID=00000000-0000-0000-0000-000000000000
TEAMS_BOT_PASSWORD=your-client-secret-value-here
BASE_URL=https://your-domain.com

# MongoDB (if not already configured)
MONGO_URI=mongodb://localhost:27017/brainsait_rcm
```

### Step 4: Install Dependencies

```bash
cd services/teams-integration
npm install
npm run build
```

### Step 5: Initialize Service

In your backend startup (e.g., `apps/api/main.py`):

```python
from fastapi import FastAPI

# Import Teams router
from routes.teams_integration import router as teams_router

app = FastAPI()

# Include Teams routes
app.include_router(teams_router)
```

### Step 6: Install Bot in Teams

1. **Upload Custom App:**
   - Open Microsoft Teams
   - Go to Apps > Manage your apps
   - Click "Upload an app" > "Upload a custom app"
   - Select your app package (ZIP file)

2. **Add to Channel:**
   - Navigate to your team/channel
   - Click "+" to add a tab
   - Find "BrainSAIT RCM" in the app list
   - Add to channel

3. **Verify Installation:**
   ```bash
   curl http://localhost:8000/api/teams/installations
   ```

## Usage Examples

### Sending Compliance Letter

**Via API (cURL):**
```bash
curl -X POST http://localhost:8000/api/teams/notifications/compliance-letter \
  -H "Content-Type: application/json" \
  -d '{
    "title_en": "Urgent: Compliance Letter Required",
    "title_ar": "عاجل: خطاب الامتثال مطلوب",
    "insurance_company": "Bupa Arabia",
    "claim_id": "CLM-2024-12345",
    "amount_sar": 15000.00,
    "rejection_date": "2024-01-15T00:00:00Z",
    "deadline_days": 30,
    "message_en": "Your claim has been rejected due to incomplete documentation. Please submit supporting documents and appeal within 30 days to avoid financial loss.",
    "message_ar": "تم رفض مطالبتك بسبب وثائق غير مكتملة. يرجى تقديم المستندات الداعمة والاستئناف خلال 30 يومًا لتجنب الخسارة المالية.",
    "is_warning": true
  }'
```

**Via Python (Backend Integration):**
```python
import httpx
from datetime import datetime, timedelta

async def send_compliance_notification(rejection_record):
    """Send Teams notification when compliance deadline approaching"""
    
    rejection_date = rejection_record['rejection_date']
    deadline = rejection_date + timedelta(days=30)
    days_remaining = (deadline - datetime.now()).days
    
    # Only send if within 5 days of deadline
    if days_remaining <= 5:
        async with httpx.AsyncClient() as client:
            await client.post(
                'http://localhost:8000/api/teams/notifications/compliance-letter',
                json={
                    'title_en': 'Urgent: Compliance Deadline Approaching',
                    'title_ar': 'عاجل: اقتراب الموعد النهائي للامتثال',
                    'insurance_company': rejection_record['insurance_company'],
                    'claim_id': rejection_record['claim_id'],
                    'amount_sar': rejection_record['total_amount'],
                    'rejection_date': rejection_date.isoformat(),
                    'deadline_days': 30,
                    'message_en': f'Only {days_remaining} days remaining to appeal!',
                    'message_ar': f'بقي {days_remaining} أيام فقط للاستئناف!',
                    'is_warning': True,
                }
            )
```

### Sending Monthly Summary

**Via API (cURL):**
```bash
curl -X POST http://localhost:8000/api/teams/notifications/rejection-summary \
  -H "Content-Type: application/json" \
  -d '{
    "month": "January",
    "year": 2024,
    "total_claims": 1450,
    "rejection_rate": 12.8,
    "total_amount_sar": 825000.00,
    "recovery_rate": 67.5,
    "top_reasons": [
      {
        "reasonEn": "Incomplete Documentation",
        "reasonAr": "وثائق غير مكتملة",
        "count": 52
      },
      {
        "reasonEn": "Pre-authorization Missing",
        "reasonAr": "التصريح المسبق مفقود",
        "count": 41
      },
      {
        "reasonEn": "Coding Error",
        "reasonAr": "خطأ في الترميز",
        "count": 35
      }
    ],
    "pending_letters": 18
  }'
```

**Via Python (Scheduled Job):**
```python
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler

async def send_monthly_summary():
    """Scheduled job to send monthly summary on 1st of each month"""
    
    # Calculate metrics from database
    metrics = await calculate_monthly_metrics()
    
    async with httpx.AsyncClient() as client:
        await client.post(
            'http://localhost:8000/api/teams/notifications/rejection-summary',
            json={
                'month': datetime.now().strftime('%B'),
                'year': datetime.now().year,
                'total_claims': metrics['total_claims'],
                'rejection_rate': metrics['rejection_rate'],
                'total_amount_sar': metrics['total_amount'],
                'recovery_rate': metrics['recovery_rate'],
                'top_reasons': metrics['top_reasons'],
                'pending_letters': metrics['pending_letters'],
            }
        )

# Schedule for 1st of every month at 9 AM
scheduler = AsyncIOScheduler()
scheduler.add_job(send_monthly_summary, 'cron', day=1, hour=9, minute=0)
scheduler.start()
```

### Broadcasting Urgent Messages

```bash
curl -X POST http://localhost:8000/api/teams/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "message": "🚨 URGENT: NPHIES API maintenance scheduled for tonight 10 PM - 2 AM. Claims submissions will be queued. | صيانة NPHIES API المجدولة الليلة 10 مساءً - 2 صباحًا. سيتم وضع طلبات المطالبات في قائمة الانتظار."
  }'
```

## API Reference

### POST `/api/teams/notifications/compliance-letter`

Send compliance letter notification to all Teams installations.

**Request:**
```typescript
{
  title_en: string;         // English title
  title_ar: string;         // Arabic title
  insurance_company: string; // Insurance company name
  claim_id: string;         // Claim reference ID
  amount_sar: number;       // Amount in Saudi Riyals
  rejection_date: string;   // ISO 8601 date
  deadline_days: number;    // Days until deadline (default: 30)
  message_en: string;       // English message body
  message_ar: string;       // Arabic message body
  is_warning: boolean;      // Severity flag
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

### POST `/api/teams/notifications/rejection-summary`

Send monthly rejection summary report.

**Request:**
```typescript
{
  month: string;            // Month name (e.g., "January")
  year: number;             // Year (e.g., 2024)
  total_claims: number;     // Total claims count
  rejection_rate: number;   // Percentage (0-100)
  total_amount_sar: number; // Total SAR amount
  recovery_rate: number;    // Percentage (0-100)
  top_reasons: Array<{      // Top rejection reasons
    reasonEn: string;
    reasonAr: string;
    count: number;
  }>;
  pending_letters: number;  // Count of pending letters
}
```

### POST `/api/teams/notifications/broadcast`

Broadcast simple text message to all channels.

**Request:**
```typescript
{
  message: string;  // Plain text message
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  installations_count: number;
}
```

### GET `/api/teams/installations`

List all Teams installations where bot is active.

**Response:**
```typescript
{
  count: number;
  installations: Array<{
    type: string;          // "channel" | "groupChat" | "personal"
    conversation_id: string;
  }>;
}
```

### GET `/api/teams/health`

Health check for Teams integration service.

**Response:**
```typescript
{
  status: string;       // "healthy" | "unhealthy" | "pending"
  service: string;      // "teams-integration"
  message?: string;
  timestamp: string;    // ISO 8601
}
```

## Adaptive Cards

### Compliance Letter Card Structure

```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        "Logo + Title + Subtitle"
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        "Insurance Company",
        "Claim ID",
        "Amount",
        "Rejection Date",
        "Deadline"
      ]
    },
    {
      "type": "TextBlock",
      "text": "Message body (bilingual)"
    },
    {
      "type": "Container",
      "style": "warning/emphasis",
      "items": ["Status message with icon"]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Details",
      "url": "..."
    },
    {
      "type": "Action.OpenUrl",
      "title": "Submit Appeal",
      "url": "..."
    }
  ]
}
```

### Color Coding

- **Red (Warning)**: Urgent compliance letters, approaching deadlines
- **Blue (Emphasis)**: Information notices, regular updates
- **Green (Good)**: Success messages, appeals approved
- **Yellow (Attention)**: Requires action, review needed

## Integration Patterns

### Pattern 1: Rejection Event Trigger

```python
# In rejection creation endpoint
@app.post("/api/rejections")
async def create_rejection(rejection: RejectionRecord):
    # Save to database
    result = await db.rejections.insert_one(rejection.dict())
    
    # Trigger Teams notification
    await trigger_compliance_notification(rejection)
    
    return {"id": str(result.inserted_id)}


async def trigger_compliance_notification(rejection):
    """Trigger Teams notification for new rejection"""
    
    # Calculate deadline
    rejection_date = rejection.rejection_date
    deadline = rejection_date + timedelta(days=30)
    
    # Send to Teams
    async with httpx.AsyncClient() as client:
        await client.post(
            'http://localhost:8000/api/teams/notifications/compliance-letter',
            json={
                'title_en': 'New Claim Rejection',
                'title_ar': 'رفض مطالبة جديدة',
                'insurance_company': rejection.insurance_company,
                'claim_id': rejection.claim_id,
                'amount_sar': rejection.total_amount,
                'rejection_date': rejection_date.isoformat(),
                'deadline_days': 30,
                'message_en': f'Claim rejected: {rejection.rejection_reason_en}',
                'message_ar': f'تم رفض المطالبة: {rejection.rejection_reason_ar}',
                'is_warning': False,
            }
        )
```

### Pattern 2: Scheduled Reports

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', day=1, hour=9)  # 1st of month at 9 AM
async def send_monthly_reports():
    """Send monthly reports to all stakeholders"""
    
    # Calculate metrics
    metrics = await calculate_monthly_metrics()
    
    # Send to Teams
    await send_teams_summary(metrics)
    
    # Also send via WhatsApp (multi-channel)
    await send_whatsapp_summary(metrics)
    
    # Also send via Email
    await send_email_summary(metrics)
```

### Pattern 3: Multi-Channel Router

```python
class NotificationRouter:
    """Route notifications to appropriate channels"""
    
    async def send_notification(self, notification_type, data, channels=['teams', 'whatsapp']):
        """Send notification to multiple channels"""
        
        tasks = []
        
        if 'teams' in channels:
            tasks.append(self._send_teams(notification_type, data))
        
        if 'whatsapp' in channels:
            tasks.append(self._send_whatsapp(notification_type, data))
        
        if 'email' in channels:
            tasks.append(self._send_email(notification_type, data))
        
        # Execute all in parallel
        await asyncio.gather(*tasks, return_exceptions=True)
```

## Troubleshooting

### Issue: Bot Not Receiving Messages

**Symptoms:**
- No installations showing in `/api/teams/installations`
- Notifications not being delivered

**Solutions:**
1. Verify bot is installed in Teams:
   ```
   Teams > Apps > Manage your apps > Look for "BrainSAIT RCM"
   ```

2. Check Azure AD app credentials:
   ```bash
   echo $BOT_ID
   echo $BOT_PASSWORD
   ```

3. Verify conversation references are being stored:
   ```javascript
   db.teams_conversations.find()
   ```

4. Check bot permissions in Azure AD:
   - Navigate to: Azure Portal > App registrations > Your bot > API permissions
   - Ensure these are granted:
     - `User.Read`
     - `ChatMessage.Send`

### Issue: Adaptive Cards Not Rendering

**Symptoms:**
- Cards showing as plain text or error messages in Teams

**Solutions:**
1. Validate card JSON schema:
   ```bash
   # Test in Adaptive Card Designer
   https://adaptivecards.io/designer/
   ```

2. Check template binding:
   ```typescript
   // Ensure all required fields are provided
   const card = AdaptiveCardBuilder.buildComplianceLetter({
     title: '...',  // ✓ Required
     subtitle: '...', // ✓ Required
     // ... all other required fields
   });
   ```

3. Verify card version compatibility:
   ```json
   {
     "type": "AdaptiveCard",
     "version": "1.4"  // ← Ensure Teams supports this version
   }
   ```

### Issue: MongoDB Connection Errors

**Symptoms:**
- Service fails to initialize
- Error: "Failed to connect to MongoDB"

**Solutions:**
1. Check MongoDB is running:
   ```bash
   systemctl status mongod
   ```

2. Verify connection string:
   ```bash
   echo $MONGO_URI
   # Should be: mongodb://localhost:27017/brainsait_rcm
   ```

3. Test connection manually:
   ```bash
   mongosh "mongodb://localhost:27017/brainsait_rcm"
   ```

4. Check firewall rules:
   ```bash
   sudo ufw status
   sudo ufw allow 27017
   ```

### Issue: Authentication Failures

**Symptoms:**
- 401 Unauthorized errors
- "Invalid bot credentials"

**Solutions:**
1. Regenerate client secret:
   - Azure Portal > App registrations > Your bot
   - Certificates & secrets > New client secret
   - Update `BOT_PASSWORD` in `.env`

2. Verify tenant ID:
   ```bash
   # Check in Azure AD app overview
   TENANT_ID=your-tenant-id
   ```

3. Check token expiration:
   ```bash
   # Client secrets expire after 24 months by default
   # Create new secret if expired
   ```

## Best Practices

1. **Error Handling**: Always wrap Teams notifications in try-catch blocks
2. **Rate Limiting**: Implement rate limiting to avoid throttling
3. **Retry Logic**: Use exponential backoff for failed notifications
4. **Monitoring**: Log all notification attempts and failures
5. **Testing**: Test cards in Adaptive Card Designer before deploying
6. **Security**: Never log `BOT_PASSWORD` or conversation IDs
7. **Localization**: Always provide both Arabic and English content
8. **Performance**: Use batching for bulk notifications

## Next Steps

1. **Deploy to Production**: Configure production Azure AD app and Teams installation
2. **Add Analytics**: Track notification delivery rates and engagement
3. **Implement Webhooks**: Handle Teams bot interactions and responses
4. **Add Templates**: Create additional card templates for different scenarios
5. **Multi-Tenant Support**: Enable per-tenant bot configurations

## Support

For issues or questions:
- GitHub Issues: https://github.com/Fadil369/brainsait-rcm/issues
- Email: support@brainsait.com
- Documentation: https://brainsait.com/docs/teams-integration

## References

- [Microsoft 365 Agents Toolkit](https://github.com/OfficeDev/microsoft-365-agents-toolkit-samples)
- [Adaptive Cards Schema](https://adaptivecards.io/explorer/)
- [Teams Bot Framework](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
- [Azure Bot Service](https://azure.microsoft.com/en-us/services/bot-services/)
