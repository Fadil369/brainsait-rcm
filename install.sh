#!/bin/bash

echo "🚀 BrainSAIT RCM - Installation Script"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Installing root dependencies...${NC}"
npm install turbo typescript --save-dev --legacy-peer-deps

echo -e "${YELLOW}Step 2: Installing web app dependencies...${NC}"
cd apps/web
npm install --legacy-peer-deps
cd ../..

echo -e "${YELLOW}Step 3: Installing mobile app dependencies...${NC}"
cd apps/mobile
npm install --legacy-peer-deps
cd ../..

echo -e "${YELLOW}Step 4: Installing API dependencies...${NC}"
cd apps/api
pip3 install -r requirements.txt
cd ../..

echo -e "${YELLOW}Step 5: Installing TypeScript packages...${NC}"
cd packages/rejection-tracker
npm install --legacy-peer-deps
cd ../..

cd packages/notification-service
npm install --legacy-peer-deps
cd ../..

cd packages/compliance-reporter
npm install --legacy-peer-deps
cd ../..

echo -e "${YELLOW}Step 6: Installing Python services...${NC}"
cd services/fraud-detection
pip3 install -r requirements.txt
cd ../..

cd services/predictive-analytics
pip3 install -r requirements.txt
cd ../..

cd services/whatsapp-notifications
pip3 install -r requirements.txt
cd ../..

echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Copy environment file: cp .env.example .env"
echo "2. Edit .env with your credentials"
echo "3. Start services: docker-compose up -d mongodb redis"
echo "4. Run development: npm run dev"
echo ""
echo "📚 See SETUP_GUIDE.md for detailed instructions"