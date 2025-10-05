# 🔒 BrainSAIT RCM - Security Best Practices Guide

**Last Updated:** December 2024  
**Version:** 1.0  
**Status:** Production Ready

## 📋 Table of Contents
1. [Security Vulnerabilities Fixed](#security-vulnerabilities-fixed)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Security](#api-security)
4. [Data Protection](#data-protection)
5. [Rate Limiting](#rate-limiting)
6. [Input Validation](#input-validation)
7. [Secrets Management](#secrets-management)
8. [Monitoring & Logging](#monitoring--logging)
9. [Deployment Security](#deployment-security)
10. [Compliance (HIPAA)](#compliance-hipaa)

---

## 🛡️ Security Vulnerabilities Fixed

### NPM Dependencies (All Resolved ✅)
- **pino**: Updated from 8.17.0 to 10.0.0
  - Fixed: Prototype pollution vulnerability (GHSA-ffrw-9mx8-89p8)
  - Impact: Medium severity, could allow attackers to modify object prototypes
  
- **wrangler**: Updated from 3.78.0 to 4.42.0
  - Fixed: esbuild development server vulnerability (GHSA-67mh-4wv8-2f99)
  - Impact: Moderate severity, could allow unauthorized requests to dev server

- **vitest**: Updated from 1.2.0 to 3.2.4
  - Fixed: vite/esbuild vulnerability chain
  - Impact: Moderate severity, development-only exposure

### Python Dependencies
- All services now use version ranges (>=) instead of exact pins
- **scikit-learn**: Updated to 1.5.0+ (from 1.4.0)
- **twilio**: Updated to 8.11.1+ (from 8.11.0)
- Recommended: Run `pip install --upgrade` regularly

---

## 🔐 Authentication & Authorization

### JWT Token Security
```python
# Configuration (apps/api/.env.template)
JWT_SECRET_KEY=<at-least-32-random-characters>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**Best Practices:**
- Generate JWT secret: `openssl rand -hex 32`
- Rotate JWT_SECRET_KEY every 90 days
- Use short-lived access tokens (15 minutes)
- Implement token refresh mechanism
- Never log JWT tokens

### Multi-Factor Authentication
Supported methods:
- ✅ Email OTP (SMTP)
- ✅ SMS OTP (Twilio)
- ✅ WhatsApp OTP (Twilio)
- ✅ OAuth 2.0 (Google, GitHub)

### Password Security
```python
# Using bcrypt with proper salt rounds
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

**Requirements:**
- Minimum 8 characters
- At least one uppercase, lowercase, number, special character
- Passwords hashed with bcrypt (10 rounds)
- Never store plain-text passwords

---

## 🔒 API Security

### Security Middleware
The platform implements comprehensive security middleware:

```python
# apps/api/middleware.py
from middleware import SecurityMiddleware

app.add_middleware(
    SecurityMiddleware,
    rate_limit=100,      # Requests per minute
    rate_window=60       # Time window in seconds
)
```

**Features:**
- ✅ Content-Type validation (prevents MIME confusion attacks)
- ✅ Request size limits (10MB max, prevents DoS)
- ✅ Rate limiting (IP-based)
- ✅ Security headers (X-Content-Type-Options, X-Frame-Options, HSTS)

### CORS Configuration
```python
# Strict CORS policy
ALLOWED_ORIGINS=https://app.brainsait.com,https://api.brainsait.com
ALLOW_CREDENTIALS=true

# ⚠️ NEVER use wildcard (*) with credentials enabled
```

### HTTPS/TLS
- **Production:** HTTPS required (enforced via Strict-Transport-Security header)
- **MongoDB:** TLS encryption enabled
- **API Gateway:** SSL termination at ingress/load balancer

---

## 📊 Rate Limiting

### Configuration
```bash
# Environment variables
RATE_LIMIT=100      # Requests per window
RATE_WINDOW=60      # Window in seconds (1 minute)
```

### Rate Limit Tiers
| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Public (unauthenticated) | 20 req | 1 min |
| Authenticated | 100 req | 1 min |
| Admin | 200 req | 1 min |

### Implementation
```python
# IP-based rate limiting
# Uses X-Forwarded-For header for proxied requests
# Stores in-memory (use Redis for production multi-instance)
```

**Recommendation for Production:**
- Use Redis for distributed rate limiting
- Implement sliding window algorithm
- Add rate limit response headers:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1640000000
  ```

---

## ✅ Input Validation

### Pydantic Models
All API inputs use Pydantic for validation:

```python
from pydantic import BaseModel, Field, field_validator

class RejectionRecord(BaseModel):
    tpa_name: str
    billed_amount: Dict[str, float]
    
    @field_validator('billed_amount')
    @classmethod
    def ensure_amount_breakdown(cls, value):
        required_keys = {"net", "vat", "total"}
        if required_keys - set(value.keys()):
            raise ValueError("Missing monetary breakdown fields")
        return value
```

### SQL/NoSQL Injection Prevention
```python
# ✅ SAFE: Parameterized queries
db.rejections.find({"tpa_name": user_input})

# ❌ UNSAFE: String concatenation
query = f"SELECT * FROM users WHERE id = {user_id}"  # DON'T DO THIS
```

### File Upload Security
```python
# Validate file types
ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.xlsx'}

# Scan uploaded files
# Limit file size: 10MB max
# Store outside web root
# Use content-type validation
```

---

## 🔑 Secrets Management

### Environment Variables
**DO:**
- ✅ Store secrets in `.env` file (git-ignored)
- ✅ Use different secrets per environment (dev/staging/prod)
- ✅ Rotate secrets regularly (90 days)
- ✅ Use secret management services (AWS Secrets Manager, Azure Key Vault)

**DON'T:**
- ❌ Commit `.env` to version control
- ❌ Hardcode secrets in source code
- ❌ Share secrets via email/chat
- ❌ Reuse secrets across environments

### Secret Rotation Checklist
```bash
# Every 90 days:
1. Generate new JWT_SECRET_KEY
   openssl rand -hex 32

2. Update database passwords
3. Rotate API keys (NPHIES, external services)
4. Update OAuth credentials if changed
5. Regenerate encryption keys
6. Document rotation in security log
```

---

## 📝 Monitoring & Logging

### Audit Logging
Every sensitive operation is logged:

```python
# Audit log structure
{
    "action": "rejection_created",
    "user_id": "user-123",
    "timestamp": "2024-12-10T10:30:00Z",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "resource_id": "rejection-456",
    "changes": {...}
}
```

**Logged Actions:**
- Authentication attempts (success/failure)
- Data access (read/write/delete)
- Permission changes
- Configuration updates
- API key usage

### Security Monitoring Alerts
```yaml
# Set up alerts for:
- Failed login attempts > 5 in 10 minutes
- Rate limit violations > 10 per hour
- Unauthorized access attempts
- Large data exports (> 1000 records)
- Multiple 4xx/5xx errors
- Certificate expiration (30 days before)
```

### Log Retention
- **Audit logs:** 7 years (HIPAA requirement)
- **Application logs:** 90 days
- **Access logs:** 1 year
- **Error logs:** 1 year

---

## 🚀 Deployment Security

### Docker Security
```dockerfile
# Use non-root user
FROM python:3.11-slim
RUN useradd -m -u 1000 appuser
USER appuser

# Scan images for vulnerabilities
docker scan brainsait/api:latest

# Use specific versions, not 'latest'
FROM python:3.11.7-slim
```

### Kubernetes Security
```yaml
# Pod Security Context
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL

# Network Policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: brainsait-api
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: nginx-ingress
```

### Infrastructure Security Checklist
- [ ] Enable firewall (allow only ports 80, 443)
- [ ] Configure SSL/TLS certificates (Let's Encrypt)
- [ ] Set up VPN for database access
- [ ] Enable DDoS protection (Cloudflare)
- [ ] Regular security patches (automated)
- [ ] Backup encryption
- [ ] Disaster recovery plan

---

## 🏥 Compliance (HIPAA)

### Protected Health Information (PHI)
**What is PHI:**
- Patient name, address, phone
- Medical record numbers
- Insurance policy numbers
- Claim details

**Protection Measures:**
- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (TLS 1.2+)
- ✅ Access control (role-based)
- ✅ Audit logging (all PHI access)
- ✅ Data minimization (only necessary fields)

### HIPAA Audit Log Requirements
```python
# Required fields for PHI access logs
{
    "timestamp": "ISO 8601 format",
    "user_id": "Who accessed",
    "action": "What was done (read/write/delete)",
    "resource_type": "Type of PHI (patient/claim)",
    "resource_id": "Specific record ID",
    "ip_address": "Source IP",
    "success": true/false,
    "reason": "Why access was needed"
}
```

### Business Associate Agreement (BAA)
Required for:
- ✅ Cloud hosting providers (AWS, Azure, GCP)
- ✅ Database services (MongoDB Atlas)
- ✅ Email services (SendGrid, Mailgun)
- ✅ SMS providers (Twilio)
- ✅ Analytics platforms

### Data Breach Response Plan
1. **Detection:** Automated alerts for unusual activity
2. **Containment:** Immediately revoke compromised credentials
3. **Assessment:** Determine scope of breach (which PHI affected)
4. **Notification:** Notify affected individuals within 60 days
5. **Reporting:** Report to HHS if > 500 individuals affected
6. **Remediation:** Fix vulnerabilities, update security measures

---

## 📋 Security Checklist

### Daily
- [ ] Review authentication failures
- [ ] Check rate limit violations
- [ ] Monitor error rates

### Weekly
- [ ] Review audit logs for anomalies
- [ ] Check security alerts
- [ ] Verify backups completed successfully

### Monthly
- [ ] Update dependencies (`npm audit`, `pip-audit`)
- [ ] Review user access permissions
- [ ] Test disaster recovery process
- [ ] Security training for team

### Quarterly
- [ ] Rotate secrets (JWT, API keys)
- [ ] Penetration testing
- [ ] Security audit (internal)
- [ ] Update security documentation

### Annually
- [ ] Third-party security audit
- [ ] HIPAA compliance review
- [ ] Business continuity test
- [ ] Update incident response plan

---

## 🆘 Incident Response

### Security Incident Classifications
| Severity | Definition | Response Time |
|----------|-----------|---------------|
| **P0 - Critical** | Active breach, data exfiltration | Immediate (< 1 hour) |
| **P1 - High** | Vulnerability actively exploited | 4 hours |
| **P2 - Medium** | Vulnerability discovered, no active exploit | 24 hours |
| **P3 - Low** | Security concern, low risk | 7 days |

### Contact Information
```
Security Team: security@brainsait.com
On-Call: +966-XXX-XXXX-XXX
PGP Key: [Public key for encrypted communication]
```

---

## 📚 Additional Resources

### Tools
- **Static Analysis:** Bandit (Python), ESLint (TypeScript)
- **Dependency Scanning:** npm audit, pip-audit, Snyk
- **Secret Scanning:** git-secrets, truffleHog
- **Container Scanning:** Trivy, Clair
- **Penetration Testing:** OWASP ZAP, Burp Suite

### Standards & Frameworks
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/

### Training
- OWASP Secure Coding Practices
- SANS Security Awareness
- HIPAA Compliance Training

---

## ✅ Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial security best practices guide |
| | | - Fixed all npm vulnerabilities |
| | | - Added security middleware |
| | | - Implemented rate limiting |
| | | - Updated Python dependencies |

---

**Note:** This document should be reviewed and updated quarterly. Security is an ongoing process, not a one-time effort.

For questions or to report security issues: **security@brainsait.com**
