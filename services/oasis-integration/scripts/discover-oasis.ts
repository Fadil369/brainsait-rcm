#!/usr/bin/env tsx
/**
 * OASIS+ Discovery Script
 *
 * This script uses Playwright to:
 * 1. Log into OASIS+ system
 * 2. Navigate through the claim submission workflow
 * 3. Document all form fields, dropdowns, and validation rules
 * 4. Capture API endpoints via network interception
 * 5. Generate comprehensive documentation (JSON + Markdown)
 *
 * Usage:
 *   npm run discover          # Headless mode
 *   npm run discover:headed   # Headed mode (see browser)
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config();

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  oasisUrl: process.env.OASIS_URL || 'http://128.1.1.185/prod/faces/Home',
  username: process.env.OASIS_USERNAME || 'U29958',
  password: process.env.OASIS_PASSWORD || 'U29958',
  headless: process.env.HEADED !== 'true',
  screenshotPath: process.env.SCREENSHOT_PATH || './screenshots',
  outputPath: process.env.OUTPUT_PATH || './discovery-output',
  timeout: 30000,
  slowMo: process.env.HEADED === 'true' ? 500 : 0,
};

// ============================================================================
// Types
// ============================================================================

interface FormField {
  name: string;
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: Array<{ value: string; text: string }>;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

interface APIEndpoint {
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: any;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody?: any;
  timing: {
    startTime: number;
    duration: number;
  };
}

interface PageStructure {
  url: string;
  title: string;
  forms: Array<{
    name: string;
    action: string;
    method: string;
    fields: FormField[];
  }>;
  buttons: Array<{
    text: string;
    id: string;
    type: string;
    disabled: boolean;
  }>;
  links: Array<{
    text: string;
    href: string;
  }>;
  tables: Array<{
    headers: string[];
    rowCount: number;
  }>;
}

interface DiscoveryResult {
  timestamp: string;
  oasisVersion: string;
  baseUrl: string;
  authentication: {
    loginUrl: string;
    loginMethod: string;
    credentialFields: string[];
    sessionMechanism: string;
  };
  navigation: {
    homeToClaimSubmission: string[];
    breadcrumbs: string[];
  };
  pages: {
    login: PageStructure;
    home: PageStructure;
    claimSubmission?: PageStructure;
    claimSearch?: PageStructure;
  };
  apiEndpoints: APIEndpoint[];
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
  }>;
  screenshots: string[];
  errors: string[];
}

// ============================================================================
// Discovery Class
// ============================================================================

class OASISDiscovery {
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;
  private result: DiscoveryResult;
  private apiCalls: APIEndpoint[] = [];

  constructor() {
    this.result = {
      timestamp: new Date().toISOString(),
      oasisVersion: 'unknown',
      baseUrl: CONFIG.oasisUrl,
      authentication: {
        loginUrl: '',
        loginMethod: '',
        credentialFields: [],
        sessionMechanism: '',
      },
      navigation: {
        homeToClaimSubmission: [],
        breadcrumbs: [],
      },
      pages: {
        login: this.createEmptyPageStructure(),
        home: this.createEmptyPageStructure(),
      },
      apiEndpoints: [],
      cookies: [],
      screenshots: [],
      errors: [],
    };
  }

  private createEmptyPageStructure(): PageStructure {
    return {
      url: '',
      title: '',
      forms: [],
      buttons: [],
      links: [],
      tables: [],
    };
  }

  async initialize() {
    console.log('🚀 Initializing OASIS+ Discovery...');
    console.log(`   URL: ${CONFIG.oasisUrl}`);
    console.log(`   Mode: ${CONFIG.headless ? 'Headless' : 'Headed'}`);
    console.log('');

    // Create output directories
    fs.mkdirSync(CONFIG.screenshotPath, { recursive: true });
    fs.mkdirSync(CONFIG.outputPath, { recursive: true });

    // Launch browser
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process', '--ignore-certificate-errors'],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ignoreHTTPSErrors: true,
    });

    this.page = await this.context.newPage();

    // Set up network interception
    this.setupNetworkInterception();

    // Set default timeout
    this.page.setDefaultTimeout(CONFIG.timeout);
  }

  private setupNetworkInterception() {
    this.page.on('request', (request) => {
      const url = request.url();
      if (!url.includes('static') && !url.includes('.css') && !url.includes('.png')) {
        console.log(`📤 ${request.method()} ${url}`);
      }
    });

    this.page.on('response', async (response) => {
      const request = response.request();
      const url = request.url();

      // Filter out static resources
      if (url.includes('static') || url.includes('.css') || url.includes('.png') || url.includes('.jpg')) {
        return;
      }

      try {
        const timing = response.timing();
        const apiCall: APIEndpoint = {
          url,
          method: request.method(),
          requestHeaders: request.headers(),
          responseStatus: response.status(),
          responseHeaders: response.headers(),
          timing: {
            startTime: timing.startTime,
            duration: timing.responseEnd - timing.startTime,
          },
        };

        // Capture request body for POST/PUT
        if (['POST', 'PUT', 'PATCH'].includes(request.method())) {
          try {
            apiCall.requestBody = request.postData();
          } catch (e) {
            // Body not available
          }
        }

        // Capture response body
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            apiCall.responseBody = await response.json();
          } else if (contentType.includes('text') || contentType.includes('html')) {
            apiCall.responseBody = await response.text();
          }
        } catch (e) {
          // Response body not parseable
        }

        this.apiCalls.push(apiCall);
        console.log(`📥 ${response.status()} ${url} (${apiCall.timing.duration.toFixed(0)}ms)`);
      } catch (error) {
        // Ignore errors in response handling
      }
    });
  }

  async screenshot(name: string) {
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(CONFIG.screenshotPath, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.result.screenshots.push(filename);
    console.log(`📸 Screenshot: ${filename}`);
    return filepath;
  }

  async handleSSLWarnings() {
    console.log('🔒 Checking for SSL warnings...');

    try {
      // Check for Kaspersky SSL warning
      const kasperskyLink = await this.page.$('a:has-text("I understand the risks and want to continue")');
      if (kasperskyLink) {
        console.log('   ⚠️  Kaspersky SSL warning detected - clicking continue...');
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle' }),
          kasperskyLink.click(),
        ]);
        await this.page.waitForTimeout(2000); // Extra wait for page stabilization
        await this.screenshot('01b-ssl-warning-bypassed');
        console.log('   ✓ SSL warning bypassed successfully');
        return;
      }

      // Check for browser SSL warning (Chrome/Edge)
      const advancedButton = await this.page.$('#details-button');
      if (advancedButton) {
        console.log('   ⚠️  Browser SSL warning detected - clicking advanced...');
        await advancedButton.click();
        const proceedLink = await this.page.$('#proceed-link');
        if (proceedLink) {
          await proceedLink.click();
          await this.page.waitForLoadState('networkidle');
          await this.screenshot('01b-ssl-warning-bypassed');
        }
        return;
      }

      console.log('   ✓ No SSL warnings detected');
    } catch (error) {
      console.log('   ℹ️  SSL warning check skipped');
    }
  }

  async analyzePageStructure(pageName: string): Promise<PageStructure> {
    console.log(`\n🔍 Analyzing ${pageName} page structure...`);

    // Wait for page to stabilize after navigation
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);

    const structure: PageStructure = {
      url: this.page.url(),
      title: await this.page.title().catch(() => 'Unknown'),
      forms: [],
      buttons: [],
      links: [],
      tables: [],
    };

    // Extract forms and fields
    const forms = await this.page.$$('form');
    for (const form of forms) {
      const formName = await form.getAttribute('name') || await form.getAttribute('id') || 'unnamed';
      const formAction = await form.getAttribute('action') || '';
      const formMethod = await form.getAttribute('method') || 'GET';

      const fields: FormField[] = [];

      // Find all input fields
      const inputs = await form.$$('input, select, textarea');
      for (const input of inputs) {
        const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
        const type = await input.getAttribute('type') || tagName;
        const id = await input.getAttribute('id') || '';
        const name = await input.getAttribute('name') || '';
        const required = await input.getAttribute('required') !== null;
        const placeholder = await input.getAttribute('placeholder') || '';

        // Try to find associated label
        let label = '';
        try {
          const labelEl = await form.$(`label[for="${id}"]`);
          if (labelEl) {
            label = await labelEl.textContent() || '';
          } else {
            // Try to find label by proximity
            const parentLabel = await input.evaluateHandle((el) => el.closest('label'));
            if (parentLabel) {
              label = await parentLabel.evaluate((el) => el.textContent || '');
            }
          }
        } catch (e) {
          // No label found
        }

        const field: FormField = {
          name: name || id,
          id,
          type,
          label: label.trim(),
          required,
          placeholder,
        };

        // Extract options for select/dropdown
        if (tagName === 'select') {
          const options = await input.$$eval('option', (opts) =>
            opts.map((opt) => ({
              value: opt.value,
              text: opt.textContent || '',
            }))
          );
          field.options = options;
        }

        // Extract validation attributes
        const pattern = await input.getAttribute('pattern');
        const minLength = await input.getAttribute('minlength');
        const maxLength = await input.getAttribute('maxlength');
        const min = await input.getAttribute('min');
        const max = await input.getAttribute('max');

        if (pattern || minLength || maxLength || min || max) {
          field.validation = {
            pattern: pattern || undefined,
            minLength: minLength ? parseInt(minLength) : undefined,
            maxLength: maxLength ? parseInt(maxLength) : undefined,
            min: min ? parseFloat(min) : undefined,
            max: max ? parseFloat(max) : undefined,
          };
        }

        fields.push(field);
      }

      structure.forms.push({
        name: formName,
        action: formAction,
        method: formMethod.toUpperCase(),
        fields,
      });
    }

    // Extract buttons
    const buttons = await this.page.$$('button, input[type="button"], input[type="submit"]');
    for (const button of buttons) {
      const text = await button.textContent() || await button.getAttribute('value') || '';
      const id = await button.getAttribute('id') || '';
      const type = await button.getAttribute('type') || 'button';
      const disabled = await button.isDisabled();

      structure.buttons.push({
        text: text.trim(),
        id,
        type,
        disabled,
      });
    }

    // Extract links
    const links = await this.page.$$('a[href]');
    for (const link of links.slice(0, 50)) { // Limit to first 50 links
      const text = await link.textContent() || '';
      const href = await link.getAttribute('href') || '';

      if (href && !href.startsWith('#') && text.trim()) {
        structure.links.push({
          text: text.trim(),
          href,
        });
      }
    }

    // Extract tables
    const tables = await this.page.$$('table');
    for (const table of tables) {
      const headers = await table.$$eval('thead th, thead td', (cells) =>
        cells.map((cell) => cell.textContent?.trim() || '')
      );
      const rowCount = await table.$$eval('tbody tr', (rows) => rows.length);

      if (headers.length > 0) {
        structure.tables.push({ headers, rowCount });
      }
    }

    console.log(`   ✓ Found ${structure.forms.length} forms`);
    console.log(`   ✓ Found ${structure.forms.reduce((sum, f) => sum + f.fields.length, 0)} form fields`);
    console.log(`   ✓ Found ${structure.buttons.length} buttons`);
    console.log(`   ✓ Found ${structure.links.length} links`);
    console.log(`   ✓ Found ${structure.tables.length} tables`);

    return structure;
  }

  async analyzeLoginPage() {
    console.log('\n📋 Step 1: Analyzing Login Page...');

    try {
      await this.page.goto(CONFIG.oasisUrl, { waitUntil: 'networkidle' });
      await this.screenshot('01-login-page');

      // Handle SSL certificate warning (Kaspersky, browser warnings, etc.)
      await this.handleSSLWarnings();

      this.result.pages.login = await this.analyzePageStructure('login');
      this.result.authentication.loginUrl = this.page.url();

      // Detect login method
      const loginForm = this.result.pages.login.forms[0];
      if (loginForm) {
        this.result.authentication.loginMethod = loginForm.method;
        this.result.authentication.credentialFields = loginForm.fields
          .filter((f) => f.type === 'text' || f.type === 'password')
          .map((f) => f.name);
      }

      console.log('   ✓ Login page analyzed');
    } catch (error) {
      this.result.errors.push(`Login analysis failed: ${error}`);
      throw error;
    }
  }

  async performLogin() {
    console.log('\n🔐 Step 2: Performing Login...');

    try {
      // Find username and password fields
      const usernameField = await this.findFieldByType(['text', 'email'], ['user', 'username', 'login']);
      const passwordField = await this.findFieldByType(['password'], ['pass', 'password', 'pwd']);

      if (!usernameField || !passwordField) {
        throw new Error('Could not locate username or password fields');
      }

      console.log(`   Username field: ${usernameField}`);
      console.log(`   Password field: ${passwordField}`);

      // Fill credentials
      await this.page.fill(usernameField, CONFIG.username);
      await this.page.fill(passwordField, CONFIG.password);

      await this.screenshot('02-credentials-filled');

      // Find and click submit button
      const submitButton = await this.findSubmitButton();
      console.log(`   Submit button: ${submitButton}`);

      await this.page.click(submitButton);

      // Wait for navigation
      await this.page.waitForLoadState('networkidle');
      await this.screenshot('03-logged-in');

      // Detect session mechanism
      const cookies = await this.context.cookies();
      const sessionCookie = cookies.find((c) => c.name.toLowerCase().includes('session') || c.name.toLowerCase().includes('jsession'));
      this.result.authentication.sessionMechanism = sessionCookie ? `Cookie: ${sessionCookie.name}` : 'Unknown';

      console.log('   ✓ Login successful');
    } catch (error) {
      this.result.errors.push(`Login failed: ${error}`);
      throw error;
    }
  }

  async discoverHomePage() {
    console.log('\n🏠 Step 3: Analyzing Home Page...');

    try {
      this.result.pages.home = await this.analyzePageStructure('home');

      // Try to detect OASIS version
      const pageText = await this.page.textContent('body');
      const versionMatch = pageText?.match(/OASIS[+]?\s*v?(\d+\.\d+)/i);
      if (versionMatch) {
        this.result.oasisVersion = versionMatch[1];
      }

      console.log('   ✓ Home page analyzed');
    } catch (error) {
      this.result.errors.push(`Home page analysis failed: ${error}`);
    }
  }

  async navigateToClaimSubmission() {
    console.log('\n📝 Step 4: Navigating to Claim Submission...');

    try {
      // Common patterns for claim submission links
      const patterns = [
        'claim',
        'submit',
        'new claim',
        'create claim',
        'add claim',
        'claims',
      ];

      let found = false;

      for (const pattern of patterns) {
        const links = await this.page.$$(`a:has-text("${pattern}")`);
        if (links.length > 0) {
          console.log(`   Found link with text containing: "${pattern}"`);
          const linkText = await links[0].textContent();
          this.result.navigation.homeToClaimSubmission.push(linkText?.trim() || '');

          await links[0].click();
          await this.page.waitForLoadState('networkidle');
          await this.screenshot('04-claim-submission-page');

          found = true;
          break;
        }
      }

      if (!found) {
        console.log('   ⚠ Could not automatically find claim submission link');
        console.log('   Please manually navigate and document');
        return;
      }

      // Analyze claim submission page
      this.result.pages.claimSubmission = await this.analyzePageStructure('claimSubmission');

      // Extract breadcrumbs if available
      const breadcrumbs = await this.page.$$('.breadcrumb a, .breadcrumbs a, nav[aria-label="breadcrumb"] a');
      for (const crumb of breadcrumbs) {
        const text = await crumb.textContent();
        if (text) {
          this.result.navigation.breadcrumbs.push(text.trim());
        }
      }

      console.log('   ✓ Claim submission page analyzed');
    } catch (error) {
      this.result.errors.push(`Claim submission navigation failed: ${error}`);
      console.log(`   ⚠ Error: ${error}`);
    }
  }

  async exploreAdditionalPages() {
    console.log('\n🔎 Step 5: Exploring Additional Pages...');

    try {
      // Look for claim search/list page
      const searchPatterns = ['search', 'find', 'list', 'view claims'];
      for (const pattern of searchPatterns) {
        const links = await this.page.$$(`a:has-text("${pattern}")`);
        if (links.length > 0) {
          const linkText = await links[0].textContent();
          console.log(`   Found: ${linkText}`);

          await links[0].click();
          await this.page.waitForLoadState('networkidle');
          await this.screenshot('05-claim-search-page');

          this.result.pages.claimSearch = await this.analyzePageStructure('claimSearch');
          break;
        }
      }
    } catch (error) {
      console.log(`   ⚠ Additional page exploration: ${error}`);
    }
  }

  async captureCookiesAndSession() {
    console.log('\n🍪 Step 6: Capturing Session Information...');

    const cookies = await this.context.cookies();
    this.result.cookies = cookies.map((c) => ({
      name: c.name,
      value: c.value.substring(0, 20) + '...', // Truncate for security
      domain: c.domain,
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
    }));

    console.log(`   ✓ Captured ${cookies.length} cookies`);
  }

  async generateDocumentation() {
    console.log('\n📄 Generating Documentation...');

    // Compile API endpoints
    this.result.apiEndpoints = this.apiCalls;

    // Write JSON output
    const jsonPath = path.join(CONFIG.outputPath, 'oasis-discovery.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.result, null, 2));
    console.log(`   ✓ JSON: ${jsonPath}`);

    // Write Markdown documentation
    const mdPath = path.join(CONFIG.outputPath, 'OASIS_INTEGRATION_GUIDE.md');
    const markdown = this.generateMarkdown();
    fs.writeFileSync(mdPath, markdown);
    console.log(`   ✓ Markdown: ${mdPath}`);

    // Write TypeScript types
    const tsPath = path.join(CONFIG.outputPath, 'oasis-types.ts');
    const types = this.generateTypeScript();
    fs.writeFileSync(tsPath, types);
    console.log(`   ✓ Types: ${tsPath}`);
  }

  private generateMarkdown(): string {
    const md: string[] = [];

    md.push('# OASIS+ Integration Guide');
    md.push('');
    md.push(`**Generated**: ${this.result.timestamp}`);
    md.push(`**OASIS Version**: ${this.result.oasisVersion}`);
    md.push(`**Base URL**: ${this.result.baseUrl}`);
    md.push('');

    // Authentication
    md.push('## Authentication');
    md.push('');
    md.push(`- **Login URL**: ${this.result.authentication.loginUrl}`);
    md.push(`- **Method**: ${this.result.authentication.loginMethod}`);
    md.push(`- **Credentials**: ${this.result.authentication.credentialFields.join(', ')}`);
    md.push(`- **Session**: ${this.result.authentication.sessionMechanism}`);
    md.push('');

    // Navigation
    md.push('## Navigation Flow');
    md.push('');
    md.push('### Home → Claim Submission');
    this.result.navigation.homeToClaimSubmission.forEach((step) => {
      md.push(`1. ${step}`);
    });
    md.push('');

    // Claim Submission Form
    if (this.result.pages.claimSubmission) {
      md.push('## Claim Submission Form');
      md.push('');

      this.result.pages.claimSubmission.forms.forEach((form, idx) => {
        md.push(`### Form ${idx + 1}: ${form.name}`);
        md.push('');
        md.push('| Field | Type | Required | Label | Validation |');
        md.push('|-------|------|----------|-------|------------|');

        form.fields.forEach((field) => {
          const validation = field.validation
            ? Object.entries(field.validation)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => `${k}:${v}`)
                .join(', ')
            : '-';

          md.push(`| ${field.name} | ${field.type} | ${field.required ? 'Yes' : 'No'} | ${field.label || '-'} | ${validation} |`);

          if (field.options && field.options.length > 0) {
            md.push(`| | **Options** | | ${field.options.map((o) => `${o.text} (${o.value})`).join(', ')} | |`);
          }
        });

        md.push('');
      });
    }

    // API Endpoints
    md.push('## API Endpoints');
    md.push('');

    const uniqueEndpoints = Array.from(
      new Map(this.result.apiEndpoints.map((e) => [`${e.method}:${e.url}`, e])).values()
    );

    uniqueEndpoints.forEach((endpoint) => {
      md.push(`### ${endpoint.method} ${endpoint.url}`);
      md.push('');
      md.push(`**Status**: ${endpoint.responseStatus}`);
      md.push(`**Duration**: ${endpoint.timing.duration.toFixed(0)}ms`);
      md.push('');

      if (endpoint.requestBody) {
        md.push('**Request Body**:');
        md.push('```json');
        md.push(typeof endpoint.requestBody === 'string' ? endpoint.requestBody : JSON.stringify(endpoint.requestBody, null, 2));
        md.push('```');
        md.push('');
      }

      if (endpoint.responseBody && typeof endpoint.responseBody === 'object') {
        md.push('**Response Body**:');
        md.push('```json');
        md.push(JSON.stringify(endpoint.responseBody, null, 2).substring(0, 500));
        md.push('```');
        md.push('');
      }
    });

    // Screenshots
    md.push('## Screenshots');
    md.push('');
    this.result.screenshots.forEach((screenshot) => {
      md.push(`- ${screenshot}`);
    });
    md.push('');

    // Errors
    if (this.result.errors.length > 0) {
      md.push('## Errors Encountered');
      md.push('');
      this.result.errors.forEach((error) => {
        md.push(`- ${error}`);
      });
      md.push('');
    }

    return md.join('\n');
  }

  private generateTypeScript(): string {
    const ts: string[] = [];

    ts.push('/**');
    ts.push(' * OASIS+ Integration Types');
    ts.push(` * Generated: ${this.result.timestamp}`);
    ts.push(' */');
    ts.push('');

    // Generate field enums for dropdowns
    if (this.result.pages.claimSubmission) {
      this.result.pages.claimSubmission.forms.forEach((form) => {
        form.fields.forEach((field) => {
          if (field.options && field.options.length > 0) {
            const enumName = this.toPascalCase(field.name) + 'Options';
            ts.push(`export enum ${enumName} {`);
            field.options.forEach((opt) => {
              const key = opt.text.toUpperCase().replace(/[^A-Z0-9]/g, '_');
              ts.push(`  ${key} = '${opt.value}',`);
            });
            ts.push('}');
            ts.push('');
          }
        });
      });
    }

    // Generate claim submission interface
    ts.push('export interface OASISClaimSubmission {');
    if (this.result.pages.claimSubmission) {
      this.result.pages.claimSubmission.forms.forEach((form) => {
        form.fields.forEach((field) => {
          const tsType = this.mapFieldTypeToTS(field.type);
          const optional = field.required ? '' : '?';
          ts.push(`  ${field.name}${optional}: ${tsType};  // ${field.label || 'No label'}`);
        });
      });
    }
    ts.push('}');
    ts.push('');

    return ts.join('\n');
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[_-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private mapFieldTypeToTS(fieldType: string): string {
    const typeMap: Record<string, string> = {
      text: 'string',
      email: 'string',
      tel: 'string',
      url: 'string',
      password: 'string',
      number: 'number',
      date: 'string',
      datetime: 'string',
      'datetime-local': 'string',
      time: 'string',
      checkbox: 'boolean',
      radio: 'string',
      select: 'string',
      textarea: 'string',
    };

    return typeMap[fieldType] || 'string';
  }

  private async findFieldByType(types: string[], namePatterns: string[]): Promise<string | null> {
    for (const type of types) {
      for (const pattern of namePatterns) {
        const selector = `input[type="${type}"][name*="${pattern}" i], input[type="${type}"][id*="${pattern}" i]`;
        const field = await this.page.$(selector);
        if (field) {
          return (await field.getAttribute('name')) || (await field.getAttribute('id')) || selector;
        }
      }
    }
    return null;
  }

  private async findSubmitButton(): Promise<string> {
    const patterns = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'button:has-text("Submit")',
    ];

    for (const pattern of patterns) {
      const button = await this.page.$(pattern);
      if (button) {
        return pattern;
      }
    }

    throw new Error('Could not find submit button');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.analyzeLoginPage();
      await this.performLogin();
      await this.discoverHomePage();
      await this.navigateToClaimSubmission();
      await this.exploreAdditionalPages();
      await this.captureCookiesAndSession();
      await this.generateDocumentation();

      console.log('\n✅ Discovery Complete!');
      console.log('');
      console.log('📁 Output files:');
      console.log(`   - ${CONFIG.outputPath}/oasis-discovery.json`);
      console.log(`   - ${CONFIG.outputPath}/OASIS_INTEGRATION_GUIDE.md`);
      console.log(`   - ${CONFIG.outputPath}/oasis-types.ts`);
      console.log(`   - ${CONFIG.screenshotPath}/*.png`);
      console.log('');
      console.log('🚀 Next steps:');
      console.log('   1. Review generated documentation');
      console.log('   2. Run: npm run build (to create integration service)');
      console.log('   3. Deploy to Kubernetes');
      console.log('');
    } catch (error) {
      console.error('\n❌ Discovery failed:', error);
      this.result.errors.push(`Fatal error: ${error}`);
      await this.screenshot('error');

      // Still try to generate partial documentation
      try {
        await this.generateDocumentation();
      } catch (e) {
        console.error('Could not generate documentation:', e);
      }

      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         OASIS+ Discovery & Documentation Tool              ║');
  console.log('║         BrainSAIT Healthcare Claims Platform               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const discovery = new OASISDiscovery();
  await discovery.run();
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { OASISDiscovery, DiscoveryResult };
