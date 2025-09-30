# BrainSAIT RCM - Complete Setup Guide

## 🎉 System Overview

Your complete BrainSAIT Healthcare Claims Management System has been built with all requested features:

✅ **Core System**
- Next.js Web Dashboard with TypeScript
- FastAPI Backend with MongoDB integration
- React Native Mobile App
- Docker containerization
- Cloudflare deployment configuration

✅ **Advanced Features**
- AI-Powered Fraud Detection (Duplicate, Unbundling, Upcoding, Phantom Billing)
- Predictive Analytics Engine (Forecasting rejection rates, recovery rates, claim volumes)
- Multi-Tenant Support (Multiple healthcare facilities)
- Advanced Reporting Dashboard (Excel reports with 7+ sheets)
- WhatsApp Notifications (Compliance alerts, fraud alerts, training reminders)

## 📁 Project Structure

```
rcm-haya/
├── apps/
│   ├── web/                    # Next.js Dashboard
│   │   ├── src/
│   │   │   ├── app/           # Next.js 14 App Router
│   │   │   └── components/    # React components
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── Dockerfile
│   │
│   ├── mobile/                 # React Native App
│   │   ├── src/
│   │   │   ├── screens/       # Mobile screens
│   │   │   ├── navigation/    # Navigation setup
│   │   │   └── services/      # API services
│   │   ├── App.tsx
│   │   └── package.json
│   │
│   └── api/                    # FastAPI Backend
│       ├── main.py            # Main API routes
│       ├── multi_tenant.py    # Multi-tenant system
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   ├── rejection-tracker/     # Core rejection logic & types
│   │   └── src/
│   │       ├── types.ts       # TypeScript interfaces
│   │       └── utils.ts       # Utility functions
│   │
│   ├── notification-service/  # Compliance letters
│   │   └── src/
│   │       └── complianceLetters.ts
│   │
│   └── compliance-reporter/   # Advanced Excel reports
│       └── src/
│           └── advancedReporter.ts
│
├── services/
│   ├── fraud-detection/       # AI fraud detection
│   │   └── src/
│   │       └── fraud_detector.py
│   │
│   ├── predictive-analytics/  # Forecasting engine
│   │   └── src/
│   │       └── predictor.py
│   │
│   └── whatsapp-notifications/ # WhatsApp service
│       └── src/
│           └── whatsapp_service.py
│
├── infrastructure/
│   └── mongo-init.js          # MongoDB initialization
│
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI/CD pipeline
│
├── docker-compose.yml         # Docker services
├── wrangler.toml             # Cloudflare config
├── CLAUDE.md                 # Development guide
├── DEPLOYMENT.md             # Deployment instructions
└── README.md                 # Project documentation
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for API
cd apps/api
pip install -r requirements.txt
cd ../..

# Install Python dependencies for services
cd services/fraud-detection
pip install -r requirements.txt
cd ../predictive-analytics
pip install -r requirements.txt
cd ../whatsapp-notifications
pip install -r requirements.txt
cd ../..
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:
- `DATABASE_URL`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `NPHIES_API_KEY`: Saudi NPHIES API key
- `ENCRYPTION_KEY`: 32-character encryption key
- `JWT_SECRET`: JWT secret for authentication
- `TWILIO_ACCOUNT_SID`: For WhatsApp notifications
- `TWILIO_AUTH_TOKEN`: For WhatsApp notifications
- `CLOUDFLARE_API_TOKEN`: For deployment

### 3. Start Development Environment

```bash
# Start MongoDB and Redis with Docker
docker-compose up -d mongodb redis

# Build TypeScript packages
cd packages/rejection-tracker && npm run build && cd ../..
cd packages/notification-service && npm run build && cd ../..
cd packages/compliance-reporter && npm run build && cd ../..

# Start Next.js web dashboard
cd apps/web
npm run dev

# In another terminal, start FastAPI backend
cd apps/api
uvicorn main:app --reload

# In another terminal, start mobile app
cd apps/mobile
npm start
```

Access:
- **Web Dashboard**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Mobile App**: Expo Dev Tools will open

## 🔧 Feature Configuration

### AI Fraud Detection

Located in `services/fraud-detection/src/fraud_detector.py`

Detects:
- **Duplicate Billing**: Same service billed multiple times
- **Unbundling**: Bundled services billed separately
- **Upcoding**: Higher-level services than provided
- **Phantom Billing**: Services not actually provided
- **ML Anomalies**: Machine learning pattern detection

Usage:
```python
from fraud_detector import run_fraud_detection

results = run_fraud_detection(
    claims=claim_data,
    historical_data=historical_claims,
    facility_schedules=physician_schedules
)
```

### Predictive Analytics

Located in `services/predictive-analytics/src/predictor.py`

Forecasts:
- Rejection rates (next 30 days)
- Recovery rates
- Claim volumes
- High-risk periods
- Appeal success probability

Usage:
```python
from predictor import run_predictive_analysis

forecast = run_predictive_analysis(
    historical_data=claims_history,
    forecast_days=30
)
```

### Multi-Tenant System

Located in `apps/api/multi_tenant.py`

Features:
- Isolated databases per tenant
- Subdomain routing (tenant1.brainsait.com)
- Header-based tenant identification (X-Tenant-ID)
- Automatic tenant provisioning

Usage in API routes:
```python
from multi_tenant import get_current_tenant, get_tenant_db

@app.get("/api/rejections")
async def get_rejections(
    tenant: TenantContext = Depends(get_current_tenant),
    db = Depends(get_tenant_db)
):
    rejections = await db.rejections.find({}).to_list(100)
    return rejections
