# 🚀 Deployment Guide - BrainSAIT RCM

## Step 1: Create GitHub Repository

### Option A: Using GitHub CLI (Recommended)

```bash
# Install GitHub CLI if not installed
# macOS: brew install gh
# Windows: winget install --id GitHub.cli

# Login to GitHub
gh auth login

# Create repository
gh repo create brainsait-rcm --public --source=. --remote=origin

# Push code
git push -u origin main
```

### Option B: Manual Setup

1. **Go to GitHub:** https://github.com/new
2. **Repository details:**
   - **Name:** `brainsait-rcm`
   - **Description:** `AI-Powered Healthcare Claims Management System`
   - **Visibility:** Public or Private
   - **DON'T** initialize with README, .gitignore, or license
3. **Click:** "Create repository"
4. **Run these commands:**

```bash
git remote add origin https://github.com/YOUR_USERNAME/brainsait-rcm.git
git push -u origin main
```

---

## Step 2: Deploy Web App to Cloudflare Pages

### Prerequisites
- Cloudflare account (sign up at https://dash.cloudflare.com/sign-up)
- GitHub repository created and pushed

### Deployment Steps

#### 1. Connect GitHub to Cloudflare

1. Go to **Cloudflare Dashboard:** https://dash.cloudflare.com
2. Navigate to **Pages** → **Create a project**
3. Click **Connect to Git**
4. Select **GitHub** and authorize Cloudflare
5. Select your repository: `brainsait-rcm`

#### 2. Configure Build Settings

**Framework preset:** Next.js

**Build configuration:**
```
Build command:     npm run build --workspace=apps/web
Build output:      apps/web/.next
Root directory:    / (leave as root)
Node version:      18
```

**Environment variables:**
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

#### 3. Advanced Settings (Optional)

**Custom domain:** Configure after initial deployment

**Branch deployments:**
- Production branch: `main`
- Preview branches: All other branches

#### 4. Deploy

1. Click **Save and Deploy**
2. Wait 3-5 minutes for build
3. Your app will be live at: `https://brainsait-rcm.pages.dev`

---

## Step 3: Deploy API (Backend Options)

### Option A: Cloudflare Workers (Recommended for serverless)

**Note:** FastAPI doesn't run directly on Workers. Consider these alternatives:

1. **Use Cloudflare Workers for frontend only**
2. **Deploy API to:**
   - Railway: https://railway.app
   - Render: https://render.com
   - Fly.io: https://fly.io
   - AWS Lambda (with Mangum adapter)

### Option B: Deploy API to Railway

1. Go to **Railway:** https://railway.app
2. **New Project** → **Deploy from GitHub**
3. Select `brainsait-rcm` repository
4. **Configure:**
   - **Root directory:** `apps/api`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Add services:**
   - MongoDB (Railway provides it)
   - Redis (Railway provides it)
6. **Set environment variables:**
   ```
   DATABASE_URL=mongodb://...
   REDIS_URL=redis://...
   JWT_SECRET=your_secret_key
   NPHIES_API_KEY=your_key
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   SENTRY_DSN=your_sentry_dsn
   ```
7. **Deploy**

### Option C: Deploy API to Render

1. Go to **Render:** https://render.com
2. **New** → **Web Service**
3. Connect GitHub repository
4. **Configure:**
   - **Name:** brainsait-api
   - **Root Directory:** `apps/api`
   - **Environment:** Python 3.12
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Add MongoDB & Redis** from Render dashboard
6. **Set environment variables** (same as Railway)
7. **Create Web Service**

---

## Step 4: Configure Custom Domain (Optional)

### For Cloudflare Pages

1. Go to **Pages** → **Your project** → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain: `rcm.brainsait.com`
4. Follow DNS configuration instructions
5. Wait for SSL certificate (automatic)

---

## Step 5: Update API URL in Frontend

After deploying the API, update the frontend environment variable:

1. Go to **Cloudflare Pages** → **Settings** → **Environment variables**
2. Update `NEXT_PUBLIC_API_URL` with your API URL
3. Redeploy the frontend

---

## 🔄 Continuous Deployment

Once connected, every push to `main` branch will:
- ✅ Trigger automatic build
- ✅ Run tests (via GitHub Actions)
- ✅ Deploy to production
- ✅ Preview deployments for PRs

---

## 📊 Monitoring Deployments

### Cloudflare Pages
- **Dashboard:** https://dash.cloudflare.com/pages
- **Logs:** Check build logs in deployment details
- **Analytics:** Available in Cloudflare dashboard

### Railway/Render
- **Dashboard:** Check service dashboard
- **Logs:** Real-time logs available
- **Metrics:** CPU, memory, requests

---

## 🛠️ Troubleshooting

### Build Fails

**Issue:** Node.js version mismatch
**Solution:** Set Node version to 18 in Cloudflare Pages settings

**Issue:** Missing dependencies
**Solution:** Check package.json and ensure all deps are listed

### API Connection Issues

**Issue:** CORS errors
**Solution:** Add your Cloudflare Pages URL to `ALLOWED_ORIGINS` in .env

**Issue:** 503 Service Unavailable
**Solution:** Check MongoDB connection and ensure DATABASE_URL is correct

### Environment Variables

**Issue:** Variables not loading
**Solution:**
1. Check they're set in Cloudflare/Railway dashboard
2. Prefix frontend vars with `NEXT_PUBLIC_`
3. Redeploy after adding variables

---

## 🔒 Security Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Configure `ALLOWED_ORIGINS` properly
- [ ] Enable HTTPS (automatic with Cloudflare)
- [ ] Set up database authentication
- [ ] Configure Sentry for error tracking
- [ ] Enable rate limiting in production
- [ ] Review and update .env.example (don't commit .env)

---

## 📈 Post-Deployment

1. **Test the deployment:**
   ```bash
   curl https://your-app.pages.dev/health
   ```

2. **Monitor errors:** Check Sentry dashboard

3. **Set up alerts:** Configure Cloudflare/Railway alerts

4. **Backup database:** Schedule regular backups

5. **Update documentation:** Add deployment URL to README

---

## 🆘 Support

- **Cloudflare Docs:** https://developers.cloudflare.com/pages
- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs

---

**Deployment Status:** Ready to deploy! 🚀

Follow the steps above to get your BrainSAIT RCM system live.