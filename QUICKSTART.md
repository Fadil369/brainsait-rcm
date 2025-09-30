# 🚀 Quick Start Guide

## Installation Progress

Your `npm install` command is currently running in the background. This can take 5-15 minutes for a large monorepo.

## Alternative: Step-by-Step Installation

If the global install is taking too long, run this script instead:

```bash
./install.sh
```

Or manually install each component:

### 1. Root Dependencies
```bash
npm install turbo typescript --save-dev
```

### 2. Web App
```bash
cd apps/web
npm install
cd ../..
```

### 3. Mobile App
```bash
cd apps/mobile
npm install
cd ../..
```

### 4. API (Python)
```bash
cd apps/api
pip3 install -r requirements.txt
cd ../..
```

### 5. TypeScript Packages
```bash
# Rejection Tracker
cd packages/rejection-tracker
npm install && npm run build
cd ../..

# Notification Service
cd packages/notification-service
npm install && npm run build
cd ../..

# Compliance Reporter
cd packages/compliance-reporter
npm install && npm run build
cd ../..
```

### 6. Python Services
```bash
# Fraud Detection
cd services/fraud-detection
pip3 install -r requirements.txt
cd ../..

# Predictive Analytics
cd services/predictive-analytics
pip3 install -r requirements.txt
cd ../..

# WhatsApp Notifications
cd services/whatsapp-notifications
pip3 install -r requirements.txt
cd ../..
```

## Quick Setup (Without Full Install)

If you want to test quickly without installing everything:

### Just Web Dashboard
```bash
cd apps/web
npm install
npm run dev
```
Access at http://localhost:3000

### Just API
```bash
cd apps/api
pip3 install -r requirements.txt
uvicorn main:app --reload
```
Access at http://localhost:8000

### Just Mobile
```bash
cd apps/mobile
npm install
npx expo start
```

## Environment Configuration

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Minimal required variables:
```env
DATABASE_URL=mongodb://localhost:27017/brainsait
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Start Services

### With Docker (Recommended)
```bash
# Start MongoDB and Redis
docker-compose up -d mongodb redis

# Start API
cd apps/api
uvicorn main:app --reload

# In another terminal, start web
cd apps/web
npm run dev
```

### Without Docker
Install MongoDB and Redis locally, then start them:
```bash
# MongoDB
mongod --dbpath /usr/local/var/mongodb

# Redis
redis-server

# Then start API and web as above
```

## Verify Installation

```bash
# Check web dashboard
curl http://localhost:3000

# Check API
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","database":"connected"}
```

## Common Issues

### Issue: npm install hangs
**Solution**: Use `./install.sh` instead or install components individually

### Issue: Python packages fail
**Solution**: Make sure you have Python 3.11+ installed
```bash
python3 --version  # Should be 3.11 or higher
pip3 install --upgrade pip
```

### Issue: MongoDB connection error
**Solution**: Make sure MongoDB is running
```bash
docker-compose up -d mongodb
# OR
brew services start mongodb-community  # macOS
sudo systemctl start mongod  # Linux
```

### Issue: Port already in use
**Solution**: Change ports in .env file or kill existing processes
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

## Next Steps

Once installation is complete:

1. ✅ Read [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed feature documentation
2. ✅ Read [DEPLOYMENT.md](./DEPLOYMENT.md) for Cloudflare deployment
3. ✅ Read [CLAUDE.md](./CLAUDE.md) for development guidelines

## Test the Features

### Test Fraud Detection
```bash
cd services/fraud-detection
python3 -c "from src.fraud_detector import FraudDetector; print('✅ Fraud detection ready')"
```

### Test Predictive Analytics
```bash
cd services/predictive-analytics
python3 -c "from src.predictor import PredictiveAnalytics; print('✅ Predictive analytics ready')"
```

### Test WhatsApp Service
```bash
cd services/whatsapp-notifications
python3 -c "from src.whatsapp_service import WhatsAppNotificationService; print('✅ WhatsApp service ready')"
```

## Support

If you encounter any issues:

1. Check the logs: `docker-compose logs -f`
2. Review [SETUP_GUIDE.md](./SETUP_GUIDE.md)
3. Contact: tech@brainsait.com

---

**🎉 Happy coding!**