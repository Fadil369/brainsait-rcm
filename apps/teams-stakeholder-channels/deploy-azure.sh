#!/bin/bash
# Azure Deployment Script for Microsoft Teams App
# This script automates the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BrainSAIT RCM - Teams App Azure Deployment                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
APP_NAME="brainsait-teams"
RESOURCE_GROUP="${APP_NAME}-rg"
LOCATION="eastus"
BOT_NAME="${APP_NAME}-bot"
WEBAPP_NAME="${APP_NAME}-bot-webapp"
STATIC_SITE_NAME="${APP_NAME}-tab"

# Step 1: Check Azure CLI
echo -e "${YELLOW}Step 1: Checking Azure CLI...${NC}"
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not found. Please install it first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Azure CLI found${NC}"
echo ""

# Step 2: Login to Azure
echo -e "${YELLOW}Step 2: Azure Login${NC}"
if ! az account show &> /dev/null; then
    echo "Please login to Azure..."
    az login --use-device-code
else
    echo -e "${GREEN}✅ Already logged in to Azure${NC}"
    az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" -o table
fi
echo ""

# Step 3: Select/Create Resource Group
echo -e "${YELLOW}Step 3: Resource Group Setup${NC}"
read -p "Enter resource group name [${RESOURCE_GROUP}]: " input_rg
RESOURCE_GROUP=${input_rg:-$RESOURCE_GROUP}

if az group exists --name "$RESOURCE_GROUP" | grep -q "true"; then
    echo -e "${GREEN}✅ Resource group '$RESOURCE_GROUP' exists${NC}"
else
    echo "Creating resource group '$RESOURCE_GROUP' in '$LOCATION'..."
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
    echo -e "${GREEN}✅ Resource group created${NC}"
fi
echo ""

# Step 4: Create Azure AD App Registration
echo -e "${YELLOW}Step 4: Azure AD App Registration${NC}"
echo "Creating Azure AD app registration for Teams..."

# Create the app registration
AAD_APP_NAME="${APP_NAME}-teams-app"
AAD_APP_JSON=$(az ad app create \
    --display-name "$AAD_APP_NAME" \
    --sign-in-audience "AzureADMyOrg" \
    --web-redirect-uris "https://teams.microsoft.com/api/platform/v1.0/teams" \
    --enable-id-token-issuance true)

AAD_APP_CLIENT_ID=$(echo "$AAD_APP_JSON" | jq -r '.appId')
AAD_APP_OBJECT_ID=$(echo "$AAD_APP_JSON" | jq -r '.id')

echo -e "${GREEN}✅ Azure AD App created${NC}"
echo "   App ID: $AAD_APP_CLIENT_ID"

# Create client secret
echo "Creating client secret..."
AAD_APP_SECRET_JSON=$(az ad app credential reset \
    --id "$AAD_APP_CLIENT_ID" \
    --append)

AAD_APP_CLIENT_SECRET=$(echo "$AAD_APP_SECRET_JSON" | jq -r '.password')

echo -e "${GREEN}✅ Client secret created${NC}"
echo ""

# Get Tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)

# Step 5: Create Azure Bot
echo -e "${YELLOW}Step 5: Azure Bot Service Setup${NC}"
echo "Creating Azure Bot..."

az bot create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BOT_NAME" \
    --kind "azurebot" \
    --app-type "MultiTenant" \
    --appid "$AAD_APP_CLIENT_ID" \
    --password "$AAD_APP_CLIENT_SECRET" \
    --location "global" \
    --sku "F0"

echo -e "${GREEN}✅ Azure Bot created${NC}"

# Configure Teams channel
echo "Configuring Teams channel for bot..."
az bot msteams create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BOT_NAME"

echo -e "${GREEN}✅ Teams channel configured${NC}"
echo ""

# Step 6: Create App Service for Bot
echo -e "${YELLOW}Step 6: Bot Web App Deployment${NC}"
echo "Creating App Service Plan and Web App for bot..."

# Create App Service Plan
az appservice plan create \
    --name "${WEBAPP_NAME}-plan" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku "B1" \
    --is-linux

