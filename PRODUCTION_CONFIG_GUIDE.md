# Production Configuration Guide

This guide walks you through configuring the RCM-HAYA authentication system for production deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Generate Secrets](#generate-secrets)
3. [Configure OAuth Providers](#configure-oauth-providers)
4. [Configure OTP Providers](#configure-otp-providers)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [Security Hardening](#security-hardening)
8. [Testing](#testing)
9. [Deployment](#deployment)

---

## Prerequisites

**Required:**
- [ ] Domain name (e.g., `yourdomain.com`)
- [ ] SSL certificate (production requires HTTPS)
- [ ] MongoDB Atlas account (or self-hosted MongoDB)
- [ ] Email provider (Gmail/SendGrid/AWS SES)

**Optional (for full feature set):**
- [ ] Google Cloud Platform account (for Google OAuth)
- [ ] GitHub account (for GitHub OAuth)
- [ ] Twilio account (for SMS/WhatsApp OTP)

---

## Generate Secrets

### 1. JWT Secret Key

**Purpose:** Signs JWT tokens (access and refresh tokens)

```bash
# Generate 32-byte (64 character) hex string
openssl rand -hex 32
```

**Example output:**
```
3b7faf0c2e1050fd82b047c8c2470af383430050a14cd5f56aa9e8a2f1b3adf0
```

**Save as:** `JWT_SECRET_KEY` in `.env.production`

**Security:**
- ✅ Must be 64 characters (32 bytes)
- ✅ Must be unique (never reuse from development)
- ✅ Store securely (use password manager or secrets manager)
- ⚠️ If compromised, ALL tokens are invalidated

---

### 2. Super Admin Setup Key

**Purpose:** One-time key to create the first super admin account

```bash
# Generate 32-byte (64 character) hex string
openssl rand -hex 32
```

**Example output:**
```
48d2469a39705a3aebf07dfc37cfa694299444302439f94fe18fb20c704e2203
```

**Save as:** `SUPER_ADMIN_SETUP_KEY` in `.env.production`

**Security:**
- ✅ Used ONE TIME during deployment
- ✅ Must be rotated IMMEDIATELY after creating super admin
- ✅ Store securely (you'll need it again if you lose super admin access)
- ⚠️ If compromised, attacker can create super admin account

**Rotation after use:**
```bash
# Generate new key
NEW_KEY=$(openssl rand -hex 32)

# Update environment variable
export SUPER_ADMIN_SETUP_KEY=$NEW_KEY

# Restart API
systemctl restart rcm-haya-api
```

---

## Configure OAuth Providers

### Google OAuth 2.0

#### Setup Steps:

1. **Go to Google Cloud Console:**
   - Navigate to: https://console.cloud.google.com/apis/credentials
   - Select or create a project

2. **Enable Google+ API:**
   - Go to "Library" → Search "Google+ API"
   - Click "Enable"

3. **Create OAuth 2.0 Client ID:**
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "RCM-HAYA Production"

4. **Configure Authorized Redirect URIs:**
   ```
   https://yourdomain.com/api/auth/oauth/google/callback
   https://www.yourdomain.com/api/auth/oauth/google/callback
   ```

5. **Copy Credentials:**
   - Client ID: `123456789-abcdefg.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`

6. **Update `.env.production`:**
   ```bash
   GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/oauth/google/callback
   ```

#### Testing:

```bash
# Test Google OAuth flow
curl -X GET "https://yourdomain.com/api/auth/oauth/google/authorize?state=test123"
# Should redirect to Google consent screen
```

---

### GitHub OAuth

#### Setup Steps:

1. **Go to GitHub Developer Settings:**
   - Navigate to: https://github.com/settings/developers
   - Click "New OAuth App"

2. **Configure OAuth App:**
   - **Application name:** RCM-HAYA Production
   - **Homepage URL:** `https://yourdomain.com`
   - **Authorization callback URL:** `https://yourdomain.com/api/auth/oauth/github/callback`
   - Click "Register application"

3. **Generate Client Secret:**
   - Click "Generate a new client secret"
   - Copy the secret (you won't see it again!)

4. **Copy Credentials:**
   - Client ID: `Iv1.a1b2c3d4e5f6g7h8`
   - Client Secret: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

5. **Update `.env.production`:**
   ```bash
   GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
   GITHUB_CLIENT_SECRET=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   GITHUB_REDIRECT_URI=https://yourdomain.com/api/auth/oauth/github/callback
   ```

#### Testing:

```bash
# Test GitHub OAuth flow
curl -X GET "https://yourdomain.com/api/auth/oauth/github/authorize?state=test123"
# Should redirect to GitHub authorization page
```

---

## Configure OTP Providers

### Email OTP (SMTP)

**Choose ONE of the following providers:**

#### Option 1: Gmail (Simple, good for testing)

1. **Enable 2-Factor Authentication:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other" → Enter "RCM-HAYA"
   - Click "Generate"
   - Copy the 16-character password

3. **Update `.env.production`:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=abcd efgh ijkl mnop  # Remove spaces
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   SMTP_FROM_NAME=RCM-HAYA
   ```

**⚠️ Gmail Limitations:**
- Max 500 emails/day
- Not recommended for production at scale
- Use SendGrid or AWS SES for production

---

#### Option 2: SendGrid (Recommended for production)

1. **Create SendGrid Account:**
   - Go to: https://signup.sendgrid.com/
   - Complete verification

2. **Create API Key:**
   - Go to: https://app.sendgrid.com/settings/api_keys
   - Click "Create API Key"
   - Name: "RCM-HAYA Production"
   - Permissions: "Full Access" (or "Mail Send" only)
   - Copy API key (starts with `SG.`)

3. **Verify Sender Identity:**
   - Go to: https://app.sendgrid.com/settings/sender_auth
   - Add single sender: `noreply@yourdomain.com`
   - Verify email address

4. **Update `.env.production`:**
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   SMTP_FROM_NAME=RCM-HAYA
   ```

**✅ SendGrid Benefits:**
- 100 emails/day free tier
- Reliable delivery
- Email analytics
- Production-ready

---

#### Option 3: AWS SES (Best for AWS deployments)

1. **Verify Domain:**
   - Go to: https://console.aws.amazon.com/ses/
   - Click "Verified identities" → "Create identity"
   - Identity type: "Domain"
   - Enter your domain
   - Add DNS records (DKIM, SPF, DMARC)

2. **Create SMTP Credentials:**
   - Go to "SMTP settings"
   - Click "Create SMTP credentials"
   - Download credentials CSV

3. **Request Production Access:**
   - By default, SES is in "Sandbox mode" (only verified emails)
   - Go to "Account dashboard" → "Request production access"
   - Fill out form with use case

4. **Update `.env.production`:**
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USERNAME=AKIAIOSFODNN7EXAMPLE
   SMTP_PASSWORD=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   SMTP_FROM_NAME=RCM-HAYA
   ```

**✅ AWS SES Benefits:**
- $0.10 per 1,000 emails
- 62,000 free emails/month (if hosted on EC2)
- High deliverability
- Integrates with AWS ecosystem

---

### SMS OTP (Twilio) - Optional

**Required only if enabling SMS OTP authentication**

1. **Create Twilio Account:**
   - Go to: https://www.twilio.com/try-twilio
   - Complete verification

2. **Get Account SID and Auth Token:**
   - Go to: https://www.twilio.com/console
   - Copy "Account SID" and "Auth Token"

3. **Buy Phone Number:**
   - Go to: https://www.twilio.com/console/phone-numbers/search
   - Select country and capabilities (SMS)
   - Purchase number

4. **Update `.env.production`:**
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

**💰 Pricing:**
- Pay-as-you-go: ~$0.01 per SMS
- Phone number: ~$1/month
- Free trial: $15 credit

---

### WhatsApp OTP (Twilio) - Optional

**Required only if enabling WhatsApp OTP authentication**

1. **Enable WhatsApp in Twilio:**
   - Go to: https://www.twilio.com/console/sms/whatsapp/senders
   - Click "Get started with WhatsApp"

2. **Request WhatsApp Sender Approval:**
   - Submit business profile
   - Verify phone number
   - Wait for approval (1-2 weeks)

3. **Update `.env.production`:**
   ```bash
   WHATSAPP_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   WHATSAPP_AUTH_TOKEN=your_auth_token_here
   WHATSAPP_PHONE_NUMBER=whatsapp:+1234567890
   ```

**⚠️ Requirements:**
- Business verification required
- Meta Business Manager account
- Approval process can take time

---

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster:**
   - Go to: https://cloud.mongodb.com/
   - Create free cluster (M0) or production cluster (M10+)
   - Choose region closest to your API

2. **Configure Network Access:**
   - Go to "Network Access"
   - Add IP: `0.0.0.0/0` (allow from anywhere)
   - Or add specific IPs for better security

3. **Create Database User:**
   - Go to "Database Access"
   - Add user: `rcm-haya-prod`
   - Set strong password
   - Role: "Read and write to any database"

4. **Get Connection String:**
   - Go to "Clusters" → "Connect"
   - Choose "Connect your application"
   - Copy connection string:
   ```
   mongodb+srv://rcm-haya-prod:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

5. **Update `.env.production`:**
   ```bash
   MONGODB_URL=mongodb+srv://rcm-haya-prod:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/rcm-haya-prod?retryWrites=true&w=majority
   DATABASE_NAME=rcm-haya-prod
   ```

**✅ Indexes Auto-Created:**
The application automatically creates these indexes on startup:
- `users.email` (unique)
- `users.username` (unique, sparse)
- `users.phone_number` (unique, sparse)
- `oauth_providers.user_id + provider` (unique)
- `otp_verifications.expiry` (TTL, 10 minutes)
- `refresh_tokens.expiry` (TTL, 7 days)
- `auth_events.timestamp` (TTL, 90 days)
- `rate_limits.expiry` (TTL, auto)

---

## Environment Configuration

### Create Production Environment File

```bash
cd /Users/fadil369/rcm-haya/apps/api

# Copy template
cp .env.production.template .env.production

# Edit with your credentials
nano .env.production
```

### Minimum Required Configuration

```bash
# Authentication
JWT_SECRET_KEY=<64-character-hex-from-openssl>
SUPER_ADMIN_SETUP_KEY=<64-character-hex-from-openssl>

# Database
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/db
DATABASE_NAME=rcm-haya-prod

# Email OTP (choose one provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=RCM-HAYA

# Application
API_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ENVIRONMENT=production
DEBUG_MODE=false
LOG_LEVEL=INFO
```

### Optional Configuration

**Enable OAuth:**
```bash
ENABLE_GOOGLE_OAUTH=true
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

ENABLE_GITHUB_OAUTH=true
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=...
```

**Enable SMS/WhatsApp:**
```bash
ENABLE_SMS_OTP=true
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

ENABLE_WHATSAPP_OTP=true
WHATSAPP_ACCOUNT_SID=...
WHATSAPP_AUTH_TOKEN=...
WHATSAPP_PHONE_NUMBER=...
```

---

## Security Hardening

### 1. Verify All Secrets Are Unique

```bash
# Check JWT_SECRET_KEY length
echo -n "$JWT_SECRET_KEY" | wc -c
# Should output: 64

# Check SUPER_ADMIN_SETUP_KEY length
echo -n "$SUPER_ADMIN_SETUP_KEY" | wc -c
# Should output: 64
```

### 2. Configure CORS Properly

**Only allow your production domains:**
```bash
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**⚠️ NEVER use:**
```bash
CORS_ORIGINS=*  # ❌ Security risk!
```

### 3. Enable Secure Cookies

```bash
SECURE_COOKIES=true  # Only over HTTPS
SAMESITE_COOKIES=lax  # CSRF protection
```

### 4. Set Proper Log Level

```bash
DEBUG_MODE=false  # Never true in production
LOG_LEVEL=INFO    # Or WARNING/ERROR
```

### 5. Configure Rate Limiting

```bash
MAX_LOGIN_ATTEMPTS=5
LOGIN_RATE_LIMIT_MINUTES=15
MAX_OTP_REQUESTS_PER_MINUTE=1
MAX_OTP_REQUESTS_PER_HOUR=5
MAX_REGISTRATIONS_PER_HOUR=3
```

### 6. Database Security

- ✅ Use strong password (20+ characters, mixed case, numbers, symbols)
- ✅ Restrict network access (whitelist IPs if possible)
- ✅ Enable MongoDB authentication
- ✅ Use connection string encryption
- ✅ Enable audit logging (MongoDB Atlas M10+)

### 7. Rotate Secrets Regularly

**Schedule:**
- JWT_SECRET_KEY: Every 90 days
- OAuth secrets: When compromised
- Database password: Every 180 days
- SMTP password: When compromised

---

## Testing

### 1. Test Database Connection

```bash
python3 -c "
from pymongo import MongoClient
import os

client = MongoClient(os.getenv('MONGODB_URL'))
db = client[os.getenv('DATABASE_NAME')]
print('✅ Connected to MongoDB')
print(f'Database: {db.name}')
"
```

### 2. Test Email OTP

```bash
# Start API
cd /Users/fadil369/rcm-haya/apps/api
python3 main.py

# Test email OTP request
curl -X POST "http://localhost:8000/auth/otp/request" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "email",
    "contact": "test@example.com",
    "purpose": "login"
  }'

# Check email inbox
```

### 3. Test Google OAuth

```bash
# Get authorization URL
curl -X GET "http://localhost:8000/auth/oauth/google/authorize?state=test123"

# Copy URL to browser, complete OAuth flow
# Should redirect to callback URL
```

### 4. Test Rate Limiting

```bash
# Try 6 login attempts (should block after 5)
for i in {1..6}; do
  curl -X POST "http://localhost:8000/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}'
  echo "Attempt $i"
done

# Should see "Too many login attempts" after 5th attempt
```

### 5. Test JWT Tokens

```bash
# Register user
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "full_name": "Test User",
    "method": "password"
  }'

# Login
ACCESS_TOKEN=$(curl -s -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "SecurePass123!"}' \
  | jq -r '.access_token')

# Test protected endpoint
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Deployment

### 1. Deploy Backend API

**Option A: Docker**

```bash
cd /Users/fadil369/rcm-haya/apps/api

# Build image
docker build -t rcm-haya-api .

# Run container
docker run -d \
  --name rcm-haya-api \
  --env-file .env.production \
  -p 8000:8000 \
  rcm-haya-api
```

**Option B: systemd Service**

```bash
sudo nano /etc/systemd/system/rcm-haya-api.service
```

```ini
[Unit]
Description=RCM-HAYA API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/rcm-haya/apps/api
EnvironmentFile=/var/www/rcm-haya/apps/api/.env.production
ExecStart=/usr/bin/python3 /var/www/rcm-haya/apps/api/main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable rcm-haya-api
sudo systemctl start rcm-haya-api
```

### 2. Deploy Frontend

```bash
cd /Users/fadil369/rcm-haya/apps/web

# Build
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next/static
```

### 3. Initialize Super Admin

```bash
# Call initialization endpoint (ONE TIME ONLY)
curl -X POST "https://yourdomain.com/api/admin/super-admin/initialize" \
  -H "Content-Type: application/json" \
  -H "X-Setup-Key: YOUR_SUPER_ADMIN_SETUP_KEY" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SuperSecurePass123!",
    "full_name": "Super Admin"
  }'

# IMMEDIATELY rotate SUPER_ADMIN_SETUP_KEY
NEW_KEY=$(openssl rand -hex 32)
echo "SUPER_ADMIN_SETUP_KEY=$NEW_KEY" >> .env.production
sudo systemctl restart rcm-haya-api
```

### 4. Verify Deployment

**Health Check:**
```bash
curl https://yourdomain.com/api/health
# Should return: {"status": "healthy"}
```

**Test Authentication:**
```bash
# Login as super admin
curl -X POST "https://yourdomain.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SuperSecurePass123!"
  }'

# Should return access_token and refresh_token
```

**Check Monitoring:**
```bash
# View logs
sudo journalctl -u rcm-haya-api -f

# Check database
mongo "mongodb+srv://..." --eval "db.users.countDocuments()"
```

---

## Post-Deployment Checklist

- [ ] All secrets generated and stored securely
- [ ] OAuth providers configured and tested
- [ ] Email OTP working (check inbox)
- [ ] Database indexes created automatically
- [ ] CORS configured for production domains only
- [ ] DEBUG_MODE set to false
- [ ] Rate limiting tested and working
- [ ] Super admin created successfully
- [ ] SUPER_ADMIN_SETUP_KEY rotated after use
- [ ] SSL certificate valid and auto-renewing
- [ ] Monitoring/alerting configured (optional)
- [ ] Backup strategy in place (optional)

---

## Troubleshooting

### OAuth Not Working

**Problem:** "Redirect URI mismatch"
**Solution:** Ensure OAuth redirect URIs exactly match in:
1. OAuth provider settings (Google/GitHub)
2. `.env.production` file
3. Include `https://` protocol
4. Match domain exactly (with/without `www`)

### Email OTP Not Sending

**Problem:** Emails not received
**Solution:**
1. Check spam folder
2. Verify SMTP credentials
3. Check SMTP port (587 for TLS, 465 for SSL)
4. For Gmail: Ensure App Password is used (not account password)
5. For SendGrid: Verify sender identity
6. Check API logs for errors

### JWT Token Invalid

**Problem:** "Token signature invalid"
**Solution:**
1. Ensure JWT_SECRET_KEY is exactly 64 characters
2. Ensure secret hasn't changed (invalidates all tokens)
3. Check token expiration (access: 15 min, refresh: 7 days)
4. Verify Authorization header format: `Bearer <token>`

### Rate Limiting Too Aggressive

**Problem:** Users getting blocked frequently
**Solution:** Adjust limits in `.env.production`:
```bash
MAX_LOGIN_ATTEMPTS=10          # Increase from 5
LOGIN_RATE_LIMIT_MINUTES=30    # Increase from 15
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/Fadil369/brainsait-rcm/issues
- Documentation: `/DEPLOYMENT_PREPARATION.md`
- API Docs: https://yourdomain.com/api/docs

---

**Last Updated:** January 2025
**Version:** 1.0.0
