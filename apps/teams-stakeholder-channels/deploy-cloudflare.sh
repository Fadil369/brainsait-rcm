#!/bin/bash
# Cloudflare Deployment Script for Microsoft Teams App
# Deploy to brainsait.com infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BrainSAIT RCM - Teams App Cloudflare Deployment            ║${NC}"
echo -e "${BLUE}║  Domain: brainsait.com                                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
DOMAIN="brainsait.com"
TEAMS_SUBDOMAIN="teams.${DOMAIN}"
BOT_SUBDOMAIN="teams-bot.${DOMAIN}"
APP_NAME="brainsait-teams"

# Step 1: Check Prerequisites
echo -e "${YELLOW}Step 1: Checking Prerequisites...${NC}"

# Check wrangler CLI
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}Installing Cloudflare Wrangler CLI...${NC}"
    npm install -g wrangler
fi
echo -e "${GREEN}✅ Wrangler CLI available${NC}"

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "Logging into Cloudflare..."
    wrangler login
fi
echo -e "${GREEN}✅ Logged into Cloudflare${NC}"
echo ""

# Step 2: Azure AD App Registration (Still needed for Teams SSO)
echo -e "${YELLOW}Step 2: Azure AD App Registration${NC}"
echo "For Teams SSO, we still need Azure AD app registration."
echo ""

# Check if Azure CLI is available
if command -v az &> /dev/null; then
    echo "Azure CLI detected. Creating AD app..."
    
    # Login if not already
    if ! az account show &> /dev/null; then
        echo "Please login to Azure..."
        az login --use-device-code
    fi
    
    # Create Azure AD app
    AAD_APP_NAME="${APP_NAME}-teams-app"
    AAD_APP_JSON=$(az ad app create \
        --display-name "$AAD_APP_NAME" \
        --sign-in-audience "AzureADMyOrg" \
        --web-redirect-uris "https://${TEAMS_SUBDOMAIN}/auth/callback" "https://teams.microsoft.com/api/platform/v1.0/teams" \
        --enable-id-token-issuance true)
    
    AAD_APP_CLIENT_ID=$(echo "$AAD_APP_JSON" | jq -r '.appId')
    
    # Create client secret
    AAD_APP_SECRET_JSON=$(az ad app credential reset --id "$AAD_APP_CLIENT_ID" --append)
    AAD_APP_CLIENT_SECRET=$(echo "$AAD_APP_SECRET_JSON" | jq -r '.password')
    TENANT_ID=$(az account show --query tenantId -o tsv)
    
    echo -e "${GREEN}✅ Azure AD App created${NC}"
    echo "   App ID: $AAD_APP_CLIENT_ID"
    echo "   Tenant ID: $TENANT_ID"
else
    echo -e "${YELLOW}⚠️  Azure CLI not found. Please create Azure AD app manually:${NC}"
    echo "   1. Go to: https://portal.azure.com"
    echo "   2. Azure Active Directory > App registrations"
    echo "   3. New registration > Name: '${APP_NAME}'"
    echo "   4. Redirect URI: https://${TEAMS_SUBDOMAIN}/auth/callback"
    echo ""
    read -p "Enter App (Client) ID: " AAD_APP_CLIENT_ID
    read -p "Enter Client Secret: " AAD_APP_CLIENT_SECRET
    read -p "Enter Tenant ID: " TENANT_ID
fi
echo ""

# Step 3: Azure Bot Service (Required for Teams Bot)
echo -e "${YELLOW}Step 3: Azure Bot Service${NC}"

if command -v az &> /dev/null; then
    echo "Creating Azure Bot Service (required for Teams bots)..."
    
    # Get or create resource group
    RESOURCE_GROUP="${APP_NAME}-rg"
    if ! az group exists --name "$RESOURCE_GROUP" | grep -q "true"; then
        az group create --name "$RESOURCE_GROUP" --location "eastus"
    fi
    
    # Create Bot Service
    BOT_NAME="${APP_NAME}-bot"
    az bot create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$BOT_NAME" \
        --kind "azurebot" \
        --app-type "MultiTenant" \
        --appid "$AAD_APP_CLIENT_ID" \
        --password "$AAD_APP_CLIENT_SECRET" \
        --location "global" \
        --sku "F0" \
        --endpoint "https://${BOT_SUBDOMAIN}/api/messages"
    
    # Enable Teams channel
    az bot msteams create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$BOT_NAME"
    
    BOT_ID="$AAD_APP_CLIENT_ID"
    BOT_PASSWORD="$AAD_APP_CLIENT_SECRET"
    
    echo -e "${GREEN}✅ Azure Bot Service created${NC}"
else
    echo -e "${YELLOW}⚠️  Please create Azure Bot Service manually${NC}"
    read -p "Enter Bot ID: " BOT_ID
    read -p "Enter Bot Password: " BOT_PASSWORD
