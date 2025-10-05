# OASIS+ Discovery - Quick Start Guide

## ✅ Setup Complete!

All dependencies are installed and ready to go. Here's how to run the discovery script:

## Step 1: Run Discovery Script

### Option A: Headless Mode (Recommended for Production)
```bash
cd C:\Users\rcmrejection3\nphies-rcm\brainsait-rcm\services\oasis-integration
npm run discover
```

This will:
- Run the browser in the background (no window)
- Complete in ~30-60 seconds
- Generate all documentation

### Option B: Headed Mode (Recommended for First Run / Debugging)
```bash
cd C:\Users\rcmrejection3\nphies-rcm\brainsait-rcm\services\oasis-integration
npm run discover:headed
```

This will:
- Show the browser window
- Slow down actions so you can watch
- Useful for debugging and verification

## Step 2: What Happens During Discovery

You'll see console output like:

```
╔════════════════════════════════════════════════════════════╗
║         OASIS+ Discovery & Documentation Tool              ║
║         BrainSAIT Healthcare Claims Platform               ║
╚════════════════════════════════════════════════════════════╝

🚀 Initializing OASIS+ Discovery...
   URL: http://128.1.1.185/prod/faces/Home
   Mode: Headless

📋 Step 1: Analyzing Login Page...
   ✓ Found 1 forms
   ✓ Found 2 form fields
   📸 Screenshot: 01-login-page-1234567890.png

🔐 Step 2: Performing Login...
   Username field: username
   Password field: password
   ✓ Login successful
   📸 Screenshot: 02-credentials-filled-1234567891.png

🏠 Step 3: Analyzing Home Page...
   ✓ Found 3 forms
   ✓ Found 15 form fields
   📸 Screenshot: 03-logged-in-1234567892.png

📝 Step 4: Navigating to Claim Submission...
   Found link with text containing: "claim"
   ✓ Claim submission page analyzed
   📸 Screenshot: 04-claim-submission-page-1234567893.png

📄 Generating Documentation...
   ✓ JSON: ./discovery-output/oasis-discovery.json
   ✓ Markdown: ./discovery-output/OASIS_INTEGRATION_GUIDE.md
   ✓ Types: ./discovery-output/oasis-types.ts

✅ Discovery Complete!
```

## Step 3: Review Output

After completion, check these files:

### 1. Screenshots (Visual Verification)
```bash
ls screenshots/
```

You'll see:
- `01-login-page-*.png` - Login form
- `02-credentials-filled-*.png` - Before submit
- `03-logged-in-*.png` - Home page
- `04-claim-submission-page-*.png` - Claim form
- `05-claim-search-page-*.png` - Search page (if found)

### 2. Structured Data (JSON)
```bash
cat discovery-output/oasis-discovery.json
```

Contains:
- Complete form field definitions
- API endpoints with request/response bodies
- Session cookies
- Navigation paths

### 3. Human-Readable Documentation (Markdown)
```bash
cat discovery-output/OASIS_INTEGRATION_GUIDE.md
```

Contains:
- Authentication flow
- Form field tables
- API endpoint documentation
- Navigation guide

### 4. TypeScript Types
```bash
cat discovery-output/oasis-types.ts
```

Contains:
- Auto-generated TypeScript interfaces
- Enums for dropdown values
- Ready to use in integration service

## Step 4: Next Steps

### Review the Documentation
```bash
# Open in your favorite editor
code discovery-output/OASIS_INTEGRATION_GUIDE.md

# Or just cat it
cat discovery-output/OASIS_INTEGRATION_GUIDE.md
```

### Share the Output
If I need to build the integration service, share:
```bash
cat discovery-output/oasis-discovery.json
```

Or just tell me key findings like:
- "Claim submission has 25 fields"
- "Main API endpoint is POST /api/claims/submit"
- "Session uses JSESSIONID cookie"

## Troubleshooting

### Can't Connect to OASIS+
```bash
# Test connectivity
ping 128.1.1.185

# Or try accessing in browser
start http://128.1.1.185/prod/faces/Home
```

### Login Fails
1. Verify credentials in `.env`:
   ```bash
   cat .env
   ```
2. Run in headed mode to watch:
   ```bash
   npm run discover:headed
   ```

### Script Hangs
- Press `Ctrl+C` to cancel
- Check `screenshots/error-*.png` for what page it got stuck on
- Increase timeout in `.env`: `TIMEOUT=60000`

### Partial Results
- Even if script fails, it will generate documentation for completed steps
- Check `discovery-output/oasis-discovery.json` for what it found
- Look at `errors` array for details

## What I'll Do Next

Once you share the discovery output, I'll:

1. **Build Integration Service** (`src/index.ts`)
   - OASIS+ API client
   - Authentication handler
   - Claim submission logic
   - Error handling

2. **Create Kubernetes Manifests**
   - Deployment config
   - Service definition
   - Secrets management
   - ConfigMaps

3. **End-to-End Tests**
   - Mock OASIS+ responses
   - Test full workflow
   - Validation checks

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run discover` | Run discovery in headless mode |
| `npm run discover:headed` | Run discovery with visible browser |
| `ls screenshots/` | View captured screenshots |
| `cat discovery-output/oasis-discovery.json` | Raw data |
| `cat discovery-output/OASIS_INTEGRATION_GUIDE.md` | Documentation |

## Environment Variables

Already configured in `.env`:
- `OASIS_URL=http://128.1.1.185/prod/faces/Home`
- `OASIS_USERNAME=U29958`
- `OASIS_PASSWORD=U29958`

To modify, edit `.env` file.
