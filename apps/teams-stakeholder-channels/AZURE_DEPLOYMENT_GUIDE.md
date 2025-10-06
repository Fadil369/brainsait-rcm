# Azure Deployment Guide - Microsoft Teams App

**Last Updated**: October 6, 2025  
**Automated Deployment**: ✅ Available

---

## 🚀 Quick Deploy (Automated)

We've created an automated deployment script that handles everything for you!

### Prerequisites
- ✅ Azure CLI installed (detected: `/opt/homebrew/bin/az`)
- ✅ Node.js 18+ installed
- ✅ Azure subscription (you'll be prompted to login)
- ⏳ App icons (color.png, outline.png) - can be added later

### One-Command Deployment

```bash
cd apps/teams-stakeholder-channels
./deploy-azure.sh
```

That's it! The script will:
1. ✅ Login to Azure (interactive)
2. ✅ Create Azure AD app registration
3. ✅ Generate client secret
4. ✅ Create Azure Bot Service
5. ✅ Deploy bot to Azure Web App
6. ✅ Create Static Web App for tab
7. ✅ Update environment variables
8. ✅ Update Teams manifest
9. ✅ Create app package
10. ✅ Save all credentials to `.env.local`

**Estimated Time**: 10-15 minutes

---

## 📋 What the Script Does

### Step 1: Azure Login
```bash
az login --use-device-code
```
- Opens browser for authentication
- Selects your Azure subscription
- Verifies tenant information

### Step 2: Resource Group
Creates or uses existing resource group:
- Default name: `brainsait-teams-rg`
- Default location: `eastus`
- All resources organized in one place

### Step 3: Azure AD App Registration
```bash
az ad app create --display-name "brainsait-teams-app"
```
Creates:
- App registration for Teams SSO
- Client ID (App ID)
- Client Secret (auto-generated)
- Redirect URIs for Teams

**Generated Values:**
- `AAD_APP_CLIENT_ID` - Used for authentication
- `AAD_APP_CLIENT_SECRET` - Secure secret
- `AAD_APP_TENANT_ID` - Your tenant ID

### Step 4: Azure Bot Service
```bash
az bot create --kind "azurebot" --sku "F0"
```
Creates:
- Bot Service (Free tier - F0)
- Teams channel configuration
- Messaging endpoint setup

**Bot Name**: `brainsait-teams-bot`

### Step 5: Bot Web App
```bash
az webapp create --runtime "NODE:18-lts"
```
Creates:
- App Service Plan (B1 - Basic tier)
- Web App for bot runtime
- Configured with Node.js 18

**Configuration:**
- Environment variables (MongoDB, Bot credentials)
- Auto-deployment from ZIP file
- Health monitoring enabled

**Bot Endpoint**: `https://brainsait-teams-bot-webapp.azurewebsites.net`

### Step 6: Static Web App for Tab
```bash
az staticwebapp create --sku "Free"
```
Creates:
- Static Web App for React tab UI
- Free tier hosting
- Global CDN distribution

**Tab URL**: `https://brainsait-teams-tab.azurewebsites.net`

### Step 7: Environment Configuration
Automatically updates `.env.local` with:
- All generated IDs and secrets
- Azure endpoints
- MongoDB connection string
- API URLs

### Step 8: Manifest Update
Updates `appPackage/manifest.json` with:
- Real App ID (replaces `${{TEAMS_APP_ID}}`)
- Real Bot ID (replaces `${{BOT_ID}}`)
- Real endpoints (replaces placeholders)

### Step 9: App Package Creation
Creates `appPackage/build/app-package.zip`:
- manifest.json (configured)
- color.png (if exists)
- outline.png (if exists)

---

## 🎨 Creating App Icons

Before uploading to Teams, create the required icons:

### Color Icon (color.png)
- **Size**: 192x192 pixels
- **Format**: PNG with transparency
- **Max File Size**: 50KB
- **Design**: Full color, BrainSAIT branding

**Quick Create (using online tools):**
1. Go to [Canva](https://www.canva.com) or [Figma](https://www.figma.com)
2. Create 192x192 artboard
3. Add medical cross + chat bubble icon
4. Use brand colors: #2b6cb8 (blue) and #5b21b6 (violet)
5. Export as PNG with transparency

### Outline Icon (outline.png)
- **Size**: 32x32 pixels
- **Format**: PNG with transparency
- **Max File Size**: 5KB
- **Design**: Monochrome outline only

**Quick Create:**
1. Simplify the color icon design
2. Convert to single-color outline
3. Resize to 32x32
4. Export as PNG

**Place both files in:**
```
apps/teams-stakeholder-channels/appPackage/
├── color.png      ← 192x192
└── outline.png    ← 32x32
```

Then recreate the app package:
```bash
cd appPackage
zip -r build/app-package.zip manifest.json color.png outline.png
```

---

## 📦 Manual Deployment (Alternative)

If you prefer manual control:

### 1. Login to Azure
```bash
az login
```

### 2. Set Variables
```bash
export RESOURCE_GROUP="brainsait-teams-rg"
export LOCATION="eastus"
export APP_NAME="brainsait-teams"
```

### 3. Create Resource Group
```bash
az group create --name $RESOURCE_GROUP --location $LOCATION
```

### 4. Create Azure AD App
```bash
# Create app
AAD_APP_JSON=$(az ad app create \
    --display-name "${APP_NAME}-app" \
    --sign-in-audience "AzureADMyOrg" \
    --web-redirect-uris "https://teams.microsoft.com/api/platform/v1.0/teams")

# Get App ID
AAD_APP_CLIENT_ID=$(echo $AAD_APP_JSON | jq -r '.appId')

# Create secret
AAD_SECRET_JSON=$(az ad app credential reset --id $AAD_APP_CLIENT_ID)
AAD_APP_CLIENT_SECRET=$(echo $AAD_SECRET_JSON | jq -r '.password')

echo "App ID: $AAD_APP_CLIENT_ID"
echo "Secret: $AAD_APP_CLIENT_SECRET"
```

### 5. Create Bot
```bash
az bot create \
    --resource-group $RESOURCE_GROUP \
    --name "${APP_NAME}-bot" \
    --kind "azurebot" \
    --appid $AAD_APP_CLIENT_ID \
    --password $AAD_APP_CLIENT_SECRET \
    --sku "F0"

# Enable Teams channel
az bot msteams create \
    --resource-group $RESOURCE_GROUP \
    --name "${APP_NAME}-bot"
```

### 6. Deploy Bot Web App
```bash
# Create App Service Plan
az appservice plan create \
    --name "${APP_NAME}-plan" \
    --resource-group $RESOURCE_GROUP \
    --sku "B1" \
    --is-linux

# Create Web App
az webapp create \
    --name "${APP_NAME}-bot-webapp" \
    --resource-group $RESOURCE_GROUP \
    --plan "${APP_NAME}-plan" \
    --runtime "NODE:18-lts"

# Configure environment
az webapp config appsettings set \
    --name "${APP_NAME}-bot-webapp" \
    --resource-group $RESOURCE_GROUP \
    --settings \
        BOT_ID=$AAD_APP_CLIENT_ID \
        BOT_PASSWORD=$AAD_APP_CLIENT_SECRET \
        MONGODB_URI="mongodb+srv://fadil_db_user:1rlK8vj6YF5reQoc@cluster0.ozzjwto.mongodb.net/brainsait_rcm"

# Deploy code
cd bot
zip -r ../bot-deploy.zip .
cd ..
az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name "${APP_NAME}-bot-webapp" \
    --src bot-deploy.zip
```

### 7. Create Static Web App for Tab
```bash
az staticwebapp create \
    --name "${APP_NAME}-tab" \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku "Free"

# Get URL
STATIC_SITE_URL=$(az staticwebapp show \
    --name "${APP_NAME}-tab" \
    --resource-group $RESOURCE_GROUP \
    --query "defaultHostname" -o tsv)

echo "Tab URL: https://$STATIC_SITE_URL"
```

---

## 🔍 Verification & Testing

### 1. Check Bot Deployment
```bash
# Get bot details
az bot show --resource-group brainsait-teams-rg --name brainsait-teams-bot

# Test bot endpoint
curl https://brainsait-teams-bot-webapp.azurewebsites.net/health
```

### 2. Check Web App Logs
```bash
# Stream logs
az webapp log tail \
    --name brainsait-teams-bot-webapp \
    --resource-group brainsait-teams-rg
```

### 3. Check Static Web App
```bash
# Get deployment status
az staticwebapp show \
    --name brainsait-teams-tab \
    --resource-group brainsait-teams-rg \
    --query "defaultHostname"
```

### 4. Test in Teams
1. Open Microsoft Teams
2. Go to **Apps** > **Manage your apps**
3. Click **Upload custom app** > **Upload for [your organization]**
4. Select `appPackage/build/app-package.zip`
5. Click **Add** to install
6. Test bot commands: `help`, `list channels`
7. Open tab and verify UI loads

---

## 🛠️ Troubleshooting

### Issue 1: "az login" fails
**Solution:**
```bash
az login --use-device-code
# Follow the browser prompts
```

### Issue 2: Resource already exists
**Solution:**
```bash
# Use existing resources or delete and recreate
az group delete --name brainsait-teams-rg --yes
./deploy-azure.sh
```

### Issue 3: Bot doesn't respond
**Check:**
1. Bot endpoint is correct: `az bot show`
2. Environment variables are set: `az webapp config appsettings list`
3. Web app is running: `az webapp show --query "state"`

**Fix:**
```bash
# Restart web app
az webapp restart \
    --name brainsait-teams-bot-webapp \
    --resource-group brainsait-teams-rg
```

### Issue 4: Tab doesn't load
**Check:**
1. Static Web App is deployed
2. Manifest URLs are correct
3. CORS is configured

**Fix:**
```bash
# Redeploy static site
cd src
npm run build
# Deploy using SWA CLI or GitHub Actions
```

### Issue 5: Authentication fails
**Check:**
1. Azure AD app has correct redirect URIs
2. Client secret is valid (not expired)
3. Tenant ID matches

**Fix:**
```bash
# Generate new secret
az ad app credential reset --id $AAD_APP_CLIENT_ID
# Update .env.local with new secret
```

---

## 💰 Cost Estimation

### Azure Resources Created

| Resource | Tier | Monthly Cost (USD) |
|----------|------|-------------------|
| Azure Bot Service | F0 (Free) | $0 |
| App Service Plan | B1 (Basic) | ~$13 |
| Web App | Included | $0 |
| Static Web App | Free | $0 |
| Azure AD | Free | $0 |
| **Total** | | **~$13/month** |

### Cost Optimization Tips
1. Use F1 (Free) tier for App Service during development
2. Stop Web App when not in use: `az webapp stop`
3. Use consumption pricing for production workloads
4. Enable auto-scaling only when needed

---

## 🔐 Security Best Practices

### Secrets Management
- ✅ Never commit `.env.local` to git (already in .gitignore)
- ✅ Use Azure Key Vault for production secrets
- ✅ Rotate client secrets regularly (every 90 days)
- ✅ Use Managed Identities when possible

### Network Security
- ✅ Configure CORS to allow only Teams domains
- ✅ Enable HTTPS only (enforced by default)
- ✅ Use Private Endpoints for production
- ✅ Enable Azure Firewall for sensitive data

### Monitoring
```bash
# Enable Application Insights
az monitor app-insights component create \
    --app brainsait-teams-insights \
    --location eastus \
    --resource-group brainsait-teams-rg

# Connect to Web App
az webapp config appsettings set \
    --name brainsait-teams-bot-webapp \
    --resource-group brainsait-teams-rg \
    --settings APPINSIGHTS_INSTRUMENTATIONKEY=<key>
```

---

## 📞 Support & Resources

### Generated Files
- `.env.local` - All credentials and endpoints
- `appPackage/manifest.json` - Updated with real IDs
- `appPackage/build/app-package.zip` - Ready to upload

### Documentation
- **Deployment Script**: `deploy-azure.sh`
- **This Guide**: `AZURE_DEPLOYMENT_GUIDE.md`
- **Status Report**: `TEAMS_APP_STATUS.md`
- **Quick Start**: `QUICKSTART.md`

### External Resources
- [Azure CLI Docs](https://docs.microsoft.com/cli/azure/)
- [Teams App Deployment](https://docs.microsoft.com/microsoftteams/platform/concepts/deploy-and-publish/apps-upload)
- [Azure Bot Service](https://docs.microsoft.com/azure/bot-service/)
- [Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)

---

## 🎉 Summary

You now have an automated deployment script that:
- ✅ Creates all necessary Azure resources
- ✅ Configures authentication and bot service
- ✅ Deploys your code to Azure
- ✅ Generates Teams app package
- ✅ Saves all credentials securely

**To deploy right now:**
```bash
cd apps/teams-stakeholder-channels
./deploy-azure.sh
```

The script will guide you through each step and show you the final credentials and URLs!

---

**Ready to Deploy**: ✅ YES  
**Estimated Time**: 10-15 minutes  
**Cost**: ~$13/month  
**Automation Level**: Fully Automated 🚀
