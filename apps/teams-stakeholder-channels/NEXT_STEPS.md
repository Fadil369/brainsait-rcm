# 🎯 Teams App Setup - Next Steps

## ✅ What's Been Completed

All the foundational code has been successfully created:

### Root Level (`apps/teams-stakeholder-channels/`)
- ✅ `package.json` - Root dependencies and scripts
- ✅ `m365agents.yml` - Microsoft 365 Agents Toolkit configuration
- ✅ `README.md` - Comprehensive documentation
- ✅ `QUICKSTART.md` - Step-by-step setup guide
- ✅ `start.sh` - Convenience script to start all services

### Tab App (`src/`)
- ✅ `package.json` - Webpack, React, Fluent UI dependencies
- ✅ `index.html` - HTML entry point
- ✅ `index.tsx` - React application bootstrap
- ✅ `webpack.config.js` - Build configuration with HTTPS support
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `components/StakeholderChannelsTab.tsx` - Complete React component (500+ lines)

### Bot (`bot/`)
- ✅ `package.json` - Bot Framework dependencies
- ✅ `index.ts` - Bot server with restify
- ✅ `stakeholderChannelsBot.ts` - Bot logic with Adaptive Cards
- ✅ `tsconfig.json` - TypeScript configuration

### Configuration (`env/`, `appPackage/`)
- ✅ `.env.local` - Environment variables
- ✅ `manifest.json` - Teams app manifest
- ✅ All Azure AD and bot configuration templates

### Dependencies Installed
- ✅ Root dependencies (1592 packages)
- ✅ Bot dependencies (all installed)
- ⏳ Tab dependencies (installation was interrupted - needs completion)

---

## 🚀 Continue from Here

### Step 1: Complete Tab Dependencies Installation

The src dependencies installation was interrupted. Complete it:

```bash
# Make sure you're in the src directory
cd apps/teams-stakeholder-channels/src

# Install dependencies
npm install

# This will install:
# - webpack & webpack-dev-server
# - ts-loader for TypeScript
# - html-webpack-plugin
# - style-loader & css-loader
# Takes ~2-3 minutes
```

**Wait for it to complete**, you'll see:
```
added XXX packages, and audited XXX packages
found 0 vulnerabilities
```

### Step 2: Verify All Files Are Created

```bash
# Go back to teams-stakeholder-channels root
cd ..

# Check all directories
ls -la src/
# Should see: index.html, index.tsx, webpack.config.js, tsconfig.json, package.json

ls -la bot/
# Should see: index.ts, stakeholderChannelsBot.ts, package.json, tsconfig.json

ls -la env/
# Should see: .env.local

ls -la appPackage/
# Should see: manifest.json
```

### Step 3: Start the Backend API

Your Teams app needs the BrainSAIT RCM backend running:

```bash
# Open a new terminal
# Navigate to the API directory from project root
cd ~/path/to/brainsait-rcm/apps/api

# Start FastAPI
uvicorn main:app --reload --port 8000
```

**Keep this terminal running!**

Verify it's working:
```bash
# In another terminal
curl http://localhost:8000/api/v1/health
# Should return: {"status":"healthy"}
```

### Step 4: Test the Tab App Locally

```bash
# Terminal 1: Tab App
cd apps/teams-stakeholder-channels/src
npm start

# Should start webpack dev server on https://localhost:53000
# You'll see output like:
# <i> [webpack-dev-server] Project is running at:
# <i> [webpack-dev-server] Loopback: https://localhost:53000/
```

**Open browser**: https://localhost:53000
- Accept the self-signed certificate warning
- You should see the Stakeholder Channels Tab UI

### Step 5: Test the Bot Locally

```bash
# Terminal 2: Bot
cd apps/teams-stakeholder-channels/bot
npm run dev

# Should start on http://localhost:3978
# You'll see: "Bot listening on http://localhost:3978"
```

**Test bot health**:
```bash
curl http://localhost:3978/health
# Should return: {"status":"healthy"}
```

