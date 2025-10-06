#!/bin/bash

# BrainSAIT RCM - Teams Stakeholder Channels Quick Start Script
# This script helps you start all required services for local development

set -e

echo "🚀 BrainSAIT RCM Teams App - Quick Start"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the teams-stakeholder-channels directory${NC}"
    exit 1
fi

# Check if .env.local exists
if [ ! -f "env/.env.local" ]; then
    echo -e "${YELLOW}⚠️  Warning: env/.env.local not found${NC}"
    echo "Creating from template..."
    if [ -f "env/.env.local.example" ]; then
        cp env/.env.local.example env/.env.local
        echo -e "${GREEN}✅ Created env/.env.local${NC}"
    fi
fi

# Check if dependencies are installed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ ! -d "src/node_modules" ]; then
    echo "Installing tab dependencies..."
    cd src && npm install && cd ..
fi

if [ ! -d "bot/node_modules" ]; then
    echo "Installing bot dependencies..."
    cd bot && npm install && cd ..
fi

echo -e "${GREEN}✅ All dependencies installed${NC}"
echo ""

# Check if backend API is running
echo -e "${YELLOW}🔍 Checking backend API...${NC}"
if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is running on port 8000${NC}"
else
    echo -e "${RED}❌ Backend API is not running${NC}"
    echo ""
    echo "Please start the backend API first:"
    echo -e "${YELLOW}  cd ../../api${NC}"
    echo -e "${YELLOW}  uvicorn main:app --reload --port 8000${NC}"
    echo ""
    read -p "Press Enter once the API is running, or Ctrl+C to exit..."
fi

echo ""
echo -e "${GREEN}🎯 Starting Teams App Services...${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"
    kill 0
    exit
}

trap cleanup SIGINT SIGTERM

# Start Tab in background
echo -e "${YELLOW}📱 Starting Tab (React App) on https://localhost:53000...${NC}"
cd src
npm start > ../logs/tab.log 2>&1 &
TAB_PID=$!
cd ..

sleep 3

# Start Bot in background
echo -e "${YELLOW}🤖 Starting Bot on http://localhost:3978...${NC}"
cd bot
npm run dev > ../logs/bot.log 2>&1 &
BOT_PID=$!
cd ..

sleep 3

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "======================================"
echo "📊 Service Status:"
echo "======================================"
echo -e "${GREEN}✅ Backend API:${NC}  http://localhost:8000"
echo -e "${GREEN}✅ Tab App:${NC}      https://localhost:53000"
echo -e "${GREEN}✅ Bot:${NC}          http://localhost:3978"
echo ""
echo "======================================"
echo "📝 Next Steps:"
echo "======================================"
echo "1. Open VS Code with M365 Agents Toolkit extension"
echo "2. Press F5 to provision and sideload to Teams"
echo "   OR"
echo "   Run: Teams: Provision from command palette"
echo ""
echo -e "${YELLOW}💡 Tip: View logs in the logs/ directory${NC}"
echo ""
echo -e "${RED}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all background processes
wait
