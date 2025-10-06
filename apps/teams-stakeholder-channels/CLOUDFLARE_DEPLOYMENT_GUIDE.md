# Cloudflare Deployment Guide - Teams App on brainsait.com

**Domain**: brainsait.com  
**Infrastructure**: Cloudflare Workers + Pages  
**Cost**: **FREE** (within Cloudflare free tier limits)

---

## 🎯 Architecture

### Deployment Structure
```
brainsait.com (your existing domain)
├── teams.brainsait.com          → Cloudflare Pages (Tab UI)
├── teams-bot.brainsait.com      → Cloudflare Workers (Bot Service)
└── api.brainsait.com            → Your existing API
```

### Why Cloudflare?
- ✅ **You already have the domain** configured
- ✅ **Zero additional cost** (free tier supports this workload)
- ✅ **Global Edge Network** - Ultra-fast worldwide
- ✅ **Auto-scaling** - Handles any traffic
- ✅ **Zero config needed** - Workers + Pages just work
- ✅ **Serverless** - No server management
- ✅ **Built-in DDoS protection**

---

## 🚀 Quick Deploy (One Command)

```bash
cd apps/teams-stakeholder-channels
./deploy-cloudflare.sh
```

That's it! The script will:
1. Deploy bot as Cloudflare Worker
2. Deploy tab as Cloudflare Pages
3. Configure DNS automatically
4. Create Azure AD app (for Teams SSO)
5. Create Azure Bot Service (required by Teams)
6. Update all configuration files
7. Create Teams app package

**Time**: ~10 minutes  
**Cost**: **$0/month** (Cloudflare free tier)

---

## 📋 What Gets Deployed

### 1. Bot Service (Cloudflare Workers)
**URL**: `https://teams-bot.brainsait.com`

- **Runtime**: Node.js on Cloudflare edge
- **Endpoints**: `/api/messages` (Teams bot endpoint)
- **Storage**: Cloudflare KV for bot state
- **Scaling**: Auto-scales globally
- **Cost**: FREE (up to 100,000 requests/day)

### 2. Tab UI (Cloudflare Pages)
**URL**: `https://teams.brainsait.com`

- **Framework**: React + Fluent UI
- **Hosting**: Static site on Cloudflare CDN
- **Build**: Automatic on git push (optional)
- **SSL**: Automatic HTTPS
- **Cost**: FREE (unlimited bandwidth on brainsait.com)

### 3. Azure Components (Still Required)
- **Azure AD App**: For Teams SSO authentication
- **Azure Bot Service**: Required by Microsoft Teams (FREE tier)
- **Cost**: $0/month (F0 free tier)

---

## 💰 Cost Comparison

| Infrastructure | Azure | Cloudflare |
|----------------|-------|------------|
| Bot Hosting | ~$13/month (App Service) | **$0/month** (Workers) |
| Tab Hosting | ~$0 (Static Web App) | **$0/month** (Pages) |
| CDN | Included | Global edge (better) |
| SSL | Included | Automatic |
| **Total** | **~$13/month** | **$0/month** |

**Cloudflare Advantages**:
- Zero infrastructure cost
- Better global performance
- No cold starts
- Unlimited bandwidth (on custom domain)
- Built-in DDoS protection

---

## 🔧 Prerequisites

### Already Have ✅
- Cloudflare account with brainsait.com
- MongoDB Atlas connection
- Azure account (for AD app - free)

### Need to Install
```bash
# Install Wrangler CLI (if not installed)
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

---

## 📖 Step-by-Step Manual Deployment

If you prefer manual control over the automated script:

### Step 1: Login to Cloudflare
```bash
wrangler login
# Opens browser for authentication
```

### Step 2: Deploy Bot as Worker
```bash
cd apps/teams-stakeholder-channels/bot

# Create wrangler.toml
cat > wrangler.toml << 'EOF'
name = "brainsait-teams-bot"
main = "index.ts"
compatibility_date = "2024-01-01"

routes = [
  { pattern = "teams-bot.brainsait.com/*", custom_domain = true }
]
EOF

