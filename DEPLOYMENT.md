# BrainSAIT RCM - Deployment Guide

## Cloudflare Deployment to brainsait.com

This guide covers deploying the BrainSAIT Healthcare Claims Management System to Cloudflare under the brainsait.com domain.

## Prerequisites

1. **Cloudflare Account** with brainsait.com domain configured
2. **Cloudflare Pages** access
3. **MongoDB Atlas** account (or external MongoDB instance)
4. **Redis Cloud** account (or external Redis instance)
5. **Node.js 18+** and **Python 3.11+** installed locally

## Configuration Steps

### 1. Cloudflare Setup

#### A. Create Cloudflare Pages Project
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create Pages project
wrangler pages project create brainsait-rcm
```

#### B. Configure Custom Domain
1. Go to Cloudflare Dashboard → Pages → brainsait-rcm
2. Navigate to "Custom domains"
3. Add custom domain: `rcm.brainsait.com` or `app.brainsait.com`
4. DNS records will be automatically configured

### 2. Database Setup

#### MongoDB Atlas (Recommended for Production)
```bash
# 1. Create MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
# 2. Create a new cluster
# 3. Create database user with read/write permissions
# 4. Get connection string (replace <password> with actual password)
# Example: mongodb+srv://brainsait:<password>@cluster0.xxxxx.mongodb.net/brainsait
```

#### Redis Cloud (Recommended for Production)
```bash
# 1. Create Redis Cloud account at https://redis.com/cloud/
# 2. Create a new database
# 3. Get connection string
# Example: redis://default:<password>@redis-xxxxx.cloud.redislabs.com:12345
```

### 3. Environment Variables

#### Cloudflare Pages Environment Variables
Set these in Cloudflare Dashboard → Pages → brainsait-rcm → Settings → Environment variables:

**Production Environment:**
```env
NEXT_PUBLIC_API_URL=https://api.brainsait.com
NODE_ENV=production
```

#### Cloudflare Workers/API Environment Variables
```env
DATABASE_URL=mongodb+srv://brainsait:<password>@cluster0.xxxxx.mongodb.net/brainsait
REDIS_URL=redis://default:<password>@redis-xxxxx.cloud.redislabs.com:12345
NPHIES_API_KEY=your_nphies_api_key_here
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
ALLOWED_ORIGINS=https://rcm.brainsait.com,https://brainsait.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@brainsait.com
SMTP_PASSWORD=your_email_password
```

### 4. GitHub Secrets (for CI/CD)

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```env
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
DATABASE_URL=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
NPHIES_API_KEY=your_nphies_api_key
ENCRYPTION_KEY=your_encryption_key
JWT_SECRET=your_jwt_secret
API_URL=https://api.brainsait.com
```

### 5. Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/brainsait/rcm-haya.git
cd rcm-haya

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your local development credentials

# 4. Start Docker containers (MongoDB + Redis)
docker-compose up -d mongodb redis

# 5. Build packages
cd packages/rejection-tracker && npm run build && cd ../..
cd packages/notification-service && npm run build && cd ../..

# 6. Start development servers
npm run dev
```

Access the application at:
- **Web Dashboard**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 6. Manual Deployment

#### Deploy Frontend to Cloudflare Pages
```bash
# Build the Next.js application
cd apps/web
npm run build

# Deploy to Cloudflare Pages
wrangler pages publish .next --project-name=brainsait-rcm
```

#### Deploy API
For the API, you have two options:

**Option A: Use Cloudflare Workers (Serverless)**
```bash
cd apps/api
wrangler deploy
```

**Option B: Use External Server (VPS/Cloud)**
```bash
# Deploy to your own server using Docker
docker-compose up -d api worker
```

### 7. Automated Deployment (CI/CD)

The project includes GitHub Actions workflow that automatically deploys when you push to the `main` branch.

```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Deploy to production"
git push origin main
```

## Production Architecture

