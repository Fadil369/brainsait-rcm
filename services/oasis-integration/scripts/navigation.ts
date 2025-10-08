/**
 * OASIS+ Navigation Module
 */

import { Page } from 'playwright';
import { CONFIG } from './config';

export class NavigationHandler {
  constructor(private page: Page) {}

  async discoverHomePage(): Promise<void> {
    console.log('\n🏠 Step 3: Discovering Home Page...');

    try {
      // Wait for page to fully load
      await this.page.waitForLoadState('networkidle');

      const currentUrl = this.page.url();
      console.log(`   📍 Current URL: ${currentUrl}`);

      // Look for navigation elements
      const navElements = await this.page.$$('nav, .navigation, .menu, .navbar');
      console.log(`   🧭 Found ${navElements.length} navigation elements`);

      // Look for claim-related links
      const claimLinks = await this.page.$$('a:has-text("Claim"), a:has-text("Submit"), a:has-text("New")');
      console.log(`   🔗 Found ${claimLinks.length} potential claim-related links`);

      if (claimLinks.length > 0) {
        for (const link of claimLinks.slice(0, 5)) {
          const text = await link.textContent();
          const href = await link.getAttribute('href');
          console.log(`      - "${text}" → ${href}`);
        }
      }

      console.log('   ✅ Home page discovery complete');

    } catch (error) {
      console.error('   ❌ Home page discovery failed:', error);
      throw error;
    }
  }

  async navigateToClaimSubmission(): Promise<string[]> {
    console.log('\n📝 Step 4: Navigating to Claim Submission...');

    const navigationPath: string[] = [];

    try {
      // Try different navigation strategies
      const strategies = [
        // Strategy 1: Look for direct "Submit Claim" or similar links
        async () => {
          const selectors = [
            'a:has-text("Submit Claim")',
            'a:has-text("New Claim")',
            'a:has-text("Create Claim")',
            'a:has-text("Claim Entry")',
            'a:has-text("Submit")',
          ];

          for (const selector of selectors) {
            const link = await this.page.$(selector);
            if (link && await link.isVisible()) {
              const text = await link.textContent();
              console.log(`   🎯 Found direct link: "${text}"`);
              
              await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: CONFIG.timeout }),
                link.click(),
              ]);
              
              navigationPath.push(`Clicked: ${text}`);
              return true;
            }
          }
          return false;
        },

        // Strategy 2: Look for menu items
        async () => {
          const menuItems = await this.page.$$('.menu-item, .nav-item, li a');
          for (const item of menuItems) {
            const text = await item.textContent() || '';
            if (text.toLowerCase().includes('claim') || text.toLowerCase().includes('submit')) {
              console.log(`   📋 Found menu item: "${text}"`);
              
              await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: CONFIG.timeout }),
                item.click(),
              ]);
              
              navigationPath.push(`Menu: ${text}`);
              return true;
            }
          }
          return false;
        },

        // Strategy 3: Look for buttons
        async () => {
          const buttons = await this.page.$$('button');
          for (const button of buttons) {
            const text = await button.textContent() || '';
            if (text.toLowerCase().includes('claim') || text.toLowerCase().includes('submit')) {
              console.log(`   🔘 Found button: "${text}"`);
              
              await button.click();
              await this.page.waitForTimeout(2000);
              
              navigationPath.push(`Button: ${text}`);
              return true;
            }
          }
          return false;
        },
      ];

      // Try each strategy
      let success = false;
      for (const strategy of strategies) {
        try {
          success = await strategy();
          if (success) break;
        } catch (error) {
          console.log(`   ⚠️  Strategy failed: ${error}`);
        }
      }

      if (!success) {
        console.log('   ⚠️  Could not find claim submission page automatically');
        console.log('   📋 Available links on current page:');
        
        const allLinks = await this.page.$$('a[href]');
        for (const link of allLinks.slice(0, 10)) {
          const text = await link.textContent();
          const href = await link.getAttribute('href');
          if (text && text.trim()) {
            console.log(`      - "${text.trim()}" → ${href}`);
          }
        }
      } else {
        console.log('   ✅ Successfully navigated to claim submission area');
        console.log(`   📍 Current URL: ${this.page.url()}`);
      }

    } catch (error) {
      console.error('   ❌ Navigation failed:', error);
      navigationPath.push(`Error: ${error}`);
    }

    return navigationPath;
  }

  async exploreAdditionalPages(): Promise<void> {
    console.log('\n🔍 Step 5: Exploring Additional Pages...');

    try {
      // Look for other important pages
      const importantPages = [
        { text: 'search', selectors: ['a:has-text("Search")', 'a:has-text("Find")', 'a:has-text("Lookup")'] },
        { text: 'reports', selectors: ['a:has-text("Report")', 'a:has-text("Analytics")', 'a:has-text("Dashboard")'] },
        { text: 'settings', selectors: ['a:has-text("Settings")', 'a:has-text("Config")', 'a:has-text("Admin")'] },
      ];

      for (const pageType of importantPages) {
        console.log(`   🔍 Looking for ${pageType.text} pages...`);
        
        for (const selector of pageType.selectors) {
          const link = await this.page.$(selector);
          if (link && await link.isVisible()) {
            const text = await link.textContent();
            const href = await link.getAttribute('href');
            console.log(`      ✓ Found ${pageType.text}: "${text}" → ${href}`);
            break;
          }
        }
      }

      console.log('   ✅ Additional page exploration complete');

    } catch (error) {
      console.error('   ❌ Additional page exploration failed:', error);
    }
  }

  async getBreadcrumbs(): Promise<string[]> {
    const breadcrumbs: string[] = [];
    
    try {
      const breadcrumbSelectors = [
        '.breadcrumb a, .breadcrumb span',
        '.breadcrumbs a, .breadcrumbs span',
        'nav[aria-label="breadcrumb"] a, nav[aria-label="breadcrumb"] span',
        '.nav-breadcrumb a, .nav-breadcrumb span',
      ];

      for (const selector of breadcrumbSelectors) {
        const elements = await this.page.$$(selector);
        if (elements.length > 0) {
          for (const element of elements) {
            const text = await element.textContent();
            if (text && text.trim()) {
              breadcrumbs.push(text.trim());
            }
          }
          break;
        }
      }
    } catch (error) {
      console.log('   ℹ️  No breadcrumbs found');
    }

    return breadcrumbs;
  }
}