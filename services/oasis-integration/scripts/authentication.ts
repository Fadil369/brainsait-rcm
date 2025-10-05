/**
 * OASIS+ Authentication Module
 */

import { Page } from 'playwright';
import { CONFIG } from './config';

export class AuthenticationHandler {
  constructor(private page: Page) {}

  async handleSSLWarnings(): Promise<void> {
    try {
      // Handle various SSL certificate warnings
      const warningSelectors = [
        'button:has-text("Advanced")',
        'button:has-text("Proceed")',
        'a:has-text("Proceed to")',
        '#proceed-button',
        '.ssl-error-proceed',
      ];

      for (const selector of warningSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            console.log(`   ⚠️  Handling SSL warning with selector: ${selector}`);
            await element.click();
            await this.page.waitForTimeout(2000);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    } catch (error) {
      console.log('   ℹ️  No SSL warnings to handle');
    }
  }

  async performLogin(): Promise<void> {
    console.log('\n🔐 Step 2: Performing Login...');
    console.log(`   Username: ${CONFIG.username}`);

    try {
      // Try different username field selectors
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="user"]',
        'input[name="login"]',
        'input[id*="username"]',
        'input[id*="user"]',
        'input[type="text"]',
      ];

      let usernameField = null;
      for (const selector of usernameSelectors) {
        usernameField = await this.page.$(selector);
        if (usernameField) {
          console.log(`   ✓ Found username field: ${selector}`);
          break;
        }
      }

      if (!usernameField) {
        throw new Error('Could not find username field');
      }

      // Try different password field selectors
      const passwordSelectors = [
        'input[name="password"]',
        'input[name="pass"]',
        'input[id*="password"]',
        'input[id*="pass"]',
        'input[type="password"]',
      ];

      let passwordField = null;
      for (const selector of passwordSelectors) {
        passwordField = await this.page.$(selector);
        if (passwordField) {
          console.log(`   ✓ Found password field: ${selector}`);
          break;
        }
      }

      if (!passwordField) {
        throw new Error('Could not find password field');
      }

      // Fill credentials
      await usernameField.fill(CONFIG.username);
      await passwordField.fill(CONFIG.password);

      // Find and click login button
      const loginButtonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'button:has-text("Submit")',
        '.login-button',
        '#login-button',
      ];

      let loginButton = null;
      for (const selector of loginButtonSelectors) {
        loginButton = await this.page.$(selector);
        if (loginButton && await loginButton.isVisible()) {
          console.log(`   ✓ Found login button: ${selector}`);
          break;
        }
      }

      if (!loginButton) {
        throw new Error('Could not find login button');
      }

      // Click login and wait for navigation
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: CONFIG.timeout }),
        loginButton.click(),
      ]);

      // Check if login was successful
      const currentUrl = this.page.url();
      if (currentUrl.includes('login') || currentUrl.includes('error')) {
        throw new Error('Login appears to have failed - still on login page');
      }

      console.log('   ✅ Login successful');
      console.log(`   📍 Redirected to: ${currentUrl}`);

    } catch (error) {
      console.error('   ❌ Login failed:', error);
      throw error;
    }
  }

  async captureCookiesAndSession(): Promise<Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
  }>> {
    console.log('\n🍪 Step 6: Capturing Cookies and Session...');

    const cookies = await this.page.context().cookies();
    const sessionCookies = cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
    }));

    console.log(`   ✓ Captured ${sessionCookies.length} cookies`);
    
    // Log important session cookies
    const importantCookies = sessionCookies.filter(c => 
      c.name.toLowerCase().includes('session') || 
      c.name.toLowerCase().includes('auth') ||
      c.name.toLowerCase().includes('token')
    );

    if (importantCookies.length > 0) {
      console.log('   🔑 Important session cookies:');
      importantCookies.forEach(cookie => {
        console.log(`      - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
      });
    }

    return sessionCookies;
  }
}