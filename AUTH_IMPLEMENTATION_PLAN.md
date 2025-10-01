# 🔐 Multi-Method Authentication System - Implementation Guide

**Date:** October 1, 2025  
**Project:** BrainSAIT RCM Healthcare Claims Management System  
**Status:** Implementation In Progress

---

## 📋 Executive Summary

Complete overhaul of the authentication system implementing:
- ✅ Removal of all hardcoded/demo credentials
- ✅ Multi-method authentication (Google, GitHub, Email OTP, SMS OTP, WhatsApp OTP)
- ✅ Super admin system with dedicated onboarding
- ✅ Robust user management with RBAC
- ✅ Secure session management with JWT + refresh tokens
- ✅ Comprehensive audit logging
- ✅ OWASP security best practices

---

## 🏗️ System Architecture

### Authentication Methods
1. **OAuth Providers**
   - Google OAuth 2.0 (via Google Identity Platform)
   - GitHub OAuth

2. **OTP Methods**
   - Email OTP (6-digit code, 10-minute expiry)
   - SMS OTP (via Twilio)
   - WhatsApp OTP (via Twilio WhatsApp Business API)

3. **Traditional**
   - Email + Password (with bcrypt hashing)

### User Roles
- `SUPER_ADMIN` - Full system access, user management
- `ADMIN` - Organization administration
- `MANAGER` - Team management
- `ANALYST` - Read-only analytics
- `USER` - Standard user access

---

## 🗄️ Database Schema

### Collections

#### 1. `users`
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  username: String (unique, indexed, optional),
  phone: String (unique, indexed, optional),
  hashed_password: String (optional for OAuth users),
  full_name: String,
  role: String (enum),
  status: String (enum: active, suspended, deleted),
  email_verified: Boolean,
  phone_verified: Boolean,
  created_at: ISODate,
  updated_at: ISODate,
  last_login: ISODate,
  metadata: {
    registration_method: String,
    registration_ip: String,
    two_factor_enabled: Boolean
  }
}
```

#### 2. `oauth_providers`
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: users),
  provider: String (enum: google, github),
  provider_user_id: String (indexed),
  access_token: String (encrypted),
  refresh_token: String (encrypted),
  token_expiry: ISODate,
  profile_data: Object,
  created_at: ISODate,
  updated_at: ISODate
}
```

#### 3. `otp_verifications`
```javascript
{
  _id: ObjectId,
  identifier: String (email/phone, indexed),
  otp_code: String (hashed),
  otp_type: String (enum: email, sms, whatsapp),
  purpose: String (enum: registration, login, password_reset),
  attempts: Number,
  max_attempts: Number (default: 3),
  expires_at: ISODate,
  verified: Boolean,
  created_at: ISODate
}
```

#### 4. `refresh_tokens`
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: users),
  token_hash: String (indexed),
  device_info: {
    user_agent: String,
    ip_address: String,
    device_id: String
  },
  expires_at: ISODate,
  revoked: Boolean,
  created_at: ISODate
}
```

#### 5. `auth_events`
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: users, indexed),
  event_type: String (enum: login, logout, failed_login, register, password_reset, otp_sent),
  method: String (enum: password, google, github, email_otp, sms_otp, whatsapp_otp),
  success: Boolean,
  ip_address: String,
  user_agent: String,
  metadata: Object,
  created_at: ISODate (indexed)
}
```

#### 6. `rate_limits`
```javascript
{
  _id: ObjectId,
  identifier: String (ip/email/phone, indexed),
  endpoint: String,
  count: Number,
  window_start: ISODate,
  expires_at: ISODate (TTL index)
}
```

---

## 🔒 Security Measures

### 1. Password Security
- bcrypt hashing with salt rounds: 12
- Minimum 8 characters, mixed case, numbers, symbols
- No password storage for OAuth users

### 2. OTP Security
- 6-digit codes, cryptographically secure random
- 10-minute expiry window
- Max 3 verification attempts
- Codes hashed before storage
- Rate limiting: 1 OTP per minute per identifier

### 3. JWT Security
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry
- Refresh token rotation on use
- Device fingerprinting for refresh tokens
- Blacklist/revocation support

### 4. Rate Limiting
- Login: 5 attempts per 15 minutes per IP
- OTP request: 1 per minute, 5 per hour per identifier
- Registration: 3 per hour per IP
- Password reset: 3 per hour per email

### 5. Input Validation
- Email: RFC 5322 validation
- Phone: E.164 format
- Password: OWASP guidelines
- Sanitization of all user inputs

---

## 📡 API Endpoints

### Public Endpoints (No Auth Required)

#### Registration
```
POST /api/v1/auth/register
Body: {
  method: "email" | "phone",
  email?: string,
  phone?: string,
  full_name: string,
  password?: string
}
Response: {
  success: boolean,
  message: string,
  otp_required?: boolean
}
```

