# Stakeholder Channels - Team Collaboration System

## Overview

The Stakeholder Channels system enables real-time communication and collaboration between all stakeholders in the BrainSAIT RCM platform, including:

- **HeadQ RCM Analysts**: Central command and oversight
- **Branch Staff** (Unaizah, Madinah, Khamis, Jazan): Regional operations
- **Providers**: Healthcare facilities and practitioners
- **Payers**: Insurance companies and TPAs
- **Auditors**: Compliance and regulatory oversight
- **NPHIES**: Government integration partners

## Features

### 🏢 Team Management
- Create public, private, or restricted teams
- Role-based access control (Owner, Admin, Moderator, Member, Guest)
- Team settings and customization
- Member invitation and approval workflows

### 💬 Channel-Based Communication
- Multiple channel types:
  - **General**: Team-wide discussions
  - **Claims**: Claim-specific conversations
  - **Denials**: Denial appeal coordination
  - **Compliance**: Audit and regulatory matters
  - **Technical**: IT support and troubleshooting
  - **Announcements**: Official communications

### 📨 Rich Messaging
- Text messages with formatting
- File attachments (documents, images, PDFs)
- @mentions for direct attention
- Message threading for organized conversations
- Reactions/emojis for quick feedback
- Message editing and deletion
- Read receipts

### 🔗 Context-Aware References
- Link messages to specific claims
- Reference denial records
- Attach patient context (privacy-compliant)
- Track SLA timers within conversations

### 🔔 Smart Notifications
- Real-time push notifications
- Email notifications (configurable)
- SMS alerts for urgent matters
- Notification preferences per team/channel

### 📊 Analytics & Insights
- Channel activity metrics
- Response time tracking
- Collaboration scores
- Member engagement analytics

## Architecture

### Backend (FastAPI)

```
apps/api/stakeholder_channels.py
├── Team Management Endpoints
│   ├── POST /api/v1/channels/teams
│   ├── GET /api/v1/channels/teams
│   ├── GET /api/v1/channels/teams/{team_id}
│   └── DELETE /api/v1/channels/teams/{team_id}
├── Channel Management Endpoints
│   ├── POST /api/v1/channels/channels
│   ├── GET /api/v1/channels/channels/{channel_id}/messages
├── Messaging Endpoints
│   └── POST /api/v1/channels/messages
└── Member Management Endpoints
    └── POST /api/v1/channels/teams/{team_id}/members
```

### Frontend (React/Next.js)

```
apps/web/src/
├── components/
│   └── StakeholderChannels.tsx    # Main collaboration UI
└── app/
    └── channels/
        └── page.tsx                # Channels page
```

### Data Models

```
packages/shared-models/
├── src/
│   └── stakeholder-channels.ts    # TypeScript models
└── python/
    └── stakeholder_channels.py    # Python models (Pydantic)
```

### Database Schema

```
infrastructure/
└── mongo-stakeholder-channels-schema.py
```

## Database Collections

### `stakeholders`
Stores user profiles and organization information.

### `teams`
Team definitions with settings and member lists.

### `team_members`
Junction table for team membership with roles.

### `channels`
Communication channels within teams.

### `messages`
All messages with threading, attachments, and references.

### `channel_reads`
Tracks read positions for unread count calculation.

### `notifications`
User notifications across the platform.

### `activity_logs`
Audit trail of all team/channel activities.

## API Usage Examples

### Creating a Team

```bash
POST /api/v1/channels/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Claims Operations - Q4 2025",
  "description": "Coordination for end-of-year claims processing",
  "type": "private",
  "member_ids": ["user1", "user2", "user3"]
}
```

### Creating a Channel

```bash
POST /api/v1/channels/channels
Authorization: Bearer <token>
Content-Type: application/json

{
  "team_id": "team-123",
  "name": "urgent-denials",
  "description": "High-priority denial appeals",
  "type": "denials",
  "is_private": false
}
```

### Sending a Message

```bash
POST /api/v1/channels/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "channel_id": "channel-456",
  "content": "@john Can you review claim #CLM-789? It's been denied with code R01.",
  "priority": "high",
  "mentions": ["user-john"],
  "claim_reference": {
    "claim_id": "CLM-789",
    "claim_number": "2025-CLM-789"
  }
}
```

### Getting Channel Messages

```bash
GET /api/v1/channels/channels/{channel_id}/messages?limit=50
Authorization: Bearer <token>
```

## Frontend Component Usage

```tsx
import { StakeholderChannels } from '@/components/StakeholderChannels';

export default function CollaborationPage() {
  const { user } = useAuth(); // Your auth hook

  return (
    <StakeholderChannels
      userId={user.id}
      userProfile={user.profile}
      locale={user.locale || 'en'}
    />
  );
}
```

