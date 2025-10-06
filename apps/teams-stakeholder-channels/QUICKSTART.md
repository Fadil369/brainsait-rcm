# 🚀 Quick Start Guide - BrainSAIT RCM Teams App

This guide will help you get the Teams Stakeholder Channels app running locally.

## ✅ Current Status

All dependencies have been installed successfully:
- ✅ Root dependencies (1592 packages)
- ✅ Tab dependencies
- ✅ Bot dependencies

## 📋 Prerequisites Checklist

Before you start, make sure you have:

- [ ] Node.js v18+ installed
- [ ] Python 3.8+ installed (for backend API)
- [ ] MongoDB running locally or connection string ready
- [ ] Microsoft 365 Account with Teams
- [ ] VS Code with Microsoft 365 Agents Toolkit extension

## 🎯 Step-by-Step Setup

### Step 1: Navigate to Project Root

```bash
# Make sure you're in the main project directory
cd ~/path/to/brainsait-rcm
```

### Step 2: Start the Backend API

The Teams app needs your BrainSAIT RCM backend API running first.

```bash
# From project root, navigate to API directory
cd apps/api

# Install Python dependencies (if not already done)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000

# Keep this terminal open - API should be running on http://localhost:8000
```

**Verify API is running:**
```bash
# In a new terminal
curl http://localhost:8000/api/v1/health
# Should return: {"status": "healthy"}
```

### Step 3: Configure Environment Variables

```bash
# Navigate to Teams app directory
cd apps/teams-stakeholder-channels

# The env/.env.local file already exists with defaults
# Edit it if you need to change API endpoint or other settings
nano env/.env.local
```

**Key variables to check:**
```env
API_BASE_URL=http://localhost:8000/api/v1/channels  # ✅ Should point to your API
BRAINSAIT_API_URL=http://localhost:8000              # ✅ Backend base URL
MONGODB_URI=mongodb://localhost:27017/brainsait_rcm  # ✅ Your MongoDB
```

### Step 4: Install Tab Dependencies (Webpack, etc.)

The tab needs additional build tools:

```bash
# Make sure you're in teams-stakeholder-channels directory
cd src

# Install webpack and other build dependencies
npm install

# Go back to root
cd ..
```

### Step 5: Start the Teams App Services

You have **two options**:

#### Option A: Start Services Individually (Recommended for debugging)

```bash
# Terminal 1: Start Tab (React App)
cd src
npm start
# Should start on https://localhost:53000

# Terminal 2: Start Bot
cd bot
npm run dev
# Should start on http://localhost:3978

# Terminal 3: Backend API (already running from Step 2)
```

#### Option B: Use Start Script (All services at once)

```bash
# From teams-stakeholder-channels directory
./start.sh

# This starts both Tab and Bot in background
# Press Ctrl+C to stop all services
```

### Step 6: Verify All Services Running

Check that all three services are up:

```bash
# Backend API
curl http://localhost:8000/api/v1/health

# Bot Health
curl http://localhost:3978/health

# Tab App
curl -k https://localhost:53000
# Should return the HTML page
```

You should see:
- ✅ **Backend API**: Port 8000
- ✅ **Bot**: Port 3978  
- ✅ **Tab**: Port 53000 (HTTPS)

### Step 7: Provision Teams App (First Time Only)

Now use Microsoft 365 Agents Toolkit to provision Azure resources:

1. **Open VS Code** in the `apps/teams-stakeholder-channels` directory
2. **Open Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
3. **Select**: `Teams: Provision`
4. **Sign in** to Microsoft 365 and Azure when prompted
5. **Wait** for provisioning to complete (2-3 minutes)

This will:
- Create Azure AD app registration
- Create Bot registration  
- Create Teams app
- Update `env/.env.local` with real IDs

### Step 8: Run in Teams

After provisioning:

1. **Press F5** in VS Code
   OR
2. **Command Palette** → `Teams: Preview in Teams`

Teams will open in your browser with the app installed!

## 🎉 You're Ready!

You should now see:

- **Tab Interface**: Modern React UI with Fluent design
- **Bot Commands**: Type "help" to see available commands
  - `list channels` - View all channels
  - `create channel` - Create new channel
  - `team info` - View team details

## 🔧 Troubleshooting

### Bot Not Responding

```bash
# Check bot is running
curl http://localhost:3978/health

# Check bot logs
cd bot
npm run dev
# Look for errors in output
```

### Tab Not Loading

```bash
# Check if webpack dev server is running
cd src
npm start

# Check browser console for errors
# Open: https://localhost:53000
```

### API Connection Failed

```bash
# Verify API is accessible
curl http://localhost:8000/api/v1/channels/teams

# Check CORS settings in backend
# Make sure main.py has:
# app.add_middleware(CORSMiddleware, allow_origins=["*"])
```

### Certificate/HTTPS Errors

The Tab requires HTTPS. If you see certificate warnings:

1. In Chrome/Edge: Click "Advanced" → "Proceed to localhost"
2. Or use VS Code's "Allow" when prompted for certificate

### Teams App Not Installing

```bash
# Validate manifest
cd appPackage
# Check manifest.json has all required fields

# Re-provision if needed
# Command Palette → Teams: Provision
```

## 📊 Port Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Backend API | 8000 | HTTP | FastAPI backend |
| Bot | 3978 | HTTP | Bot Framework messages |
| Tab | 53000 | HTTPS | React web app |

## 🔑 Environment Variables Reference

Located in `env/.env.local`:

```env
# Filled by M365 Agents Toolkit during provisioning:
TEAMS_APP_ID=                    # Auto-generated
AAD_APP_CLIENT_ID=               # Auto-generated
BOT_ID=                          # Auto-generated
BOT_PASSWORD=                    # Auto-generated

# You configure these:
API_BASE_URL=                    # Your backend API
MONGODB_URI=                     # Your database
```

## 📝 Next Actions

Once everything is running:

1. ✅ Test creating a team via Tab UI
2. ✅ Test bot commands
3. ✅ Send messages between channels
4. ✅ Verify backend API receives data
5. 🔄 Deploy to Azure (optional)

## 🆘 Need Help?

- Check logs in `logs/` directory
- Review `README.md` for detailed documentation
- Check backend API logs: `apps/api/logs/`
- Review Teams app manifest: `appPackage/manifest.json`

---

**Happy coding! 🚀**
