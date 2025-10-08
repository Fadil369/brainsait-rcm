#!/usr/bin/env tsx
/**
 * OASIS+ Discovery Script - Refactored Modular Version
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

// Import modular components
import { CONFIG } from './config';
import { DiscoveryResult, APIEndpoint, PageStructure } from './types';
import { PageAnalyzer } from './page-analyzer';
import { AuthenticationHandler } from './authentication';
import { NavigationHandler } from './navigation';
import { DocumentationGenerator } from './documentation-generator';

/**
 * Main OASIS Discovery Class - Orchestrates the discovery process
 */
class OASISDiscovery {
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;
  private result: DiscoveryResult;
  private apiCalls: APIEndpoint[] = [];

  // Modular components
  private pageAnalyzer!: PageAnalyzer;
  private authHandler!: AuthenticationHandler;
  private navigationHandler!: NavigationHandler;
  private docGenerator!: DocumentationGenerator;

  constructor() {
    this.result = this.initializeResult();
  }

  private initializeResult(): DiscoveryResult {
    return {
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

  async initialize(): Promise<void> {
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
      args: [
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--ignore-certificate-errors'
      ],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ignoreHTTPSErrors: true,
    });

    this.page = await this.context.newPage();

    // Initialize modular components
    this.pageAnalyzer = new PageAnalyzer(this.page);
    this.authHandler = new AuthenticationHandler(this.page);
    this.navigationHandler = new NavigationHandler(this.page);

    // Set up API monitoring
    this.setupAPIMonitoring();

    console.log('   ✅ Browser initialized');
  }

  private setupAPIMonitoring(): void {
    this.page.on('response', async (response) => {
      try {
        const request = response.request();
        const url = response.url();

        // Skip static resources
        if (url.includes('.css') || url.includes('.js') || url.includes('.png') || 
            url.includes('.jpg') || url.includes('.gif') || url.includes('.ico')) {
          return;
        }

        const apiCall: APIEndpoint = {
          url,
          method: request.method(),
          headers: request.headers(),
          requestBody: request.postData(),
          responseStatus: response.status(),
          responseHeaders: response.headers(),
          timestamp: new Date().toISOString(),
        };

        // Try to capture response body for small responses
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json') || contentType.includes('text')) {
            const body = await response.text();
            if (body.length < 10000) { // Only capture small responses
              apiCall.responseBody = body;
            }
          }
        } catch (e) {
          // Ignore response body capture errors
        }

        this.apiCalls.push(apiCall);
      } catch (error) {
        // Ignore monitoring errors
      }
    });
  }

  async screenshot(name: string): Promise<void> {
    try {
      const filename = `${name}-${Date.now()}.png`;
      const filepath = path.join(CONFIG.screenshotPath, filename);
      await this.page.screenshot({ path: filepath, fullPage: true });
      this.result.screenshots.push(filename);
      console.log(`   📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.log(`   ⚠️  Screenshot failed: ${error}`);
    }
  }

  async analyzeLoginPage(): Promise<void> {
    console.log('\n📋 Step 1: Analyzing Login Page...');

    try {
      await this.page.goto(CONFIG.oasisUrl, { waitUntil: 'networkidle' });
      await this.screenshot('01-login-page');

      // Handle SSL certificate warnings
      await this.authHandler.handleSSLWarnings();

      // Analyze page structure
      this.result.pages.login = await this.pageAnalyzer.analyzePageStructure('login');
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

  async performLogin(): Promise<void> {
    await this.authHandler.performLogin();
    await this.screenshot('02-after-login');
  }

  async discoverHomePage(): Promise<void> {
    await this.navigationHandler.discoverHomePage();
    this.result.pages.home = await this.pageAnalyzer.analyzePageStructure('home');
    await this.screenshot('03-home-page');
  }

  async navigateToClaimSubmission(): Promise<void> {
    console.log('\n📝 Step 4: Navigating to Claim Submission...');

    try {
      this.result.navigation.homeToClaimSubmission = await this.navigationHandler.navigateToClaimSubmission();
      
      // If we successfully navigated, analyze the claim submission page
      const currentUrl = this.page.url();
      if (!currentUrl.includes('Home') && !currentUrl.includes('home')) {
        this.result.pages.claimSubmission = await this.pageAnalyzer.analyzePageStructure('claimSubmission');
        await this.screenshot('04-claim-submission');
      }

      // Get breadcrumbs
      this.result.navigation.breadcrumbs = await this.navigationHandler.getBreadcrumbs();

    } catch (error) {
      this.result.errors.push(`Claim submission navigation failed: ${error}`);
      console.error('   ❌ Navigation failed:', error);
    }
  }

  async exploreAdditionalPages(): Promise<void> {
    await this.navigationHandler.exploreAdditionalPages();
    await this.screenshot('05-additional-exploration');
  }

  async captureCookiesAndSession(): Promise<void> {
    const cookies = await this.authHandler.captureCookiesAndSession();
    this.result.cookies = cookies;
    
    // Determine session mechanism
    const sessionCookies = cookies.filter(c => 
      c.name.toLowerCase().includes('session') || 
      c.name.toLowerCase().includes('jsessionid') ||
      c.name.toLowerCase().includes('auth')
    );
    
    if (sessionCookies.length > 0) {
      this.result.authentication.sessionMechanism = 'cookies';
    }
  }

  async generateDocumentation(): Promise<void> {
    // Add captured API calls to result
    this.result.apiEndpoints = this.apiCalls;

    // Generate documentation
    this.docGenerator = new DocumentationGenerator(this.result);
    await this.docGenerator.generateDocumentation();
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    await this.browser.close();
  }

  async run(): Promise<void> {
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

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         OASIS+ Discovery & Documentation Tool              ║');
  console.log('║         BrainSAIT Healthcare Claims Platform               ║');
  console.log('║         Refactored Modular Version                         ║');
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

export { OASISDiscovery };