### Step 6: Provision Teams App (First Time Only)

Now use VS Code with Microsoft 365 Agents Toolkit:

1. **Open VS Code** in `apps/teams-stakeholder-channels` directory
2. **Install Extension**: "Microsoft 365 Agents Toolkit" (if not installed)
3. **Open Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
4. **Select**: `Teams: Provision`
5. **Sign in**:
   - Microsoft 365 account
   - Azure subscription
6. **Wait** for provisioning (~2-3 minutes)

This creates:
- Azure AD app registration
- Bot registration
- Teams app
- Updates `.env.local` with real IDs

### Step 7: Run in Microsoft Teams

After provisioning completes:

**Option A: From VS Code**
1. Press `F5`
2. Teams opens in browser
3. Click "Add" to install app

**Option B: Manual**
1. Command Palette → `Teams: Preview in Teams`
2. Select your tenant
3. App opens in Teams

### Step 8: Test Everything

In Microsoft Teams:

1. **Open the Tab**:
   - Should see Fluent UI interface
   - Try creating a team
   - Navigate channels
   - Send messages

2. **Test the Bot**:
   - Type: `help`
   - Try: `list channels`
   - Try: `create channel`
   - Try: `team info`

3. **Verify Backend Integration**:
   - Check API logs: Data should be flowing
   - Messages should save to MongoDB
   - Teams should create/update in database

---

## 🐛 Troubleshooting

### Issue: Tab dependencies won't install

```bash
# Clear npm cache
npm cache clean --force

# Try again
cd src && npm install
```

### Issue: "Cannot find module './components/StakeholderChannelsTab'"

The component file should be at:
```
src/components/StakeholderChannelsTab.tsx
```

If missing, you need to copy it from the GitHub VFS or I can help recreate it.

### Issue: Backend API not accessible

```bash
# Check API is running
curl http://localhost:8000/api/v1/health

# If not, start it:
cd apps/api
uvicorn main:app --reload --port 8000
```

### Issue: Certificate errors in browser

For https://localhost:53000:
1. Click "Advanced" in browser
2. Click "Proceed to localhost (unsafe)"
3. This is expected for local development

### Issue: Bot not responding in Teams

1. Check bot is running: `curl http://localhost:3978/health`
2. Check BOT_ID and BOT_PASSWORD in `.env.local`
3. Check bot logs for errors
4. Re-provision if needed: `Teams: Provision`

### Issue: Teams app won't install

```bash
# Validate manifest
cd appPackage
# Check manifest.json is valid JSON

# Re-package and re-provision
# Command Palette → Teams: Provision
```

---

## 📊 Service Checklist

Before testing in Teams, verify all services are running:

- [ ] **Backend API**: http://localhost:8000 ✅
- [ ] **Tab App**: https://localhost:53000 ✅
- [ ] **Bot**: http://localhost:3978 ✅
- [ ] **MongoDB**: localhost:27017 (or your connection string) ✅
- [ ] **Teams App**: Provisioned in Microsoft 365 ✅

---

## 🎯 Success Criteria

You'll know everything is working when:

1. ✅ Tab opens in Teams without errors
2. ✅ You can create a team via the UI
3. ✅ Bot responds to "help" command
4. ✅ Messages sent via Tab appear in backend logs
5. ✅ Data is saved to MongoDB
6. ✅ No console errors in browser DevTools

---

## 📝 Current Status Summary

```
✅ All code files created
✅ Root dependencies installed  
✅ Bot dependencies installed
⏳ Tab dependencies (in progress - resume npm install)
⏳ Backend API (needs to be started)
⏳ Local testing (pending)
⏳ Teams provisioning (pending)
```

---

## 🔜 Resume Command

**To continue right now, run:**

```bash
# You should be in: apps/teams-stakeholder-channels/src
npm install

# Once that completes, start testing!
```

---

**Questions? Check:**
- `README.md` - Full documentation
- `QUICKSTART.md` - Detailed setup guide
- Backend API docs - Check your API's documentation

**Good luck! 🚀**
