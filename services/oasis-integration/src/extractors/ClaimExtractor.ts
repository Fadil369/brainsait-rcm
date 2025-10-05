/**
 * Claim Data Extractor
 * Extracts claim and rejection data from OASIS+ pages
 */

import { Page } from 'playwright';
import { OASISClaim, OASISRejection, OASISSearchCriteria, OASISSearchResult, OASISDataError } from '../types/oasis.types';
import { OASISClient } from '../client/OASISClient';
import pino from 'pino';

const logger = pino({ name: 'ClaimExtractor' });

export class ClaimExtractor {
  constructor(private client: OASISClient) {}

  /**
   * Search for claims based on criteria
   */
  async searchClaims(criteria: OASISSearchCriteria): Promise<OASISSearchResult> {
    logger.info({ criteria }, 'Searching claims...');

    const page = this.client.getPage();
    if (!page) {
      throw new OASISDataError('Client not initialized');
    }

    try {
      // Navigate to claim search page
      await this.navigateToClaimSearch(page);

      // Fill search form
      await this.fillSearchForm(page, criteria);

      // Submit search
      await this.submitSearch(page);

      // Extract results
      const claims = await this.extractClaimsFromTable(page);
      const totalCount = await this.extractTotalCount(page);

      const result: OASISSearchResult = {
        claims,
        totalCount,
        page: criteria.page || 1,
        pageSize: criteria.pageSize || 100,
        totalPages: Math.ceil(totalCount / (criteria.pageSize || 100)),
      };

      logger.info({ count: claims.length, totalCount }, 'Claims search completed');
      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to search claims');
      throw new OASISDataError('Failed to search claims', error);
    }
  }

  /**
   * Extract rejections from search results
   */
  async extractRejections(criteria: OASISSearchCriteria): Promise<OASISRejection[]> {
    logger.info({ criteria }, 'Extracting rejections...');

    // Search for rejected claims
    const searchCriteria: OASISSearchCriteria = {
      ...criteria,
      status: ['REJECTED'] as const,
    };

    const searchResult = await this.searchClaims(searchCriteria);
    const rejections: OASISRejection[] = [];

    // For each rejected claim, extract detailed rejection information
    for (const claim of searchResult.claims) {
      if (claim.status === 'REJECTED') {
        const rejection = await this.extractRejectionDetails(claim);
        if (rejection) {
          rejections.push(rejection);
        }
      }
    }

    logger.info({ count: rejections.length }, 'Rejections extraction completed');
    return rejections;
  }

  /**
   * Extract detailed rejection information from a claim
   */
  async extractRejectionDetails(claim: OASISClaim): Promise<OASISRejection | null> {
    const page = this.client.getPage();
    if (!page) {
      throw new OASISDataError('Client not initialized');
    }

    try {
      // Navigate to claim details page
      await this.navigateToClaimDetails(page, claim.claimNumber);

      // Extract rejection data
      const rejection = await this.extractRejectionFromPage(page, claim);

      return rejection;
    } catch (error) {
      logger.error({ claimNumber: claim.claimNumber, error }, 'Failed to extract rejection details');
      return null;
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private async navigateToClaimSearch(page: Page): Promise<void> {
    // Look for claim search link
    const searchLinks = [
      'a:has-text("Claim Search")',
      'a:has-text("Search Claims")',
      'a:has-text("Find Claims")',
      'a:has-text("بحث المطالبات")', // Arabic
      'a[href*="claim"][href*="search"]',
    ];

    for (const selector of searchLinks) {
      const link = await page.$(selector);
      if (link) {
        await link.click();
        await page.waitForLoadState('networkidle');
        return;
      }
    }

    throw new OASISDataError('Could not find claim search page');
  }

  private async fillSearchForm(page: Page, criteria: OASISSearchCriteria): Promise<void> {
    // Fill date range
    const fromDateField = await this.findDateField(page, ['from', 'start', 'begin']);
    const toDateField = await this.findDateField(page, ['to', 'end', 'until']);

    if (fromDateField) {
      await page.fill(fromDateField, criteria.fromDate);
    }

    if (toDateField) {
      await page.fill(toDateField, criteria.toDate);
    }

    // Fill claim number if provided
    if (criteria.claimNumber) {
      const claimNumberField = await this.findField(page, ['claim', 'number', 'claimno']);
      if (claimNumberField) {
        await page.fill(claimNumberField, criteria.claimNumber);
      }
    }

    // Fill patient ID if provided
    if (criteria.patientNationalId) {
      const patientIdField = await this.findField(page, ['patient', 'national', 'id', 'iqama']);
      if (patientIdField) {
        await page.fill(patientIdField, criteria.patientNationalId);
      }
    }

    // Select status if provided
    if (criteria.status && criteria.status.length > 0) {
      const statusField = await this.findSelectField(page, ['status']);
      if (statusField) {
        await page.selectOption(statusField, criteria.status[0]);
      }
    }
  }

  private async submitSearch(page: Page): Promise<void> {
    const submitButtons = [
      'button:has-text("Search")',
      'button:has-text("Find")',
      'button:has-text("بحث")', // Arabic
      'button[type="submit"]',
      'input[type="submit"]',
    ];

    for (const selector of submitButtons) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        await page.waitForLoadState('networkidle');
        return;
      }
    }

    throw new OASISDataError('Could not find search submit button');
  }