#### Login
```
POST /api/v1/auth/login
Body: {
  method: "password" | "email_otp" | "sms_otp" | "whatsapp_otp",
  identifier: string (email/phone),
  password?: string,
  otp?: string
}
Response: {
  access_token: string,
  refresh_token: string,
  user: object,
  expires_in: number
}
```

#### OAuth Initiation
```
GET /api/v1/auth/oauth/{provider}/authorize
Query: { redirect_uri: string }
Response: { authorization_url: string }
```

#### OAuth Callback
```
GET /api/v1/auth/oauth/{provider}/callback
Query: { code: string, state: string }
Response: {
  access_token: string,
  refresh_token: string,
  user: object
}
```

#### OTP Request
```
POST /api/v1/auth/otp/request
Body: {
  identifier: string (email/phone),
  method: "email" | "sms" | "whatsapp",
  purpose: "registration" | "login" | "password_reset"
}
Response: {
  success: boolean,
  message: string,
  expires_in: number
}
```

#### OTP Verification
```
POST /api/v1/auth/otp/verify
Body: {
  identifier: string,
  otp: string,
  purpose: string
}
Response: {
  verified: boolean,
  session_token?: string
}
```

#### Token Refresh
```
POST /api/v1/auth/refresh
Body: { refresh_token: string }
Response: {
  access_token: string,
  refresh_token: string,
  expires_in: number
}
```

### Protected Endpoints (Auth Required)

#### User Profile
```
GET /api/v1/auth/me
Headers: { Authorization: Bearer <token> }
Response: { user: object }
```

#### Logout
```
POST /api/v1/auth/logout
Headers: { Authorization: Bearer <token> }
Body: { refresh_token: string }
Response: { success: boolean }
```

#### Password Change
```
POST /api/v1/auth/password/change
Headers: { Authorization: Bearer <token> }
Body: {
  current_password: string,
  new_password: string
}
Response: { success: boolean }
```

### Super Admin Endpoints (Super Admin Only)

#### List Users
```
GET /api/v1/admin/users
Headers: { Authorization: Bearer <token> }
Query: {
  page: number,
  limit: number,
  role?: string,
  status?: string,
  search?: string
}
Response: {
  users: array,
  total: number,
  page: number,
  pages: number
}
```

#### Get User Details
```
GET /api/v1/admin/users/{user_id}
Headers: { Authorization: Bearer <token> }
Response: { user: object, auth_events: array }
```

#### Update User
```
PATCH /api/v1/admin/users/{user_id}
Headers: { Authorization: Bearer <token> }
Body: {
  role?: string,
  status?: string,
  email_verified?: boolean,
  phone_verified?: boolean
}
Response: { user: object }
```

#### Delete User
```
DELETE /api/v1/admin/users/{user_id}
Headers: { Authorization: Bearer <token> }
Response: { success: boolean }
```

#### View Audit Logs
```
GET /api/v1/admin/audit-logs
Headers: { Authorization: Bearer <token> }
Query: {
  user_id?: string,
  event_type?: string,
  start_date?: string,
  end_date?: string,
  page: number,
  limit: number
}
Response: {
  events: array,
  total: number
}
```

---

## 🔐 Super Admin Onboarding

### Initial Setup (One-Time)
```
POST /api/v1/auth/super-admin/initialize
Body: {
  secret_key: string (from environment),
  email: string,
  full_name: string,
  password: string,
  phone: string
}
Response: {
  success: boolean,
  user: object,
  access_token: string
}
```

**Environment Variable Required:**
```bash
SUPER_ADMIN_SETUP_KEY=<secure-random-key>
```

**Security:**
- Only works if no super admin exists
- Requires secret key from environment
- One-time use only
- Endpoint disabled after first super admin creation

---

## 🛡️ OAuth Implementation

### Google OAuth Setup
1. **Google Cloud Console:**
   - Create project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs

2. **Environment Variables:**
```bash
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/auth/oauth/google/callback
```

### GitHub OAuth Setup
1. **GitHub Developer Settings:**
   - Register new OAuth App
   - Set callback URL

2. **Environment Variables:**
```bash
GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
GITHUB_REDIRECT_URI=https://yourdomain.com/api/v1/auth/oauth/github/callback
```

---

## 📱 OTP Providers Setup

### Twilio (SMS + WhatsApp)
```bash
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_PHONE_NUMBER=<your-twilio-phone>
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Email OTP (SMTP)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASSWORD=<your-app-password>
SMTP_FROM=noreply@brainsait.com
```

---

## 🧪 Testing Requirements

### Unit Tests
- Password hashing/verification
- JWT token generation/validation
- OTP generation/verification
- Rate limiting logic
- Input validation

### Integration Tests
- Full registration flow (all methods)
- Login flow (all methods)
- OAuth flow (Google, GitHub)
- OTP flow (Email, SMS, WhatsApp)
- Token refresh flow
- Super admin user management

