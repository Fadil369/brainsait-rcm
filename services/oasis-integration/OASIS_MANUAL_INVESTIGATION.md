# OASIS+ Manual Investigation Required

## Issue Summary

**Date:** October 5, 2025  
**Status:** ⚠️ OASIS+ System Error - Automated Discovery Failed

The automated Playwright discovery script successfully:
- ✅ Bypassed SSL certificate warnings (Kaspersky)
- ✅ Reached the OASIS+ login page at `https://128.1.1.185/prod/faces/Login.jsf`
- ❌ Encountered HTTP 500 Internal Server Error

## Error Details

```
Title: "Error 500--Internal Server Error"
URL: https://128.1.1.185/prod/faces/Login.jsf
Forms Found: 0
Session ID: jsessionid=NPm0HMqSHRa1Q_jadptXgGPa4FZ7iQiICAPucy2gAYcrR-KpspQP!1642476539
```

## Screenshots Captured

- `01-login-page-1759663414967.png` - SSL warning bypass
- `error-1759663417030.png` - HTTP 500 error page

## Possible Causes

1. **Server-Side Error**: OASIS+ application server may be down or misconfigured
2. **Incorrect URL**: The login URL might have changed or require different parameters
3. **Network Issues**: Internal network routing or firewall blocking automated access
4. **Oracle ADF Framework**: Page may require specific headers, cookies, or session state
5. **Browser Detection**: Server may be blocking automated browser access
6. **Maintenance Mode**: System might be under maintenance

## Manual Investigation Checklist

### 1. Verify System Access

- [ ] Open browser manually to: `http://128.1.1.185/prod/faces/Home`
- [ ] Document the exact URL you land on (may redirect)
- [ ] Check if SSL warning appears and bypass it
- [ ] Verify if login page loads correctly (no HTTP 500 error)

### 2. Document Login Page Structure

If the page loads correctly:

- [ ] Take screenshot of login page
- [ ] Inspect HTML with DevTools (F12)
- [ ] Identify login form structure:
  - Form element: `<form id="???" action="???" method="???">`
  - Username field: `<input id="???" name="???" type="???">`
  - Password field: `<input id="???" name="???" type="???">`
  - Submit button: `<button id="???" type="???">`
- [ ] Check if fields are inside Oracle ADF components (`<af:inputText>`, etc.)
- [ ] Document any JavaScript frameworks used (Oracle ADF, JSF, Primefaces)

### 3. Test Login Process

- [ ] Enter credentials: Username `U29958`, Password `U29958`
- [ ] Click login button
- [ ] Observe what happens:
  - Successful login → Home page URL?
  - Error message → What does it say?
  - Redirect → Where does it go?

### 4. Capture Network Traffic

Using Chrome/Edge DevTools:

1. Open DevTools (F12) → **Network tab**
2. Enable **Preserve log**
3. Clear network log
4. Perform login
5. Document:
   - **Login POST request**:
     - URL: `???`
     - Method: `POST` or `GET`?
     - Form data: `???`
   - **Response**:
     - Status code: `???`
     - Headers: Look for `Set-Cookie`, `Location`
     - Body: Success/error message?

### 5. Examine Session Management

After successful login:

- [ ] Open DevTools → **Application tab** → **Cookies**
- [ ] Document cookies:
  - `JSESSIONID` → Value: `???`
  - Other cookies → Names and values
- [ ] Check **Local Storage** and **Session Storage**
- [ ] Note if Bearer token is used (check Network → Headers)

### 6. Navigate to Claim Submission

Once logged in:

- [ ] Look for "New Claim", "Submit Claim", or "Claims" menu item
- [ ] Click it and document:
  - URL: `???`
  - Page title: `???`
  - Main sections visible

### 7. Document Claim Form Fields

If you reach the claim submission form:

- [ ] Screenshot the entire form
- [ ] List ALL fields:
  - Patient National ID: Field name `???`, Type `???`, Required? Yes/No
  - Service Date: Field name `???`, Format `???`
  - Payer: Field name `???`, Dropdown options `???`
  - Provider: Field name `???`, Dropdown options `???`
  - ICD-10 Codes: Field name `???`, How many? `???`
  - CPT Codes: Field name `???`, How many? `???`
  - Claim Amount: Field name `???`, Currency SAR?
  - Pre-Authorization: Field name `???`, Required? Yes/No
  - [Add more fields as you discover them]

### 8. Test Claim Submission

With DevTools Network tab open:

1. Fill out a test claim (use fake data)
2. Click "Submit" button
3. Capture:
   - **Submit POST request**:
     - URL: `???`
     - Request payload (JSON/XML/Form data?)
     - Headers
   - **Response**:
     - Status code
     - Response body (confirmation number? error?)
   - Screenshot of success/error message

## Alternative Access Methods

If browser access fails, try:

### Option 1: Direct Database Access

If you have database credentials:
```sql
-- Connect to OASIS+ database (Oracle/PostgreSQL/SQL Server?)
-- Examine tables: CLAIMS, PATIENTS, PROVIDERS, etc.
```

### Option 2: API Documentation

- [ ] Check if OASIS+ has REST API documentation
- [ ] Look for Swagger/OpenAPI spec
- [ ] Contact OASIS+ vendor/admin for API guide

### Option 3: Contact System Administrator

If system is down:
- [ ] Contact HNH IT support
- [ ] Ask for:
  - Current system status
  - Correct login URL
  - API documentation if available
  - Network firewall rules for automation

## Next Steps After Investigation

Once you have gathered the information above:

### If Login Works

1. **Update discovery script** with correct selectors:
   ```typescript
   // In discover-oasis.ts, update findFieldByType() method
   const usernameField = await this.page.$('#actualUsernameId');
   const passwordField = await this.page.$('#actualPasswordId');
   ```

2. **Re-run automated discovery**:
   ```bash
   npm run discover:headed
   ```

### If API Exists

1. **Create API client** instead of UI automation:
   ```python
   # services/oasis-integration/src/api_client.py
   class OASISAPIClient:
       def authenticate(self) -> str:
           # Use discovered API endpoint
           pass
       
       def submit_claim(self, fhir_bundle: dict) -> dict:
           # POST to /api/claims/submit
           pass
   ```

2. **Skip UI automation**, use direct API calls

### If Neither Works

1. **Implement manual submission workflow**:
   - Claims Oasis generates FHIR bundle
   - User downloads bundle file
   - User manually submits to OASIS+ via their UI
   - User enters confirmation number back into Claims Oasis

## Documentation to Provide

Please share the following files after investigation:

1. **Screenshots**:
   - Login page (full page)
   - Home page after login
   - Claim submission form (full page)
   - Submit success confirmation

2. **Network HAR file**:
   - DevTools → Network → Right-click → "Save all as HAR with content"
   - This captures all HTTP traffic including headers, cookies, payloads

3. **HTML source**:
   - Right-click page → "View Page Source"
   - Save as `.html` file

4. **Documented field mappings**:
   ```
   OASIS+ Field Name → Data Type → Required? → Our Model Field
   ===================================================================
   pat_national_id → string(10) → Yes → patientId
   service_date → date → Yes → serviceDate
   [etc...]
   ```

---

**Current Status:** Awaiting manual investigation results.

**Blocked Tasks:**
- End-to-end integration test
- OASIS+ integration service development
- Production deployment

**Estimated Time:** 30-60 minutes for thorough manual investigation
