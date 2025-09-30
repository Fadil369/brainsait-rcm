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
10. **Implement HIPAA compliance** measures