# Install dependencies
npm install

# Deploy
wrangler deploy

# Set secrets
wrangler secret put BOT_ID
wrangler secret put BOT_PASSWORD
wrangler secret put MONGODB_URI
```

### Step 3: Deploy Tab to Pages
```bash
cd ../src

# Build
npm install
npm run build

# Deploy to Pages
npx wrangler pages deploy build \
  --project-name=brainsait-teams-tab \
  --branch=main
```

### Step 4: Configure DNS
In Cloudflare dashboard:
1. Go to DNS settings for brainsait.com
2. Add CNAME records:
   ```
   CNAME  teams       →  brainsait-teams-tab.pages.dev
   CNAME  teams-bot   →  brainsait-teams-bot.workers.dev
   ```

Or use CLI:
```bash
wrangler pages domains add teams.brainsait.com \
  --project-name=brainsait-teams-tab
```

### Step 5: Create Azure AD App
```bash
# If Azure CLI is installed
az login

az ad app create \
  --display-name "BrainSAIT Teams App" \
  --sign-in-audience "AzureADMyOrg" \
  --web-redirect-uris "https://teams.brainsait.com/auth/callback"

# Get App ID and create secret
az ad app credential reset --id <app-id>
```

### Step 6: Create Azure Bot Service
```bash
az bot create \
  --resource-group brainsait-teams-rg \
  --name brainsait-teams-bot \
  --kind "azurebot" \
  --sku "F0" \
  --endpoint "https://teams-bot.brainsait.com/api/messages"

# Enable Teams channel
az bot msteams create \
  --resource-group brainsait-teams-rg \
  --name brainsait-teams-bot
```

### Step 7: Update Manifest
```bash
cd ../appPackage

# Update manifest.json with your App ID, Bot ID, domains
# Replace placeholders with actual values

# Create package
zip -r build/app-package.zip manifest.json color.png outline.png
```

---

## 🔐 Configuration

### Environment Variables (Cloudflare Secrets)
```bash
# Bot Worker secrets
wrangler secret put BOT_ID              # Azure AD App ID
wrangler secret put BOT_PASSWORD        # Azure AD Client Secret
wrangler secret put MONGODB_URI         # Your MongoDB connection
wrangler secret put AAD_APP_TENANT_ID   # Azure Tenant ID
```

### Pages Environment Variables
Set in Cloudflare Dashboard:
- `REACT_APP_API_URL`: `https://api.brainsait.com/v1/channels`
- `REACT_APP_BOT_URL`: `https://teams-bot.brainsait.com`

---

## 🧪 Testing

### Test Bot Endpoint
```bash
curl https://teams-bot.brainsait.com/health
# Expected: {"status": "healthy"}
```

### Test Tab URL
```bash
curl -I https://teams.brainsait.com
# Expected: HTTP 200 OK
```

### Test DNS Resolution
```bash
dig teams.brainsait.com
dig teams-bot.brainsait.com
# Should resolve to Cloudflare IPs
```

### Test in Teams
1. Open Microsoft Teams
2. Apps > Manage your apps > Upload custom app
3. Select `appPackage/build/app-package.zip`
4. Install and test:
   - Tab should load
   - Bot should respond to "help"

---

## 📊 Monitoring

### Cloudflare Dashboard
- **Workers Analytics**: `https://dash.cloudflare.com/<account>/workers/analytics`
- **Pages Analytics**: `https://dash.cloudflare.com/<account>/pages`
- **DNS Analytics**: Check traffic and performance

### Logs
```bash
# Stream bot Worker logs
wrangler tail brainsait-teams-bot

# View recent logs
wrangler tail brainsait-teams-bot --format=pretty

# Filter by status
wrangler tail brainsait-teams-bot --status=error
```

---

## 🔄 Updates & Redeployment

### Update Bot
```bash
cd bot
# Make changes to code
wrangler deploy
# Instant deployment, zero downtime
```

