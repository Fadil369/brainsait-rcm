#!/bin/bash

# BrainSAIT RCM - Quick Deployment Script
# This script guides you through deploying the backend API

set -e

echo "🚀 BrainSAIT RCM - Production Deployment"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will help you deploy your FastAPI backend.${NC}"
echo ""
echo "You will need:"
echo "  ✓ MongoDB Atlas account (free)"
echo "  ✓ Render.com account (free)"
echo ""

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}❌ render.yaml not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ render.yaml found${NC}"
echo ""

# Option selection
echo "Choose deployment method:"
echo "  1) Render.com (Recommended - Free tier, easy setup)"
echo "  2) Railway.app (Alternative)"
echo "  3) Manual deployment (advanced)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}📋 Deploying to Render.com${NC}"
        echo ""
        echo "Step 1: Create MongoDB Atlas database"
        echo "  → Visit: https://www.mongodb.com/cloud/atlas/register"
        echo "  → Create FREE M0 cluster"
        echo "  → Create database user with password"
        echo "  → Whitelist IP: 0.0.0.0/0 (allow all)"
        echo "  → Copy connection string"
        echo ""
        read -p "Have you created MongoDB Atlas? (y/n): " mongodb_ready

        if [ "$mongodb_ready" != "y" ]; then
            echo -e "${RED}Please create MongoDB Atlas first, then run this script again.${NC}"
            exit 1
        fi

        echo ""
        read -p "Enter your MongoDB connection string: " mongodb_url

        echo ""
        echo "Step 2: Deploy to Render.com"
        echo "  → Visit: https://dashboard.render.com"
        echo "  → Click 'New +' → 'Web Service'"
        echo "  → Connect your GitHub repository: Fadil369/brainsait-rcm"
        echo "  → Configure:"
        echo "      Name: brainsait-api"
        echo "      Root Directory: apps/api"
        echo "      Runtime: Docker"
        echo "      Instance Type: Free"
        echo ""
        echo "  → Add Environment Variables:"
        echo "      DATABASE_URL = $mongodb_url"
        echo "      MONGODB_DATABASE = brainsait_rcm"
        echo "      JWT_SECRET_KEY = [click Generate]"
        echo "      JWT_ALGORITHM = HS256"
        echo "      ALLOWED_ORIGINS = https://e423374a.brainsait-rcm.pages.dev"
        echo "      ALLOW_CREDENTIALS = true"
        echo "      ENCRYPTION_KEY = [click Generate]"
        echo ""
        echo "  → Click 'Create Web Service'"
        echo "  → Wait for deployment (~5 minutes)"
        echo ""
        read -p "Have you deployed to Render? (y/n): " render_ready

        if [ "$render_ready" != "y" ]; then
            echo -e "${YELLOW}Deploy to Render.com, then run this script again.${NC}"
            exit 0
        fi

        echo ""
        read -p "Enter your Render service URL (e.g., https://brainsait-api.onrender.com): " api_url

        # Update frontend .env.local
        echo ""
        echo "Step 3: Updating frontend configuration..."
        cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_API_URL=$api_url
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_AUTH_TOKEN_KEY=brainsait_auth_token
NEXT_PUBLIC_ENABLE_ANALYTICS=true
EOF

        echo -e "${GREEN}✓ Frontend configuration updated${NC}"

        # Test API
        echo ""
        echo "Step 4: Testing API connection..."
        if curl -s -f "${api_url}/health" > /dev/null; then
            echo -e "${GREEN}✓ API is healthy!${NC}"
        else
            echo -e "${RED}⚠️  API health check failed. It may still be deploying...${NC}"
            echo "   Try again in a few minutes: curl ${api_url}/health"
        fi

        # Rebuild and deploy frontend
        echo ""
        echo "Step 5: Rebuilding and deploying frontend..."
        npm run build --workspace=apps/web

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Frontend build successful${NC}"

            echo ""
            read -p "Deploy frontend to Cloudflare Pages? (y/n): " deploy_frontend

            if [ "$deploy_frontend" == "y" ]; then
                npx wrangler pages deploy apps/web/out --project-name=brainsait-rcm --commit-dirty=true
                echo ""
                echo -e "${GREEN}🎉 Deployment complete!${NC}"
                echo ""
                echo "Visit your app: https://e423374a.brainsait-rcm.pages.dev"
            fi
        else
            echo -e "${RED}❌ Frontend build failed${NC}"
            exit 1
        fi
        ;;

    2)
        echo ""
        echo -e "${YELLOW}📋 Deploying to Railway.app${NC}"
        echo ""

        # Check if railway CLI is installed
        if ! command -v railway &> /dev/null; then
            echo "Installing Railway CLI..."
            npm install -g @railway/cli
        fi

        echo "Logging into Railway..."
        railway login

        echo "Initializing project..."
        cd apps/api
        railway init

        echo "Adding MongoDB..."
        railway add mongodb

        echo "Deploying API..."
        railway up

        echo ""
        echo -e "${GREEN}✓ Railway deployment initiated${NC}"
        echo ""
        echo "Get your API URL from Railway dashboard and update apps/web/.env.local"
        ;;

    3)
        echo ""
        echo -e "${YELLOW}📋 Manual Deployment${NC}"
        echo ""
        echo "Read DEPLOYMENT_GUIDE.md for detailed instructions."
        echo ""
        cat DEPLOYMENT_GUIDE.md
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Deployment process complete!${NC}"
echo -e "${GREEN}============================================${NC}"