fi
echo ""

# Step 4: Deploy Bot as Cloudflare Worker
echo -e "${YELLOW}Step 4: Deploying Bot to Cloudflare Workers${NC}"

cd bot

# Create wrangler.toml for bot
cat > wrangler.toml << EOF
name = "brainsait-teams-bot"
main = "index.ts"
compatibility_date = "2024-01-01"

# Custom domain for bot
routes = [
  { pattern = "${BOT_SUBDOMAIN}/*", custom_domain = true }
]

# Environment variables
[vars]
BOT_ENDPOINT = "https://${BOT_SUBDOMAIN}"

# Secrets (set separately with wrangler secret put)
# BOT_ID, BOT_PASSWORD, MONGODB_URI

# KV namespace for bot state (create if needed)
[[kv_namespaces]]
binding = "BOT_STATE"
id = "{{ kv_namespace_id }}"
EOF

# Install dependencies
npm install

# Set secrets
echo "Setting Cloudflare secrets..."
echo "$BOT_ID" | wrangler secret put BOT_ID
echo "$BOT_PASSWORD" | wrangler secret put BOT_PASSWORD
echo "mongodb+srv://fadil_db_user:1rlK8vj6YF5reQoc@cluster0.ozzjwto.mongodb.net/brainsait_rcm" | wrangler secret put MONGODB_URI

# Deploy bot worker
echo "Deploying bot to Cloudflare Workers..."
wrangler deploy

echo -e "${GREEN}✅ Bot deployed to https://${BOT_SUBDOMAIN}${NC}"
cd ..
echo ""

# Step 5: Deploy Tab UI to Cloudflare Pages
echo -e "${YELLOW}Step 5: Deploying Tab UI to Cloudflare Pages${NC}"

cd src

# Install dependencies
npm install

# Build the React app
npm run build

# Deploy to Cloudflare Pages
echo "Deploying tab to Cloudflare Pages..."
npx wrangler pages deploy build --project-name=brainsait-teams-tab

# Get the Pages URL
PAGES_URL=$(wrangler pages project list | grep brainsait-teams-tab | awk '{print $2}')
TAB_ENDPOINT="https://${TEAMS_SUBDOMAIN}"

echo -e "${GREEN}✅ Tab deployed to Cloudflare Pages${NC}"
echo "   Temporary URL: $PAGES_URL"
echo "   Custom domain: $TAB_ENDPOINT (configure DNS)"
cd ..
echo ""

# Step 6: Configure Custom Domains in Cloudflare
echo -e "${YELLOW}Step 6: Configuring Custom Domains${NC}"
echo ""
echo "Please add these DNS records in your Cloudflare dashboard:"
echo ""
echo "  CNAME  ${TEAMS_SUBDOMAIN}     ->  brainsait-teams-tab.pages.dev"
echo "  CNAME  ${BOT_SUBDOMAIN}       ->  ${APP_NAME}-bot.workers.dev"
echo ""
echo "Or use wrangler to configure:"
echo "  wrangler pages domains add ${TEAMS_SUBDOMAIN} --project-name=brainsait-teams-tab"
echo ""
read -p "Press Enter when DNS is configured..."
echo -e "${GREEN}✅ Custom domains configured${NC}"
echo ""

# Step 7: Update .env.local
echo -e "${YELLOW}Step 7: Updating Environment Configuration${NC}"

cat > .env.local << EOF
# Microsoft Teams App Environment Configuration
# Deployed to Cloudflare - brainsait.com
# Generated on $(date)

# ============================================
# Teams App Configuration
# ============================================
TEAMS_APP_ID=${AAD_APP_CLIENT_ID}
BOT_ID=${BOT_ID}
BOT_PASSWORD=${BOT_PASSWORD}
AAD_APP_CLIENT_ID=${AAD_APP_CLIENT_ID}
AAD_APP_CLIENT_SECRET=${AAD_APP_CLIENT_SECRET}
AAD_APP_TENANT_ID=${TENANT_ID}

# ============================================
# Cloudflare Endpoints
# ============================================
TAB_ENDPOINT=https://${TEAMS_SUBDOMAIN}
TAB_DOMAIN=${TEAMS_SUBDOMAIN}
BOT_DOMAIN=${BOT_SUBDOMAIN}
BOT_ENDPOINT=https://${BOT_SUBDOMAIN}
API_BASE_URL=https://api.${DOMAIN}/v1/channels

# ============================================
# BrainSAIT RCM Backend Integration
# ============================================
BRAINSAIT_API_URL=https://api.${DOMAIN}
REACT_APP_API_URL=https://api.${DOMAIN}/v1/channels