### Security Tests
- SQL injection attempts
- XSS attempts
- CSRF protection
- Rate limit enforcement
- Token expiry enforcement
- Invalid OTP handling
- Brute force protection

---

## 📊 Monitoring & Logging

### Metrics to Track
- Login attempts (success/failure)
- Registration counts by method
- OTP delivery success rate
- Token refresh frequency
- Failed auth events
- Rate limit violations

### Audit Events
- All login attempts
- Password changes
- Role changes (admin)
- User status changes (admin)
- OTP requests/verifications
- OAuth connections

---

## 🚀 Deployment Checklist

### Environment Variables
```bash
# Database
DATABASE_URL=mongodb+srv://...

# JWT
JWT_SECRET=<random-256-bit-key>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Super Admin Setup
SUPER_ADMIN_SETUP_KEY=<secure-random-key>

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=

# OTP Providers
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Encryption
ENCRYPTION_KEY=<32-byte-key>

# Security
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_ENABLED=true
```

### Database Indexes
```javascript
// users collection
db.users.createIndex({ email: 1 }, { unique: true, sparse: true })
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true })
db.users.createIndex({ username: 1 }, { unique: true, sparse: true })
db.users.createIndex({ status: 1, role: 1 })

// oauth_providers collection
db.oauth_providers.createIndex({ user_id: 1, provider: 1 })
db.oauth_providers.createIndex({ provider_user_id: 1, provider: 1 }, { unique: true })

// otp_verifications collection
db.otp_verifications.createIndex({ identifier: 1, purpose: 1 })
db.otp_verifications.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

// refresh_tokens collection
db.refresh_tokens.createIndex({ token_hash: 1 }, { unique: true })
db.refresh_tokens.createIndex({ user_id: 1 })
db.refresh_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

// auth_events collection
db.auth_events.createIndex({ user_id: 1, created_at: -1 })
db.auth_events.createIndex({ event_type: 1, created_at: -1 })
db.auth_events.createIndex({ created_at: -1 })

// rate_limits collection
db.rate_limits.createIndex({ identifier: 1, endpoint: 1 })
db.rate_limits.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
```

---

## 📚 Implementation Files

### Backend (Python/FastAPI)
1. `apps/api/auth/` - New auth module
   - `__init__.py`
   - `models.py` - Pydantic models
   - `schemas.py` - Database schemas
   - `jwt_handler.py` - JWT operations
   - `oauth_providers.py` - OAuth implementations
   - `otp_providers.py` - OTP implementations
   - `password.py` - Password utilities
   - `rate_limiter.py` - Rate limiting
   - `dependencies.py` - FastAPI dependencies
   - `router.py` - API routes

2. `apps/api/admin/` - Admin module
   - `__init__.py`
   - `router.py` - Admin routes
   - `services.py` - User management logic

3. `apps/api/utils/` - Shared utilities
   - `encryption.py` - Field encryption
   - `validators.py` - Input validation

### Frontend (Next.js/React)
1. `apps/web/src/app/auth/` - Auth pages
   - `login/page.tsx`
   - `register/page.tsx`
   - `verify-otp/page.tsx`
   - `oauth-callback/page.tsx`

2. `apps/web/src/components/auth/` - Auth components
   - `LoginForm.tsx`
   - `RegisterForm.tsx`
   - `OAuthButtons.tsx`
   - `OTPInput.tsx`
   - `PhoneInput.tsx`

3. `apps/web/src/lib/auth/` - Auth utilities
   - `authClient.ts` - API client
   - `authContext.tsx` - React context
   - `authHooks.ts` - Custom hooks

4. `apps/web/src/app/admin/` - Admin panel
   - `users/page.tsx` - User management
   - `audit-logs/page.tsx` - Audit viewer

---

## 🔄 Migration Strategy

### Phase 1: Backend Setup (Week 1)
1. Create new auth module structure
2. Implement database models and indexes
3. Set up JWT handler with refresh tokens
4. Implement password authentication
5. Add rate limiting middleware

### Phase 2: OTP Integration (Week 1-2)
1. Email OTP implementation
2. SMS OTP via Twilio
3. WhatsApp OTP via Twilio
4. OTP verification flows

### Phase 3: OAuth Integration (Week 2)
1. Google OAuth implementation
2. GitHub OAuth implementation
3. Provider account linking

### Phase 4: Super Admin (Week 2)
1. Super admin initialization endpoint
2. User management APIs
3. Audit log viewer API

### Phase 5: Frontend (Week 3)
1. Login/register pages
2. OAuth integration UI
3. OTP input components
4. Admin panel UI

### Phase 6: Testing & Security (Week 3-4)
1. Unit tests
2. Integration tests
3. Security audit
4. Load testing

### Phase 7: Deployment (Week 4)
1. Environment setup
2. Database migration
3. Super admin onboarding
4. Rollout to production

---

**Created by:** GitHub Copilot  
**Date:** October 1, 2025  
**Status:** Ready for Implementation