  private async extractClaimsFromTable(page: Page): Promise<OASISClaim[]> {
    // Find the results table
    const table = await page.$('table.results, table.claims, table[id*="claim"], table[class*="claim"]');

    if (!table) {
      // No results found
      return [];
    }

    // Extract data from table rows
    const rows = await table.$$('tbody tr');
    const claims: OASISClaim[] = [];

    for (const row of rows) {
      try {
        const cells = await row.$$('td');

        if (cells.length === 0) continue;

        // Extract claim data (adjust based on actual OASIS table structure)
        const claim = await this.parseClaimRow(cells);
        if (claim) {
          claims.push(claim);
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to parse claim row');
      }
    }

    return claims;
  }

  private async parseClaimRow(cells: any[]): Promise<OASISClaim | null> {
    try {
      // This is a template - actual implementation depends on OASIS table structure
      // You'll need to adjust column indices based on actual data
      const claimNumber = await cells[0]?.textContent();
      const membershipNumber = await cells[1]?.textContent();
      const submissionDate = await cells[2]?.textContent();
      const status = await cells[3]?.textContent();
      const totalAmount = await cells[4]?.textContent();

      if (!claimNumber) return null;

      return {
        claimNumber: claimNumber.trim(),
        membershipNumber: membershipNumber?.trim() || '',
        providerNumber: '',
        patientName: {
          first: '',
          last: '',
        },
        patientNationalId: '',
        dateOfBirth: '',
        gender: 'M',
        claimType: 'OP',
        submissionDate: submissionDate?.trim() || '',
        encounterDate: '',
        totalAmount: parseFloat(totalAmount?.replace(/[^0-9.]/g, '') || '0'),
        netAmount: 0,
        vatAmount: 0,
        status: this.mapStatus(status?.trim() || ''),
        items: [],
      };
    } catch (error) {
      logger.warn({ error }, 'Failed to parse claim row');
      return null;
    }
  }

  private async extractTotalCount(page: Page): Promise<number> {
    // Look for pagination or result count text
    const countSelectors = [
      '.total-count',
      '.result-count',
      '[class*="count"]',
      'text=/Total:.*\\d+/i',
      'text=/\\d+.*results?/i',
    ];

    for (const selector of countSelectors) {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        const match = text?.match(/\d+/);
        if (match) {
          return parseInt(match[0]);
        }
      }
    }

    // If no count found, return number of rows
    const rows = await page.$$('table tbody tr');
    return rows.length;
  }

  private async navigateToClaimDetails(page: Page, claimNumber: string): Promise<void> {
    // Click on claim number link
    const claimLink = await page.$(`a:has-text("${claimNumber}")`);
    if (claimLink) {
      await claimLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      throw new OASISDataError(`Could not find claim details for ${claimNumber}`);
    }
  }