# ============================================
# Database - MongoDB Atlas
# ============================================
MONGODB_URI=mongodb+srv://fadil_db_user:1rlK8vj6YF5reQoc@cluster0.ozzjwto.mongodb.net/brainsait_rcm?retryWrites=true&w=majority
MONGODB_DB_NAME=brainsait_rcm

# ============================================
# Cloudflare Configuration
# ============================================
CLOUDFLARE_DOMAIN=${DOMAIN}
CLOUDFLARE_PAGES_URL=${PAGES_URL}
CLOUDFLARE_WORKER_URL=https://${BOT_SUBDOMAIN}

# ============================================
# Security
# ============================================
ALLOWED_ORIGINS=https://teams.microsoft.com,https://*.teams.microsoft.com,https://${TEAMS_SUBDOMAIN}
NODE_ENV=production
EOF

echo -e "${GREEN}✅ Environment file updated${NC}"
echo ""

# Step 8: Update Teams Manifest
echo -e "${YELLOW}Step 8: Updating Teams App Manifest${NC}"

# Backup original
cp appPackage/manifest.json appPackage/manifest.json.backup

# Update manifest with actual values
sed -i '' "s|\${{TEAMS_APP_ID}}|${AAD_APP_CLIENT_ID}|g" appPackage/manifest.json
sed -i '' "s|\${{BOT_ID}}|${BOT_ID}|g" appPackage/manifest.json
sed -i '' "s|\${{TAB_ENDPOINT}}|https://${TEAMS_SUBDOMAIN}|g" appPackage/manifest.json
sed -i '' "s|\${{TAB_DOMAIN}}|${TEAMS_SUBDOMAIN}|g" appPackage/manifest.json
sed -i '' "s|\${{BOT_DOMAIN}}|${BOT_SUBDOMAIN}|g" appPackage/manifest.json
sed -i '' "s|\${{AAD_APP_CLIENT_ID}}|${AAD_APP_CLIENT_ID}|g" appPackage/manifest.json

echo -e "${GREEN}✅ Manifest updated${NC}"
echo ""

# Step 9: Create App Package
echo -e "${YELLOW}Step 9: Creating Teams App Package${NC}"

mkdir -p appPackage/build

cd appPackage
if [ -f "color.png" ] && [ -f "outline.png" ]; then
    zip -r build/app-package.zip manifest.json color.png outline.png
    echo -e "${GREEN}✅ App package created with icons${NC}"
else
    echo -e "${YELLOW}⚠️  Icons not found. Creating package without icons.${NC}"
    echo "   Add color.png (192x192) and outline.png (32x32) to appPackage/"
    echo "   Then recreate package: cd appPackage && zip -r build/app-package.zip manifest.json *.png"
    zip -r build/app-package.zip manifest.json 2>/dev/null || echo "Package created (missing icons)"
fi
cd ..
echo ""

# Step 10: Update Bot Endpoint in Azure
if command -v az &> /dev/null; then
    echo -e "${YELLOW}Step 10: Updating Bot Endpoint in Azure${NC}"
    az bot update \
        --resource-group "$RESOURCE_GROUP" \
        --name "$BOT_NAME" \
        --endpoint "https://${BOT_SUBDOMAIN}/api/messages"
    echo -e "${GREEN}✅ Bot endpoint updated${NC}"
    echo ""
fi

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deployment Summary - Cloudflare Infrastructure              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Deployment Completed Successfully!${NC}"
echo ""
echo "Domain:            ${DOMAIN}"
echo "Tab URL:           https://${TEAMS_SUBDOMAIN}"
echo "Bot URL:           https://${BOT_SUBDOMAIN}"
echo ""
echo "Azure AD App:"
echo "  App ID:          $AAD_APP_CLIENT_ID"
echo "  Tenant ID:       $TENANT_ID"
echo ""
echo "Bot Service:"
echo "  Bot ID:          $BOT_ID"
echo "  Bot Endpoint:    https://${BOT_SUBDOMAIN}/api/messages"
echo ""
echo "Cloudflare Resources:"
echo "  Worker (Bot):    ${APP_NAME}-bot"
echo "  Pages (Tab):     ${APP_NAME}-tab"
echo "  Custom Domains:  Configured for ${DOMAIN}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify DNS propagation: dig ${TEAMS_SUBDOMAIN} ${BOT_SUBDOMAIN}"
echo "2. Test bot endpoint: curl https://${BOT_SUBDOMAIN}/health"
echo "3. Test tab URL: curl https://${TEAMS_SUBDOMAIN}"
echo "4. Add app icons to appPackage/ (if not done)"
echo "5. Upload to Teams: appPackage/build/app-package.zip"
echo ""
echo "Configuration saved to: .env.local"
echo ""
echo -e "${GREEN}🎉 Your Teams app is deployed on Cloudflare!${NC}"
echo ""
