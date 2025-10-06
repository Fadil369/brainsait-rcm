# Azure Portal Setup for Teams App (5 Minutes)

Since Azure CLI requires MFA, use the Azure Portal instead. It's actually faster!

---

## 🔍 Step 1: Check for Existing Apps (2 minutes)

### Check Azure AD Apps
1. Go to https://portal.azure.com
2. Sign in (MFA will work here)
3. Search for **"Azure Active Directory"** or **"Microsoft Entra ID"**
4. Click **"App registrations"** in the left menu
5. Look for apps with names like:
   - "BrainSAIT"
   - "Teams"
   - "Bot"
   - Any healthcare or RCM related apps

**If you find an existing app**, note down:
- ✅ Application (client) ID
- ✅ Directory (tenant) ID
- ✅ Go to "Certificates & secrets" > Create new client secret

**If no app exists**, continue to Step 2.

---

## 🆕 Step 2: Create New Azure AD App (3 minutes)

### Create App Registration
1. In **Azure Active Directory** > **App registrations**
2. Click **"+ New registration"**
3. Fill in:
   ```
   Name: BrainSAIT Teams App
   Supported account types: Accounts in this organizational directory only
   Redirect URI: 
     - Platform: Web
     - URL: https://teams.brainsait.com/auth/callback
   ```
4. Click **"Register"**

### Note Your IDs
After creation, you'll see:
```
Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Directory (tenant) ID:   yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```
**Save these!**

### Create Client Secret
1. In your new app, go to **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Description: `BrainSAIT Teams Bot Secret`
4. Expires: `24 months` (recommended)
5. Click **"Add"**
6. **COPY THE VALUE IMMEDIATELY** (you can't see it again!)
   ```
   Client Secret Value: zzz~xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## 🤖 Step 3: Create Bot Service (Optional - 2 minutes)

### Create Azure Bot
1. In Azure Portal, search for **"Azure Bot"**
2. Click **"+ Create"**
3. Fill in:
   ```
   Bot handle: brainsait-teams-bot
   Subscription: Your subscription
   Resource group: Create new > brainsait-teams-rg
   Location: Global
   Pricing tier: F0 (Free)
   Microsoft App ID: Use the App ID from Step 2
   Microsoft App Password: Use the secret from Step 2
   ```
4. Review and create

### Enable Teams Channel
1. Once bot is created, go to the bot resource
2. Click **"Channels"** in the left menu
3. Click **"Microsoft Teams"** icon
4. Click **"Apply"**
5. Done!

---

## 📝 Step 4: Update Configuration

Once you have your credentials, update the Teams app:

### Copy Your Credentials
```bash
# You should now have:
AAD_APP_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AAD_APP_CLIENT_SECRET="zzz~xxxxxxxxxxxxxxxxxxxxxxxxxx"
AAD_APP_TENANT_ID="yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
BOT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Same as client ID
BOT_PASSWORD="zzz~xxxxxxxxxxxxxxxxxxxxxxxxxx"  # Same as client secret
```

### Update .env.local
```bash
cd /Users/fadil369/container/brainsait-rcm-unified/apps/teams-stakeholder-channels

# Create or update .env.local
cat > .env.local << 'EOF'
# Microsoft Teams App Configuration
TEAMS_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BOT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BOT_PASSWORD=zzz~xxxxxxxxxxxxxxxxxxxxxxxxxx
AAD_APP_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AAD_APP_CLIENT_SECRET=zzz~xxxxxxxxxxxxxxxxxxxxxxxxxx
AAD_APP_TENANT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy

# Cloudflare Endpoints
TAB_ENDPOINT=https://teams.brainsait.com
BOT_ENDPOINT=https://teams-bot.brainsait.com

# MongoDB Atlas
MONGODB_URI=mongodb+srv://fadil_db_user:1rlK8vj6YF5reQoc@cluster0.ozzjwto.mongodb.net/brainsait_rcm
EOF
```

---

## 🚀 Step 5: Deploy to Cloudflare

Now that you have the credentials, deploy:

```bash
cd /Users/fadil369/container/brainsait-rcm-unified/apps/teams-stakeholder-channels

# Set Cloudflare secrets
cd bot
wrangler secret put BOT_ID
# Paste your Bot ID when prompted

wrangler secret put BOT_PASSWORD  
# Paste your Bot Password when prompted

wrangler secret put MONGODB_URI
# Paste your MongoDB URI when prompted

# Deploy bot to Cloudflare Workers
wrangler deploy

# Deploy tab to Cloudflare Pages
cd ../src
npm install
npm run build
npx wrangler pages deploy build --project-name=brainsait-teams-tab
```

---

## ✅ Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│ Azure Portal URLs                                       │
├─────────────────────────────────────────────────────────┤
│ Main Portal:    https://portal.azure.com               │
│ Azure AD:       https://portal.azure.com/#blade/       │
│                 Microsoft_AAD_IAM/ActiveDirectoryMenuB  │
│ App Regs:       https://portal.azure.com/#blade/       │
│                 Microsoft_AAD_RegisteredApps/Applicat   │
│ Bot Services:   Search "Azure Bot" in portal           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ What You Need to Copy                                   │
├─────────────────────────────────────────────────────────┤
│ ✅ Application (client) ID                              │
│ ✅ Directory (tenant) ID                                │
│ ✅ Client secret VALUE (copy immediately!)             │
└─────────────────────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### Can't see App Registrations?
- Make sure you're in the right directory/tenant
- Switch directory: Click your profile (top right) > Switch directory

### Can't create Bot Service?
- Bot Service is optional for basic testing
- You can deploy to Cloudflare without it
- Add it later when needed

### Lost the Client Secret?
- No problem! Just create a new one
- Go to app > Certificates & secrets > New client secret
- Old secret will still work until it expires

---

## ⏱️ Total Time: 5-7 minutes

- Check existing apps: 2 min
- Create new app: 2 min
- Create secret: 1 min
- Create bot (optional): 2 min

Then deploy to Cloudflare: 5 min

**Total**: ~10-15 minutes for complete setup!

---

## 💡 Pro Tips

1. **Save Credentials Immediately**: Store in a password manager
2. **Set Secret Expiration**: 24 months recommended
3. **Use Descriptive Names**: Makes finding them easier later
4. **Test in Portal First**: Easier than CLI with MFA
5. **Bot Service is Optional**: For basic testing, you can skip it

---

Ready to proceed? Check the portal and let me know what you find!