## Real-Time Features (Future Enhancement)

### WebSocket Events

The system is designed to support real-time updates via WebSocket:

```typescript
// Event types
interface WebSocketEvent {
  event_type: 'message' | 'typing' | 'presence' | 'reaction';
  channel_id?: string;
  data: any;
  timestamp: string;
}

// Typing indicators
interface TypingIndicator {
  channel_id: string;
  stakeholder_id: string;
  stakeholder_name: string;
  is_typing: boolean;
}

// Presence updates
interface PresenceUpdate {
  stakeholder_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
}
```

## Security & Permissions

### Role-Based Access Control

| Role | Permissions |
|------|------------|
| **Owner** | Full control, can delete team |
| **Admin** | Manage members, channels, settings |
| **Moderator** | Moderate messages, manage content |
| **Member** | Send messages, view channels |
| **Guest** | Limited access to specific channels |

### Channel Privacy

- **Public Channels**: All team members can access
- **Private Channels**: Only invited members can access
- **Read-Only Channels**: Announcements, admins only can post

### Data Privacy

- Messages are encrypted at rest
- Audit logs for all activities
- GDPR-compliant data retention
- Patient data references are minimal (ID only, no PHI in messages)

## Integration Points

### Claims System
- Reference claims in messages
- Receive claim status updates in channels
- Coordinate claim appeals

### Denial Management
- Track denial appeals in dedicated channels
- SLA timer visibility
- Automatic escalation notifications

### OASIS+ Integration
- Notifications for submission status
- Eligibility verification alerts
- Authorization updates

### Audit & Compliance
- Full activity audit trail
- Regulatory oversight channels
- Compliance report generation

## Setup & Deployment

### 1. Install Dependencies

```bash
cd apps/api
pip install -r requirements.txt

cd ../web
npm install
```

### 2. Configure Environment

```bash
# Add to .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/brainsait_rcm
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
```

### 3. Run Database Migration

```bash
python infrastructure/mongo-stakeholder-channels-schema.py
```

### 4. Start Services

```bash
# Backend
cd apps/api
uvicorn main:app --reload --port 8000

# Frontend
cd apps/web
npm run dev
```

### 5. Access the Interface

Navigate to `http://localhost:3000/channels`

## Performance Considerations

### Pagination
- Messages are paginated (default 50 per page)
- Lazy loading for older messages
- Optimized queries with proper indexing

### Caching
- Channel metadata cached
- User profiles cached
- Redis for real-time presence (future)

### Scalability
- MongoDB sharding for large datasets
- Message archival after retention period
- CDN for file attachments

## Monitoring & Analytics

### Key Metrics
- Messages per channel
- Average response time
- Active users per team
- Channel engagement scores

### Alerts
- Unusual activity patterns
- Failed message delivery
- Database performance issues

## Roadmap

### Phase 1: ✅ Core Features (Completed)
- [x] Team and channel management
- [x] Basic messaging
- [x] File attachments
- [x] Notifications
- [x] Read tracking

### Phase 2: 🚧 Real-Time Features (In Progress)
- [ ] WebSocket integration
- [ ] Typing indicators
- [ ] Online presence
- [ ] Live updates

### Phase 3: 📅 Advanced Features (Planned)
- [ ] Video/audio calls
- [ ] Screen sharing
- [ ] Advanced search
- [ ] Message translation (AR ↔ EN)
- [ ] AI-powered summaries
- [ ] Automated workflows

### Phase 4: 🔮 AI Integration (Future)
- [ ] Smart suggestions
- [ ] Sentiment analysis
- [ ] Auto-categorization
- [ ] Chatbot assistance

## Best Practices

### For Administrators
1. Create focused teams for specific purposes
2. Set up clear channel naming conventions
3. Define notification policies
4. Regular activity audits

### For Users
1. Use @mentions sparingly
2. Keep messages concise and clear
3. Use threads for detailed discussions
4. Mark urgent messages with high priority

### For Developers
1. Always validate input data
2. Handle errors gracefully
3. Log important activities
4. Test permissions thoroughly

## Troubleshooting

### Common Issues

**Messages not appearing**
- Check channel permissions
- Verify user is team member
- Check network connectivity

**Notifications not working**
- Verify notification preferences
- Check email/push configuration
- Review notification logs

**Performance issues**
- Check database indexes
- Monitor query performance
- Review message pagination

## Support

For technical issues or questions:
- **GitHub Issues**: https://github.com/Fadil369/brainsait-rcm/issues
- **Documentation**: `/STAKEHOLDER_CHANNELS.md`
- **API Reference**: `/API_DOCUMENTATION.md`

---

**Last Updated**: October 6, 2025  
**Version**: 1.0.0  
**Status**: Production Ready