  private async extractRejectionFromPage(page: Page, claim: OASISClaim): Promise<OASISRejection | null> {
    try {
      // Extract rejection details from the page
      // This is a template - adjust based on actual OASIS structure
      const rejectionCode = await this.extractFieldValue(page, ['rejection code', 'code']);
      const rejectionReason = await this.extractFieldValue(page, ['rejection reason', 'reason']);
      const rejectionDate = await this.extractFieldValue(page, ['rejection date', 'rejected on']);

      if (!rejectionCode || !rejectionReason) {
        return null;
      }

      const rejection: OASISRejection = {
        claimNumber: claim.claimNumber,
        rejectionId: `${claim.claimNumber}-${Date.now()}`,
        rejectionDate: rejectionDate || new Date().toISOString(),
        rejectionType: 'FULL',
        rejectionCode: rejectionCode,
        rejectionReason: rejectionReason,
        category: this.categorizeRejection(rejectionCode),
        rejectedAmount: {
          net: claim.netAmount,
          vat: claim.vatAmount,
          total: claim.totalAmount,
        },
        payerName: '',
        payerCode: '',
        appealable: true,
      };

      return rejection;
    } catch (error) {
      logger.error({ error, claimNumber: claim.claimNumber }, 'Failed to extract rejection from page');
      return null;
    }
  }

  private async findField(page: Page, patterns: string[]): Promise<string | null> {
    for (const pattern of patterns) {
      const field = await page.$(`input[name*="${pattern}" i], input[id*="${pattern}" i]`);
      if (field) {
        const name = await field.getAttribute('name');
        const id = await field.getAttribute('id');
        return name ? `input[name="${name}"]` : `input[id="${id}"]`;
      }
    }
    return null;
  }

  private async findDateField(page: Page, patterns: string[]): Promise<string | null> {
    for (const pattern of patterns) {
      const field = await page.$(`input[type="date"][name*="${pattern}" i], input[type="date"][id*="${pattern}" i]`);
      if (field) {
        const name = await field.getAttribute('name');
        const id = await field.getAttribute('id');
        return name ? `input[name="${name}"]` : `input[id="${id}"]`;
      }
    }
    return null;
  }

  private async findSelectField(page: Page, patterns: string[]): Promise<string | null> {
    for (const pattern of patterns) {
      const field = await page.$(`select[name*="${pattern}" i], select[id*="${pattern}" i]`);
      if (field) {
        const name = await field.getAttribute('name');
        const id = await field.getAttribute('id');
        return name ? `select[name="${name}"]` : `select[id="${id}"]`;
      }
    }
    return null;
  }

  private async extractFieldValue(page: Page, labels: string[]): Promise<string | null> {
    for (const label of labels) {
      // Try to find by label
      const labelElement = await page.$(`label:has-text("${label}"), th:has-text("${label}"), td:has-text("${label}")`);
      if (labelElement) {
        // Get the next element (should be the value)
        const valueElement = await page.evaluateHandle(
          (el) => el.nextElementSibling,
          labelElement
        );
        const value = await valueElement.evaluate((el) => el?.textContent?.trim());
        if (value) return value;
      }
    }
    return null;
  }

  private mapStatus(status: string): OASISClaim['status'] {
    const statusLower = status.toLowerCase();

    if (statusLower.includes('reject')) return 'REJECTED';
    if (statusLower.includes('approv')) return 'APPROVED';
    if (statusLower.includes('pending') || statusLower.includes('wait')) return 'PENDING';
    if (statusLower.includes('review')) return 'UNDER_REVIEW';

    return 'SUBMITTED';
  }

  private categorizeRejection(code: string): OASISRejection['category'] {
    // Categorize based on rejection code prefix or pattern
    if (code.startsWith('M')) return 'MEDICAL';
    if (code.startsWith('T')) return 'TECHNICAL';
    if (code.startsWith('A')) return 'ADMINISTRATIVE';
    if (code.startsWith('B')) return 'BILLING';
    if (code.startsWith('AUTH')) return 'AUTHORIZATION';

    return 'TECHNICAL'; // default
  }
}
