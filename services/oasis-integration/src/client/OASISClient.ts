/**
 * OASIS+ Client
 * Handles authentication and API communication with OASIS+ system
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { OASISCredentials, OASISSession, OASISAuthenticationError, OASISNetworkError } from '../types/oasis.types';
import { AuditLogger } from '../utils/auditLogger';
import pino from 'pino';

const logger = pino({ name: 'OASISClient' });

export class OASISClient {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private session?: OASISSession;
  private credentials: OASISCredentials;
  private auditLogger: AuditLogger;

  constructor(credentials: OASISCredentials, auditLogger: AuditLogger) {
    this.credentials = credentials;
    this.auditLogger = auditLogger;
  }

  /**
   * Initialize browser and establish connection
   */
  async initialize(): Promise<void> {
    logger.info('Initializing OASIS client...');

    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--ignore-certificate-errors',
        ],
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ignoreHTTPSErrors: true,
      });

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(30000);

      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize browser');
      throw new OASISNetworkError('Failed to initialize browser', error);
    }
  }

  /**
   * Authenticate with OASIS+ system
   */
  async authenticate(): Promise<OASISSession> {
    if (!this.page) {
      throw new OASISAuthenticationError('Client not initialized. Call initialize() first');
    }

    logger.info({ url: this.credentials.baseUrl }, 'Attempting authentication...');

    try {
      // Navigate to login page
      await this.page.goto(this.credentials.baseUrl, { waitUntil: 'networkidle' });

      // Handle SSL warnings (Kaspersky, browser warnings, etc.)
      await this.handleSSLWarnings();

      // Find and fill login form
      const usernameField = await this.findFieldByPattern(['user', 'username', 'login', 'j_username']);
      const passwordField = await this.findFieldByPattern(['pass', 'password', 'pwd', 'j_password']);

      if (!usernameField || !passwordField) {
        throw new OASISAuthenticationError('Could not locate login form fields');
      }

      await this.page.fill(usernameField, this.credentials.username);
      await this.page.fill(passwordField, this.credentials.password);

      // Find and click submit button
      const submitButton = await this.findSubmitButton();
      await this.page.click(submitButton);

      // Wait for navigation and check if login was successful
      await this.page.waitForLoadState('networkidle');

      // Check for error messages
      const errorElement = await this.page.$('.error, .alert-danger, [role="alert"]');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        throw new OASISAuthenticationError(`Login failed: ${errorText || 'Unknown error'}`);
      }

      // Extract session information
      const cookies = await this.context!.cookies();
      const sessionCookie = cookies.find(c =>
        c.name.toLowerCase().includes('session') ||
        c.name.toLowerCase().includes('jsession')
      );

      if (!sessionCookie) {
        throw new OASISAuthenticationError('No session cookie found after login');
      }

      this.session = {
        sessionId: sessionCookie.value,
        cookies: cookies.map(c => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
        })),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour default
        authenticated: true,
      };

      // Audit log
      await this.auditLogger.log({
        timestamp: new Date().toISOString(),
        action: 'OASIS_LOGIN',
        userId: this.credentials.username,
        resourceType: 'SESSION',
        resourceId: this.session.sessionId,
        details: { success: true },
      });

      logger.info({ sessionId: this.session.sessionId }, 'Authentication successful');
      return this.session;
    } catch (error) {
      logger.error({ error }, 'Authentication failed');

      await this.auditLogger.log({
        timestamp: new Date().toISOString(),
        action: 'OASIS_LOGIN_FAILED',
        userId: this.credentials.username,
        resourceType: 'SESSION',
        resourceId: 'N/A',
        details: { error: String(error) },
      });

      if (error instanceof OASISAuthenticationError) {
        throw error;
      }
      throw new OASISAuthenticationError('Authentication failed', error);
    }
  }

  /**
   * Check if current session is valid
   */
  isAuthenticated(): boolean {
    if (!this.session) return false;
    if (!this.session.authenticated) return false;
    if (this.session.expiresAt < new Date()) return false;
    return true;
  }

  /**
   * Navigate to a specific page
   */
  async navigateTo(url: string): Promise<void> {
    if (!this.page) {
      throw new OASISNetworkError('Client not initialized');
    }

    if (!this.isAuthenticated()) {
      await this.authenticate();
    }

    logger.info({ url }, 'Navigating to page...');
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Execute JavaScript in the page context
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    if (!this.page) {
      throw new OASISNetworkError('Client not initialized');
    }

    return this.page.evaluate(fn);
  }

  /**
   * Extract data from the current page
   */
  async extractData<T>(extractor: (page: Page) => Promise<T>): Promise<T> {
    if (!this.page) {
      throw new OASISNetworkError('Client not initialized');
    }

    if (!this.isAuthenticated()) {
      await this.authenticate();
    }

    return extractor(this.page);
  }

  /**
   * Take screenshot (for debugging)
   */
  async screenshot(path: string): Promise<void> {
    if (!this.page) {
      throw new OASISNetworkError('Client not initialized');
    }

    await this.page.screenshot({ path, fullPage: true });
    logger.debug({ path }, 'Screenshot captured');
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    logger.info('Closing OASIS client...');

    if (this.session) {
      await this.auditLogger.log({
        timestamp: new Date().toISOString(),
        action: 'OASIS_LOGOUT',
        userId: this.credentials.username,
        resourceType: 'SESSION',
        resourceId: this.session.sessionId,
        details: { success: true },
      });
    }

    if (this.browser) {
      await this.browser.close();
    }

    this.browser = undefined;
    this.context = undefined;
    this.page = undefined;
    this.session = undefined;

    logger.info('Client closed successfully');
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private async handleSSLWarnings(): Promise<void> {
    if (!this.page) return;

    try {
      // Check for Kaspersky SSL warning
      const kasperskyLink = await this.page.$('a:has-text("I understand the risks and want to continue")');
      if (kasperskyLink) {
        logger.info('Bypassing Kaspersky SSL warning...');
        await kasperskyLink.click();
        await this.page.waitForLoadState('networkidle');
        return;
      }

      // Check for browser SSL warning
      const advancedButton = await this.page.$('#details-button');
      if (advancedButton) {
        logger.info('Bypassing browser SSL warning...');
        await advancedButton.click();
        const proceedLink = await this.page.$('#proceed-link');
        if (proceedLink) {
          await proceedLink.click();
          await this.page.waitForLoadState('networkidle');
        }
        return;
      }
    } catch (error) {
      // SSL warning handling is best-effort
      logger.debug('SSL warning check skipped');
    }
  }

  private async findFieldByPattern(patterns: string[]): Promise<string | null> {
    if (!this.page) return null;

    for (const pattern of patterns) {
      // Try by name
      const byName = await this.page.$(`input[name="${pattern}"], input[name*="${pattern}" i]`);
      if (byName) {
        return `input[name="${await byName.getAttribute('name')}"]`;
      }

      // Try by id
      const byId = await this.page.$(`input[id="${pattern}"], input[id*="${pattern}" i]`);
      if (byId) {
        return `input[id="${await byId.getAttribute('id')}"]`;
      }
    }

    return null;
  }

  private async findSubmitButton(): Promise<string> {
    if (!this.page) {
      throw new OASISNetworkError('Client not initialized');
    }

    const patterns = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'button:has-text("Submit")',
      'button:has-text("دخول")', // Arabic "Login"
    ];

    for (const pattern of patterns) {
      const button = await this.page.$(pattern);
      if (button) {
        return pattern;
      }
    }

    throw new OASISAuthenticationError('Could not find submit button');
  }

  /**
   * Get current page for advanced operations
   */
  getPage(): Page | undefined {
    return this.page;
  }
}
