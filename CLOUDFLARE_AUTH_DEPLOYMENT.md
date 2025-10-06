# Cloudflare-Native Authentication Deployment Guide

This guide shows how to deploy the RCM-HAYA authentication system using your existing Cloudflare infrastructure.

## 🎯 Architecture Overview

### Cloudflare Resources Utilized

1. **D1 Database** - Primary storage for auth data
   - Users, sessions, OAuth providers
   - Refresh tokens, OTP verifications
   - Auth events and audit logs

2. **KV Namespaces** - High-speed caching and sessions
   - `SESSIONS` - Active user sessions
   - `CACHE` - Rate limiting counters, temporary data
   - `AUDIT_LOGS_KV` - Fast audit log writes

3. **R2 Buckets** - Long-term storage and backups
   - `DOCUMENTS` - User documents, OAuth tokens
   - `BACKUPS` - Daily database backups

4. **Hyperdrive** - MongoDB connection pooling
   - Optional: Connect to MongoDB Atlas for analytics
   - Faster queries with connection pooling

5. **Durable Objects** - Real-time features (optional)
   - Session management
   - Rate limiting with atomic counters
   - WebSocket connections

---

## 📋 Prerequisites

**Already Configured:**
- ✅ Cloudflare account
- ✅ D1 database: `brainsait-audit-logs`
- ✅ KV namespaces: `SESSIONS`, `CACHE`, `AUDIT_LOGS_KV`
- ✅ R2 buckets: `brainsait-identity-documents`, `brainsait-backups-staging`

**Need to Set Up:**
- [ ] Hyperdrive for MongoDB (optional, for analytics)
- [ ] Secrets in Cloudflare (JWT_SECRET, OAuth credentials)
- [ ] OAuth redirect URIs updated for Cloudflare domain

---

## 🔧 Step 1: Configure Hyperdrive (Optional)

Hyperdrive accelerates MongoDB connections from Cloudflare Workers.

### Create Hyperdrive Configuration

```bash
# Create Hyperdrive configuration
wrangler hyperdrive create brainsait-mongodb \
  --connection-string="mongodb+srv://user:password@cluster.mongodb.net/rcm-haya-prod"

# Output will show:
# Created Hyperdrive ID: abc123def456...
```

### Add to wrangler.toml

```toml
[[hyperdrive]]
binding = "MONGODB"
id = "abc123def456..."  # From previous command
```

**Use Cases:**
- Analytics queries (user stats, login history)
- Backup/restore operations
- Data migration
- Reporting

**NOT Needed For:**
- Authentication (use D1 instead - faster on Cloudflare)
- Session management (use KV - edge caching)
- Rate limiting (use KV - atomic operations)

---

## 🔧 Step 2: Create D1 Schema for Authentication

### Create New D1 Databases

```bash
# Create main auth database
wrangler d1 create brainsait-auth

# Create rate limiting database (separate for isolation)
wrangler d1 create brainsait-rate-limits
```

### Update wrangler.toml

```toml
# Add to apps/api-worker/wrangler.toml

[[d1_databases]]
binding = "AUTH_DB"
database_name = "brainsait-auth"
database_id = "YOUR_AUTH_DB_ID"  # From create command

[[d1_databases]]
binding = "RATE_LIMITS_DB"
database_name = "brainsait-rate-limits"
database_id = "YOUR_RATE_LIMITS_DB_ID"  # From create command
```

### Create Migration Files

**File: `migrations/0003_auth_schema.sql`**

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_email_verified INTEGER DEFAULT 0,
  is_phone_verified INTEGER DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- OAuth providers
CREATE TABLE IF NOT EXISTS oauth_providers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_user_id ON oauth_providers(user_id);
CREATE INDEX idx_oauth_provider ON oauth_providers(provider);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- OTP verifications (short-lived, cleaned by cron)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id TEXT PRIMARY KEY,
  method TEXT NOT NULL,
  contact TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_contact ON otp_verifications(contact);
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);

-- Auth events (audit log)
CREATE TABLE IF NOT EXISTS auth_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  method TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER NOT NULL,
  error_message TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_events_user_id ON auth_events(user_id);