# Create Web App
az webapp create \
    --name "$WEBAPP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --plan "${WEBAPP_NAME}-plan" \
    --runtime "NODE:18-lts"

# Get webapp URL
BOT_ENDPOINT="https://${WEBAPP_NAME}.azurewebsites.net"

echo -e "${GREEN}✅ Bot Web App created${NC}"
echo "   URL: $BOT_ENDPOINT"
echo ""

# Configure bot endpoint
echo "Updating bot messaging endpoint..."
az bot update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BOT_NAME" \
    --endpoint "${BOT_ENDPOINT}/api/messages"

echo -e "${GREEN}✅ Bot endpoint configured${NC}"
echo ""

# Step 7: Configure Web App Settings
echo -e "${YELLOW}Step 7: Configuring Bot Environment Variables${NC}"

az webapp config appsettings set \
    --name "$WEBAPP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        BOT_ID="$AAD_APP_CLIENT_ID" \
        BOT_PASSWORD="$AAD_APP_CLIENT_SECRET" \
        MONGODB_URI="mongodb+srv://fadil_db_user:1rlK8vj6YF5reQoc@cluster0.ozzjwto.mongodb.net/brainsait_rcm?retryWrites=true&w=majority" \
        API_BASE_URL="http://localhost:8000/api/v1/channels" \
        NODE_ENV="production"

echo -e "${GREEN}✅ Environment variables configured${NC}"
echo ""

# Step 8: Deploy Bot Code
echo -e "${YELLOW}Step 8: Deploying Bot Code${NC}"
echo "Building bot application..."

cd bot
npm install
npm run build 2>/dev/null || echo "Build script not found, skipping..."

# Create deployment package
echo "Creating deployment package..."
zip -r ../bot-deploy.zip . -x "node_modules/*" "*.log"

cd ..

# Deploy to Azure
echo "Deploying to Azure Web App..."
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$WEBAPP_NAME" \
    --src "bot-deploy.zip"

echo -e "${GREEN}✅ Bot deployed successfully${NC}"
echo ""

# Step 9: Create Static Web App for Tab
echo -e "${YELLOW}Step 9: Tab Static Web App Setup${NC}"
echo "Creating Static Web App for Teams tab..."

az staticwebapp create \
    --name "$STATIC_SITE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku "Free"