### Update Tab
```bash
cd src
npm run build
npx wrangler pages deploy build --project-name=brainsait-teams-tab
# Or connect to GitHub for auto-deployment
```

### Automatic Deployments
Connect to GitHub:
```bash
wrangler pages project create brainsait-teams-tab \
  --production-branch=main \
  --repo=Fadil369/brainsait-rcm
```
Now every git push to main auto-deploys!

---

## 🛡️ Security

### Cloudflare Benefits
- **DDoS Protection**: Automatic, always on
- **WAF**: Web Application Firewall included
- **Bot Management**: Blocks malicious bots
- **SSL/TLS**: Automatic, always enforced
- **Zero Trust**: Can add Cloudflare Access for extra security

### Secrets Management
- All secrets stored encrypted in Cloudflare
- Never exposed in code or logs
- Rotatable without downtime

---

## 🚨 Troubleshooting

### Bot not responding
```bash
# Check Worker logs
wrangler tail brainsait-teams-bot

# Verify secrets are set
wrangler secret list

# Test endpoint
curl https://teams-bot.brainsait.com/api/messages
```

### Tab not loading
```bash
# Check Pages deployment
wrangler pages deployment list --project-name=brainsait-teams-tab

# View build logs
wrangler pages deployment tail --project-name=brainsait-teams-tab
```

### DNS issues
```bash
# Verify DNS records
dig teams.brainsait.com
dig teams-bot.brainsait.com

# Check Cloudflare DNS settings
wrangler pages domains list --project-name=brainsait-teams-tab
```

---

## 💡 Cloudflare Free Tier Limits

You're well within limits for Teams app:

| Resource | Free Tier Limit | Teams App Usage | Status |
|----------|----------------|-----------------|---------|
| Workers Requests | 100,000/day | ~1,000/day | ✅ Safe |
| Pages Builds | 500/month | ~30/month | ✅ Safe |
| Pages Bandwidth | Unlimited* | N/A | ✅ Free |
| KV Reads | 100,000/day | ~5,000/day | ✅ Safe |
| KV Writes | 1,000/day | ~100/day | ✅ Safe |

*Unlimited on custom domains like brainsait.com

---

## 🎯 Next Steps After Deployment

1. **Test Locally First** (Optional):
   ```bash
   cd bot
   wrangler dev  # Test bot locally
   
   cd ../src
   npm start     # Test tab locally
   ```

2. **Deploy to Production**:
   ```bash
   ./deploy-cloudflare.sh
   ```

3. **Configure DNS** (automatic in script or manual in dashboard)

4. **Upload to Teams**:
   - Open Teams > Apps > Manage > Upload custom app
   - Select `appPackage/build/app-package.zip`

5. **Monitor**:
   - Check Cloudflare dashboard
   - Review Worker logs
   - Monitor Pages deployments

---

## 📞 Support

### Resources Created
- Worker: `brainsait-teams-bot`
- Pages Project: `brainsait-teams-tab`
- DNS Records: `teams.brainsait.com`, `teams-bot.brainsait.com`
- Azure AD App: For SSO
- Azure Bot Service: For Teams bot protocol

### Documentation
- **Deployment Script**: `deploy-cloudflare.sh`
- **This Guide**: `CLOUDFLARE_DEPLOYMENT_GUIDE.md`
- **Cloudflare Docs**: https://developers.cloudflare.com
- **Teams Docs**: https://docs.microsoft.com/microsoftteams

---

## 🎉 Summary

**Cloudflare Deployment Benefits**:
- ✅ **$0/month** - Zero infrastructure cost
- ✅ **Global Performance** - Edge network worldwide
- ✅ **Zero Config** - Uses your existing brainsait.com
- ✅ **Auto-scaling** - Handles any load
- ✅ **Instant Deploys** - Sub-second updates
- ✅ **DDoS Protection** - Enterprise-grade security

**Ready to Deploy**:
```bash
cd apps/teams-stakeholder-channels
./deploy-cloudflare.sh
```

That's it! Your Teams app will be live on brainsait.com infrastructure!