```

### Advanced Reporting

Located in `packages/compliance-reporter/src/advancedReporter.ts`

Generates Excel reports with 7 sheets:
1. Executive Summary
2. Detailed Rejections
3. Insurance Company Analysis
4. Branch Performance
5. Trend Analysis
6. Physician Analysis
7. Financial Impact

Usage:
```typescript
import { AdvancedReporter } from '@brainsait/compliance-reporter';

const reporter = new AdvancedReporter();
const workbook = await reporter.generateAdvancedReport(rejections, {
  month: 1,
  year: 2024,
  includeCharts: true,
  includeTrends: true,
  includeComparisons: true
});
```

### WhatsApp Notifications

Located in `services/whatsapp-notifications/src/whatsapp_service.py`

Sends notifications for:
- Compliance alerts (overdue rejections)
- New rejection notifications
- Appeal status updates
- Monthly report availability
- Fraud detection alerts
- Training reminders

Usage:
```python
from whatsapp_service import WhatsAppNotificationService

service = WhatsAppNotificationService()

await service.send_compliance_alert(
    to_number='+966501234567',
    insurance_company='ACME Insurance',
    days_overdue=5,
    total_amount=150000.00
)
```

## 🌐 Deployment to Cloudflare

### Prerequisites
1. Cloudflare account with brainsait.com domain
2. MongoDB Atlas account (or external MongoDB)
3. Redis Cloud account (or external Redis)
4. Twilio account (for WhatsApp)

### Step 1: Configure Cloudflare

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create Pages project
wrangler pages project create brainsait-rcm
```

### Step 2: Set Environment Variables in Cloudflare

Go to Cloudflare Dashboard → Pages → brainsait-rcm → Settings → Environment variables

Add all variables from `.env.example`

### Step 3: Deploy

#### Option A: Automatic (GitHub Actions)

```bash
# Push to GitHub
git add .
git commit -m "Initial deployment"
git push origin main
```

GitHub Actions will automatically deploy to Cloudflare.

#### Option B: Manual

```bash
# Build and deploy frontend
cd apps/web
npm run build
wrangler pages publish .next --project-name=brainsait-rcm

# Deploy API (requires separate hosting or Cloudflare Workers)
cd apps/api
wrangler deploy
```

### Step 4: Configure Custom Domain

1. Go to Cloudflare Pages → brainsait-rcm → Custom domains
2. Add domain: `rcm.brainsait.com` or `app.brainsait.com`
3. DNS records will be configured automatically

## 📊 Using the System

### Web Dashboard

1. Access: https://rcm.brainsait.com
2. Login with credentials
3. Dashboard shows:
   - Monthly claims count
   - Rejection rate
   - Recovery rate
   - Pending compliance letters

### Mobile App

1. Install Expo Go on iOS/Android
2. Scan QR code from `npm start`
3. Features:
   - Dashboard with key metrics
   - Rejections list
   - Compliance letters
   - Settings

### API Endpoints

Base URL: https://api.brainsait.com

- `GET /health` - Health check
- `GET /api/rejections/current-month` - Get rejections
- `POST /api/rejections` - Create rejection
- `GET /api/compliance/letters/pending` - Get letters
- `POST /api/compliance/letters` - Create letter

Full API documentation: https://api.brainsait.com/docs

## 🧪 Testing

### Run Tests

```bash
# Frontend tests
cd apps/web
npm test

# Backend tests
cd apps/api
pytest

# Mobile tests
cd apps/mobile
npm test
```

### Test Fraud Detection

```bash
cd services/fraud-detection
python -m pytest tests/
```

### Test Predictive Analytics

```bash
cd services/predictive-analytics
python -m pytest tests/
```

## 📈 Monitoring

### Application Logs

```bash
# View API logs
docker-compose logs -f api

# View worker logs
docker-compose logs -f worker
```

### Cloudflare Analytics

Access: Cloudflare Dashboard → Analytics

Monitor:
- Page views
- API requests
- Response times
- Error rates

### Database Monitoring

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/brainsait

# View collections
show collections

# Query rejections
db.rejections.find().limit(10)
```

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong ENCRYPTION_KEY (32+ characters)
- [ ] Enable Cloudflare WAF
- [ ] Configure rate limiting
- [ ] Set up SSL/TLS certificates
- [ ] Enable audit logging
- [ ] Configure backup strategy
- [ ] Whitelist IP addresses for admin routes
- [ ] Enable two-factor authentication
- [ ] Regular security audits

## 🆘 Troubleshooting

### Issue: Cannot connect to database
**Solution**: Check DATABASE_URL in .env and ensure MongoDB is running

### Issue: Build fails
**Solution**: Run `npm install` in all package directories

### Issue: API returns 500 error
**Solution**: Check API logs with `docker-compose logs api`

### Issue: WhatsApp notifications not sending
**Solution**: Verify Twilio credentials in .env

### Issue: Fraud detection not working
**Solution**: Ensure sufficient historical data (100+ records)

## 📚 Additional Resources

- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment instructions
- [app.txt](./app.txt) - Feature specifications
- API Documentation: /docs endpoint
- Cloudflare Docs: https://developers.cloudflare.com/pages/

## 💬 Support

- **Technical Support**: tech@brainsait.com
- **General Inquiries**: support@brainsait.com
- **Website**: https://brainsait.com

---

**Built with ❤️ for Saudi Healthcare Providers**

All features implemented and ready for deployment to brainsait.com! 🚀