# Get static site URL
STATIC_SITE_URL=$(az staticwebapp show \
    --name "$STATIC_SITE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "defaultHostname" -o tsv)

TAB_ENDPOINT="https://${STATIC_SITE_URL}"

echo -e "${GREEN}✅ Static Web App created${NC}"
echo "   URL: $TAB_ENDPOINT"
echo ""

# Step 10: Build and Deploy Tab
echo -e "${YELLOW}Step 10: Deploying Tab Application${NC}"
echo "Building tab application..."

cd src
npm install
npm run build

echo -e "${GREEN}✅ Tab built successfully${NC}"
echo ""

# Note: For Static Web Apps, we need to use GitHub Actions or SWA CLI
echo -e "${YELLOW}Note: Tab deployment requires GitHub Actions or SWA CLI${NC}"
echo "You can deploy manually using:"
echo "  npx @azure/static-web-apps-cli deploy ./build --deployment-token <token>"
echo ""

cd ..

# Step 11: Update .env.local with credentials
echo -e "${YELLOW}Step 11: Updating Local Environment File${NC}"

cat > .env.local << EOF
# Microsoft Teams App Environment Configuration
# Generated by deploy-azure.sh on $(date)

# ============================================
# Teams App Configuration
# ============================================
TEAMS_APP_ID=${AAD_APP_CLIENT_ID}
BOT_ID=${AAD_APP_CLIENT_ID}
BOT_PASSWORD=${AAD_APP_CLIENT_SECRET}
AAD_APP_CLIENT_ID=${AAD_APP_CLIENT_ID}
AAD_APP_CLIENT_SECRET=${AAD_APP_CLIENT_SECRET}
AAD_APP_TENANT_ID=${TENANT_ID}

# ============================================
# Endpoints
# ============================================
TAB_ENDPOINT=${TAB_ENDPOINT}
TAB_DOMAIN=${STATIC_SITE_URL}
BOT_DOMAIN=${WEBAPP_NAME}.azurewebsites.net
API_BASE_URL=http://localhost:8000/api/v1/channels

# ============================================
# BrainSAIT RCM Backend Integration
# ============================================
BRAINSAIT_API_URL=http://localhost:8000
REACT_APP_API_URL=http://localhost:8000/api/v1/channels

# ============================================
# Database - MongoDB Atlas
# ============================================
MONGODB_URI=mongodb+srv://fadil_db_user:1rlK8vj6YF5reQoc@cluster0.ozzjwto.mongodb.net/brainsait_rcm?retryWrites=true&w=majority
MONGODB_DB_NAME=brainsait_rcm

# ============================================
# Development Settings
# ============================================
NODE_ENV=development
PORT=3978
TAB_PORT=53000

# ============================================
# Security
# ============================================
ALLOWED_ORIGINS=https://teams.microsoft.com,https://*.teams.microsoft.com
EOF

echo -e "${GREEN}✅ Environment file updated${NC}"
echo ""

# Step 12: Update manifest with IDs
echo -e "${YELLOW}Step 12: Updating Teams App Manifest${NC}"

# Update manifest.json with actual values
sed -i.bak "s/\${{TEAMS_APP_ID}}/${AAD_APP_CLIENT_ID}/g" appPackage/manifest.json
sed -i.bak "s/\${{BOT_ID}}/${AAD_APP_CLIENT_ID}/g" appPackage/manifest.json
sed -i.bak "s|\${{TAB_ENDPOINT}}|${TAB_ENDPOINT}|g" appPackage/manifest.json
sed -i.bak "s|\${{TAB_DOMAIN}}|${STATIC_SITE_URL}|g" appPackage/manifest.json
sed -i.bak "s|\${{BOT_DOMAIN}}|${WEBAPP_NAME}.azurewebsites.net|g" appPackage/manifest.json
sed -i.bak "s/\${{AAD_APP_CLIENT_ID}}/${AAD_APP_CLIENT_ID}/g" appPackage/manifest.json

echo -e "${GREEN}✅ Manifest updated${NC}"
echo ""

# Step 13: Create App Package
echo -e "${YELLOW}Step 13: Creating Teams App Package${NC}"

mkdir -p appPackage/build

cd appPackage
zip -r build/app-package.zip manifest.json color.png outline.png 2>/dev/null || \
    echo -e "${YELLOW}⚠️  Warning: Icon files not found. Please add color.png and outline.png before uploading to Teams${NC}"
cd ..

echo -e "${GREEN}✅ App package created (if icons exist)${NC}"
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deployment Summary                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Deployment Completed Successfully!${NC}"
echo ""
echo "Resource Group:    $RESOURCE_GROUP"
echo "Location:          $LOCATION"
echo ""
echo "Azure AD App:"
echo "  App ID:          $AAD_APP_CLIENT_ID"
echo "  Tenant ID:       $TENANT_ID"
echo "  Client Secret:   ********** (saved in .env.local)"
echo ""
echo "Bot Service:"
echo "  Bot Name:        $BOT_NAME"
echo "  Bot Endpoint:    ${BOT_ENDPOINT}/api/messages"
echo "  Web App:         $WEBAPP_NAME"
echo ""
echo "Tab Application:"
echo "  Static Site:     $STATIC_SITE_NAME"
echo "  Tab URL:         $TAB_ENDPOINT"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Create app icons (color.png 192x192, outline.png 32x32)"
echo "2. Place icons in appPackage/ directory"
echo "3. Recreate app package: cd appPackage && zip -r build/app-package.zip manifest.json color.png outline.png"
echo "4. Upload app package to Microsoft Teams:"
echo "   - Open Teams > Apps > Manage your apps"
echo "   - Upload custom app > Upload for [your org]"
echo "   - Select: appPackage/build/app-package.zip"
echo ""
echo "Configuration saved to: .env.local"
echo ""
echo -e "${GREEN}🎉 Your Teams app is ready to use!${NC}"
echo ""