CREATE INDEX idx_auth_events_type ON auth_events(event_type);
CREATE INDEX idx_auth_events_created ON auth_events(created_at);
```

**File: `migrations/0004_rate_limits_schema.sql`**

```sql
-- Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(identifier, action, window_start)
);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX idx_rate_limits_action ON rate_limits(action);
CREATE INDEX idx_rate_limits_window_end ON rate_limits(window_end);
```

### Run Migrations

```bash
# Apply auth schema
wrangler d1 execute brainsait-auth \
  --file=migrations/0003_auth_schema.sql \
  --remote

# Apply rate limits schema
wrangler d1 execute brainsait-rate-limits \
  --file=migrations/0004_rate_limits_schema.sql \
  --remote
```

---

## 🔧 Step 3: Configure Cloudflare Secrets

Secrets are encrypted environment variables that aren't stored in wrangler.toml.

### Set Required Secrets

```bash
cd apps/api-worker

# Generate and set JWT secret
JWT_SECRET=$(openssl rand -hex 32)
wrangler secret put JWT_SECRET
# Paste: 3b7faf0c2e1050fd82b047c8c2470af383430050a14cd5f56aa9e8a2f1b3adf0

# Set super admin setup key
wrangler secret put SUPER_ADMIN_SETUP_KEY
# Paste: 48d2469a39705a3aebf07dfc37cfa694299444302439f94fe18fb20c704e2203

# Google OAuth
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# GitHub OAuth
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# Email OTP (SendGrid recommended)
wrangler secret put SENDGRID_API_KEY

# Optional: SMS/WhatsApp OTP
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER
```

### View Configured Secrets

```bash
wrangler secret list
```

---

## 🔧 Step 4: Update wrangler.toml

**File: `apps/api-worker/wrangler.toml`**

```toml
name = "brainsait-rcm-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# ============================================================================
# D1 DATABASES
# ============================================================================

# Existing audit logs database
[[d1_databases]]
binding = "DB"
database_name = "brainsait-audit-logs"
database_id = "07fdaaaa-31bc-4565-852d-db904dd2ba01"

# NEW: Authentication database
[[d1_databases]]
binding = "AUTH_DB"
database_name = "brainsait-auth"
database_id = "YOUR_AUTH_DB_ID"  # Replace after creation

# NEW: Rate limiting database
[[d1_databases]]
binding = "RATE_LIMITS_DB"
database_name = "brainsait-rate-limits"
database_id = "YOUR_RATE_LIMITS_DB_ID"  # Replace after creation

# ============================================================================
# KV NAMESPACES
# ============================================================================

# Session storage (high-speed, edge-cached)
[[kv_namespaces]]
binding = "SESSIONS"
id = "7b6626f2032d4be1ba7a0b4e6f21b4a0"

# General cache (rate limits, temp data)
[[kv_namespaces]]
binding = "CACHE"
id = "31e992ccf15f46778a1e0b974aea62ba"

# Audit logs (fast writes)
[[kv_namespaces]]
binding = "AUDIT_LOGS_KV"
id = "ffb76ea061414b52af9e88675d389dca"

# NEW: OTP storage (TTL-based)
[[kv_namespaces]]
binding = "OTP_STORAGE"
id = "YOUR_OTP_KV_ID"  # Create: wrangler kv:namespace create "OTP_STORAGE"

# ============================================================================
# R2 BUCKETS
# ============================================================================

# Document storage
[[r2_buckets]]
binding = "DOCUMENTS"
bucket_name = "brainsait-identity-documents"

# Database backups
[[r2_buckets]]
binding = "BACKUPS"
bucket_name = "brainsait-backups-staging"

# ============================================================================
# HYPERDRIVE (Optional - MongoDB connection pooling)
# ============================================================================

# [[hyperdrive]]
# binding = "MONGODB"
# id = "YOUR_HYPERDRIVE_ID"  # Create: wrangler hyperdrive create

# ============================================================================
# DURABLE OBJECTS (Optional - Real-time features)
# ============================================================================

# [[durable_objects.bindings]]
# name = "RATE_LIMITER"
# class_name = "RateLimiter"
# script_name = "brainsait-rcm-api"

# [[migrations]]
# tag = "v1"
# new_classes = ["RateLimiter"]

# ============================================================================
# ENVIRONMENT VARIABLES
# ============================================================================

[vars]
ENVIRONMENT = "production"

# JWT Configuration
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = "15"
REFRESH_TOKEN_EXPIRE_DAYS = "7"

# Rate Limiting
MAX_LOGIN_ATTEMPTS = "5"
LOGIN_RATE_LIMIT_MINUTES = "15"
MAX_OTP_REQUESTS_PER_MINUTE = "1"
MAX_OTP_REQUESTS_PER_HOUR = "5"
MAX_REGISTRATIONS_PER_HOUR = "3"

