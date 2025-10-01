# 🚀 BrainSAIT RCM - Production Deployment Guide

## Quick Deployment (5 minutes)

### Prerequisites
- GitHub account (you already have this)
- MongoDB Atlas account (free tier) - [Sign up here](https://www.mongodb.com/cloud/atlas/register)
- Render.com account (free tier) - [Sign up here](https://render.com)

---

## Step 1: Setup MongoDB Atlas (2 minutes)

1. **Create a free cluster:**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Click "Build a Database" → Choose "FREE" tier (M0)
   - Choose AWS as provider, select nearest region
   - Click "Create Cluster"

2. **Create database user:**
   - Go to "Database Access" → "Add New Database User"
   - Username: `brainsait_admin`
   - Password: Click "Autogenerate Secure Password" (SAVE THIS!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

3. **Allow network access:**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

4. **Get connection string:**
   - Go to "Database" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://brainsait_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
   - Replace `<password>` with the password you saved earlier
   - Add database name: `mongodb+srv://brainsait_admin:PASSWORD@cluster0.xxxxx.mongodb.net/brainsait_rcm?retryWrites=true&w=majority`

---

## Step 2: Deploy API to Render.com (3 minutes)

1. **Connect GitHub:**
   - Go to https://render.com
   - Click "Get Started" → Sign in with GitHub
   - Authorize Render to access your repositories

2. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect repository: `Fadil369/brainsait-rcm`
   - Click "Connect"

3. **Configure Service:**
   - **Name:** `brainsait-api`
   - **Region:** Choose closest to Saudi Arabia (e.g., Frankfurt or Singapore)
   - **Branch:** `main`
   - **Root Directory:** `apps/api`
   - **Runtime:** `Docker`
   - **Instance Type:** `Free`

4. **Add Environment Variables:**
   Click "Advanced" → Add these environment variables:

   ```
   DATABASE_URL = mongodb+srv://brainsait_admin:PASSWORD@cluster0.xxxxx.mongodb.net/brainsait_rcm?retryWrites=true&w=majority
   MONGODB_DATABASE = brainsait_rcm
   JWT_SECRET_KEY = [Click "Generate" for random secure key]
   JWT_ALGORITHM = HS256
   ACCESS_TOKEN_EXPIRE_MINUTES = 30
   ALLOWED_ORIGINS = https://e423374a.brainsait-rcm.pages.dev,https://brainsait-rcm.pages.dev
   ALLOW_CREDENTIALS = true
   ENCRYPTION_KEY = [Click "Generate" for random secure key]
   ENVIRONMENT = production
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait 5-10 minutes for first deployment
   - You'll get a URL like: `https://brainsait-api.onrender.com`

---

## Step 3: Update Frontend Configuration

1. **Update frontend environment:**

   Edit `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://brainsait-api.onrender.com
   NEXT_PUBLIC_API_TIMEOUT=30000
   NEXT_PUBLIC_AUTH_TOKEN_KEY=brainsait_auth_token
   NEXT_PUBLIC_ENABLE_ANALYTICS=true
   ```

2. **Rebuild and deploy:**
   ```bash
   npm run build --workspace=apps/web
   npx wrangler pages deploy apps/web/out --project-name=brainsait-rcm --commit-dirty=true
   ```

---

## Step 4: Test the Deployment

1. **Visit your frontend:**
   - Go to https://e423374a.brainsait-rcm.pages.dev
   - You should see the dashboard load without errors

2. **Test API directly:**
   ```bash
   curl https://brainsait-api.onrender.com/health
   ```
   Should return: `{"status": "healthy", "database": "connected"}`

3. **Login:**
   - Default credentials will be created on first API start
   - Or create user via API endpoint

---

## Alternative: Railway.app Deployment

If Render doesn't work, try Railway.app:

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy:**
   ```bash
   railway login
   cd apps/api
   railway init
   railway up
   ```

3. **Add MongoDB:**
   ```bash
   railway add mongodb
   ```

4. **Set environment variables:**
   ```bash
   railway variables set ALLOWED_ORIGINS=https://e423374a.brainsait-rcm.pages.dev
   ```

---

## Troubleshooting

### "Error Loading Data" on frontend

**Cause:** API URL not configured or API is down

**Fix:**
1. Check `apps/web/.env.local` has correct `NEXT_PUBLIC_API_URL`
2. Verify API is running: `curl https://your-api-url.com/health`
3. Check browser console for CORS errors
4. Rebuild frontend after changing .env.local

### API returns 500 errors

**Cause:** Database connection failed

**Fix:**
1. Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
2. Check DATABASE_URL has correct password
3. Check Render logs: Dashboard → Logs tab
4. Verify database user has read/write permissions

### CORS errors in browser

**Cause:** Frontend URL not in ALLOWED_ORIGINS

**Fix:**
1. Go to Render.com → Your Service → Environment
2. Update `ALLOWED_ORIGINS` to include your Cloudflare Pages URL
3. Redeploy service

---

## Production Checklist

- [ ] MongoDB Atlas cluster created and accessible
- [ ] API deployed to Render.com (or Railway)
- [ ] API health check returns 200 OK
- [ ] Frontend .env.local updated with production API URL
- [ ] Frontend rebuilt and redeployed
- [ ] Dashboard loads without "Error Loading Data"
- [ ] Login works
- [ ] All modals open and close properly
- [ ] API calls work (test by creating a rejection)

---

## Estimated Costs

- **MongoDB Atlas:** $0/month (Free M0 tier - 512MB storage)
- **Render.com:** $0/month (Free tier - sleeps after 15 min inactivity)
- **Cloudflare Pages:** $0/month (Unlimited bandwidth)

**Total: $0/month** ✅

---

## Next Steps After Deployment

1. **Custom Domain:** Configure `rcm.brainsait.com` in Cloudflare Pages
2. **API Domain:** Add custom domain in Render.com
3. **Upgrade:** Move to paid tier when needed ($7/month Render + $9/month MongoDB M10)
4. **Monitoring:** Add Sentry for error tracking
5. **Backups:** Enable MongoDB automated backups

---

## Support

If you encounter issues:
1. Check Render logs: https://dashboard.render.com
2. Check MongoDB Atlas logs
3. Check browser console (F12)
4. Review API logs for errors