```
┌─────────────────────────────────────────┐
│         Cloudflare CDN/DNS              │
│         (brainsait.com)                 │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼──────┐      ┌──────▼────────┐
│ Cloudflare   │      │  API Server   │
│ Pages (Web)  │      │  (Workers or  │
│              │      │   VPS/Cloud)  │
└──────┬───────┘      └───────┬───────┘
       │                      │
       │              ┌───────┴────────┐
       │              │                │
       │      ┌───────▼──────┐  ┌─────▼──────┐
       │      │  MongoDB      │  │   Redis    │
       │      │  Atlas        │  │   Cloud    │
       │      └───────────────┘  └────────────┘
       │
       └──────► External Services:
                - NPHIES API
                - SMTP Email
```

## Post-Deployment Checklist

- [ ] Verify DNS records are pointing to Cloudflare
- [ ] Test web dashboard at https://rcm.brainsait.com
- [ ] Test API health endpoint: https://api.brainsait.com/health
- [ ] Verify database connection
- [ ] Test user authentication
- [ ] Test rejection data entry
- [ ] Test compliance letter generation
- [ ] Configure SSL/TLS certificates (automatic with Cloudflare)
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy for MongoDB
- [ ] Test NPHIES integration
- [ ] Verify email notifications work
- [ ] Load test the application
- [ ] Configure WAF rules in Cloudflare
- [ ] Set up audit logging

## Monitoring

### Cloudflare Analytics
- Access: Cloudflare Dashboard → Analytics
- Monitor: Page views, requests, bandwidth, errors

### Application Logs
```bash
# View API logs (if using Docker)
docker-compose logs -f api

# View worker logs
docker-compose logs -f worker
```

### Health Checks
```bash
# Check API health
curl https://api.brainsait.com/health

# Expected response:
# {"status":"healthy","database":"connected"}
```

## Troubleshooting

### Issue: Build fails on Cloudflare Pages
**Solution:** Ensure all dependencies are in package.json and build command is correct in wrangler.toml

### Issue: API cannot connect to database
**Solution:**
1. Verify DATABASE_URL environment variable
2. Check MongoDB Atlas network access (whitelist Cloudflare IPs)
3. Verify database user credentials

### Issue: CORS errors
**Solution:** Add your domain to ALLOWED_ORIGINS in API environment variables

### Issue: Slow performance
**Solution:**
1. Enable Redis caching
2. Use Cloudflare CDN caching
3. Optimize database queries with proper indexes
4. Use connection pooling for MongoDB

## Scaling

### Horizontal Scaling
- Cloudflare Pages automatically scales
- For API: Use Cloudflare Workers (auto-scaling) or load balancer with multiple instances

### Database Scaling
- MongoDB Atlas: Upgrade cluster tier
- Add read replicas for read-heavy workloads
- Implement sharding for large datasets

## Backup & Disaster Recovery

### Database Backups
```bash
# MongoDB Atlas provides automatic backups
# Manual backup:
mongodump --uri="mongodb+srv://brainsait:<password>@cluster0.xxxxx.mongodb.net/brainsait" --out=/backup/$(date +%Y%m%d)
```

### Application Backup
- Code: Maintained in Git repository
- Configuration: Store environment variables securely
- Data: Regular MongoDB backups

## Support

For deployment issues or questions:
- **Technical Support**: tech@brainsait.com
- **Documentation**: https://github.com/brainsait/rcm-haya
- **Cloudflare Support**: https://support.cloudflare.com

## Security Best Practices

1. **Enable Cloudflare WAF** (Web Application Firewall)
2. **Use strong encryption keys** (32+ characters)
3. **Rotate secrets regularly** (JWT secrets, API keys)
4. **Enable rate limiting** in Cloudflare
5. **Use HTTPS only** (enforce in Cloudflare)
6. **Implement IP whitelisting** for admin routes
7. **Regular security audits** of dependencies
8. **Enable audit logging** for all data access
9. **Use environment variables** for all secrets
10. **Implement HIPAA compliance** measures# 🚀 Deployment Guide - BrainSAIT RCM

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