# OTP Configuration
EMAIL_OTP_EXPIRE_MINUTES = "10"
EMAIL_OTP_LENGTH = "6"
SMS_OTP_EXPIRE_MINUTES = "10"
SMS_OTP_LENGTH = "6"

# Security
BCRYPT_ROUNDS = "12"

# OAuth Redirect URIs
GOOGLE_REDIRECT_URI = "https://rcm.brainsait.com/api/auth/oauth/google/callback"
GITHUB_REDIRECT_URI = "https://rcm.brainsait.com/api/auth/oauth/github/callback"

# Email Configuration
SMTP_FROM_EMAIL = "noreply@brainsait.com"
SMTP_FROM_NAME = "BrainSAIT RCM"

# Feature Flags
ENABLE_PASSWORD_AUTH = "true"
ENABLE_GOOGLE_OAUTH = "true"
ENABLE_GITHUB_OAUTH = "true"
ENABLE_EMAIL_OTP = "true"
ENABLE_SMS_OTP = "false"
ENABLE_WHATSAPP_OTP = "false"

# Application URLs
API_URL = "https://rcm.brainsait.com/api"
FRONTEND_URL = "https://rcm.brainsait.com"

# ============================================================================
# SECRETS (Set with: wrangler secret put <NAME>)
# ============================================================================
# JWT_SECRET                    - 64-char hex string
# SUPER_ADMIN_SETUP_KEY         - 64-char hex string
# GOOGLE_CLIENT_ID              - Google OAuth client ID
# GOOGLE_CLIENT_SECRET          - Google OAuth client secret
# GITHUB_CLIENT_ID              - GitHub OAuth client ID
# GITHUB_CLIENT_SECRET          - GitHub OAuth client secret
# SENDGRID_API_KEY              - SendGrid API key (for email)
# TWILIO_ACCOUNT_SID            - Twilio account SID (optional)
# TWILIO_AUTH_TOKEN             - Twilio auth token (optional)
# TWILIO_PHONE_NUMBER           - Twilio phone number (optional)

# ============================================================================
# LIMITS
# ============================================================================

[limits]
cpu_ms = 50

# ============================================================================
# DEVELOPMENT
# ============================================================================

[dev]
port = 8787
local_protocol = "http"

```

---

## 🔧 Step 5: Storage Strategy

### When to Use Each Cloudflare Service

| Use Case | Service | Why |
|----------|---------|-----|
| User accounts | D1 (AUTH_DB) | Relational data, ACID compliance |
| Active sessions | KV (SESSIONS) | Edge-cached, sub-ms reads |
| Rate limit counters | KV (CACHE) | Atomic increments, TTL |
| OTP codes | KV (OTP_STORAGE) | TTL expiration, fast reads |
| Refresh tokens | D1 (AUTH_DB) | Need to query by user_id |
| OAuth tokens | D1 (AUTH_DB) | Need to update atomically |
| Auth events | D1 (AUTH_DB) + KV (AUDIT_LOGS_KV) | D1 for queries, KV for fast writes |
| Daily backups | R2 (BACKUPS) | Long-term storage, cost-effective |
| User uploads | R2 (DOCUMENTS) | Large files, presigned URLs |
| Analytics queries | Hyperdrive (MONGODB) | Complex aggregations, reporting |

### Performance Characteristics

**D1 (SQLite at the edge):**
- ✅ Reads: 1-5ms (edge cache)
- ✅ Writes: 5-20ms
- ✅ ACID transactions
- ⚠️ 100k reads/day free, then $0.001/1k reads
- ⚠️ 100k writes/day free, then $1/1M writes

**KV (Key-Value store):**
- ✅ Reads: <1ms (globally distributed)
- ⚠️ Writes: 1-60 seconds to propagate globally
- ✅ Eventual consistency
- ✅ 10M reads/month free
- ⚠️ Write: $0.50/1M writes

**R2 (Object storage):**
- ✅ No egress fees
- ✅ $0.015/GB/month storage
- ✅ Unlimited bandwidth
- ⚠️ Higher latency (50-200ms)

---

## 🔧 Step 6: Create Cloudflare Auth Module

I'll create TypeScript adapters that work with Cloudflare Workers instead of Python/FastAPI.

### Architecture

```
apps/api-worker/src/
├── lib/
│   ├── auth/
│   │   ├── storage/
│   │   │   ├── d1.ts           # D1 database operations
│   │   │   ├── kv.ts           # KV operations (sessions, OTP)
│   │   │   └── r2.ts           # R2 operations (backups)
│   │   ├── jwt.ts              # JWT token management
│   │   ├── password.ts         # Password hashing (bcrypt)
│   │   ├── otp.ts              # OTP generation/validation
│   │   ├── oauth.ts            # OAuth 2.0 flows
│   │   └── rate-limit.ts       # Rate limiting
│   └── audit.ts                # Existing audit logger
└── routes/
    └── auth.ts                 # Auth endpoints (update existing)
```

---

## 🔧 Step 7: OAuth Configuration for Cloudflare

### Update OAuth Redirect URIs

**Google OAuth:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Add authorized redirect URI:
   ```
   https://rcm.brainsait.com/api/auth/oauth/google/callback
   ```

**GitHub OAuth:**
1. Go to: https://github.com/settings/developers
2. Select your OAuth App
3. Update authorization callback URL:
   ```
   https://rcm.brainsait.com/api/auth/oauth/github/callback
   ```

---

## 🔧 Step 8: Deployment Workflow

### Local Development

```bash
cd apps/api-worker

# Install dependencies
npm install

# Run locally (uses local D1 replica)
npm run dev

# Test authentication endpoints
curl http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "full_name": "Test User",
    "method": "password"
  }'
```

### Deploy to Cloudflare

```bash
# Deploy to production
wrangler deploy

# Or deploy to staging first
wrangler deploy --env staging

# View logs
wrangler tail

# View metrics
wrangler analytics
```

### Cron Jobs for Cleanup

**Add to wrangler.toml:**

```toml
[triggers]
crons = ["0 2 * * *"]  # Daily at 2 AM UTC
```

**Add to `src/index.ts`:**

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Clean up expired OTPs
    await env.AUTH_DB.prepare(
      'DELETE FROM otp_verifications WHERE expires_at < ?'
    ).bind(new Date().toISOString()).run();

    // Clean up expired refresh tokens
    await env.AUTH_DB.prepare(
      'DELETE FROM refresh_tokens WHERE expires_at < ?'
    ).bind(new Date().toISOString()).run();

    // Clean up old auth events (90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    await env.AUTH_DB.prepare(
      'DELETE FROM auth_events WHERE created_at < ?'
    ).bind(ninetyDaysAgo.toISOString()).run();

    // Clean up old rate limits
    await env.RATE_LIMITS_DB.prepare(
      'DELETE FROM rate_limits WHERE window_end < ?'
    ).bind(new Date().toISOString()).run();

    console.log('Cleanup completed:', new Date().toISOString());
  },
};
```

---

## 📊 Cost Estimate (Monthly)

Based on 10,000 active users, 100,000 auth requests/month:

| Service | Usage | Cost |
|---------|-------|------|
| Workers | 1M requests | Free (included) |
| D1 | 500k reads, 100k writes | $0.60 |
| KV | 5M reads, 200k writes | $0.10 |
| R2 Storage | 10GB | $0.15 |
| Hyperdrive (optional) | 1M queries | $5.00 |
| **Total** | | **$5.85/month** |

**Free tier covers:**
- 100k requests/day
- 10M KV reads/month
- 100k D1 reads/day

---

## ✅ Deployment Checklist

- [ ] Create D1 databases (brainsait-auth, brainsait-rate-limits)
- [ ] Create KV namespace (OTP_STORAGE)
- [ ] Run D1 migrations
- [ ] Set all Cloudflare secrets (wrangler secret put)
- [ ] Update OAuth redirect URIs to Cloudflare domain
- [ ] Test locally with wrangler dev
- [ ] Deploy to Cloudflare Workers
- [ ] Initialize super admin account
- [ ] Rotate SUPER_ADMIN_SETUP_KEY
- [ ] Test all 5 authentication methods
- [ ] Set up cron job for cleanup
- [ ] Configure monitoring/alerts

---

## 🚀 Next Steps

1. **Create Cloudflare-compatible auth adapters** (TypeScript)
2. **Migrate auth routes** from Python to Hono/TypeScript
3. **Test locally** with wrangler dev
4. **Deploy** to Cloudflare Workers
5. **Verify** all authentication flows work

Would you like me to create the Cloudflare-native authentication TypeScript code now?
