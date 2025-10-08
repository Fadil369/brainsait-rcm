/**
 * OASIS+ Page Analysis Module
 */

import { Page } from 'playwright';
import { PageStructure, FormField, FormStructure } from './types';

export class PageAnalyzer {
  constructor(private page: Page) {}

  async analyzePageStructure(pageName: string): Promise<PageStructure> {
    console.log(`   📄 Analyzing ${pageName} page structure...`);

    const structure: PageStructure = {
      url: this.page.url(),
      title: await this.page.title(),
      forms: [],
      buttons: [],
      links: [],
      tables: [],
    };

    // Extract forms and their fields
    const forms = await this.page.$$('form');
    for (const form of forms) {
      const formName = await form.getAttribute('name') || await form.getAttribute('id') || `form-${forms.indexOf(form)}`;
      const formAction = await form.getAttribute('action') || '';
      const formMethod = await form.getAttribute('method') || 'GET';

      const fields: FormField[] = [];
      const inputs = await form.$$('input, select, textarea');

      for (const input of inputs) {
        const name = await input.getAttribute('name') || '';
        const id = await input.getAttribute('id') || '';
        const type = await input.getAttribute('type') || await input.tagName().toLowerCase();
        const placeholder = await input.getAttribute('placeholder') || '';
        const required = await input.getAttribute('required') !== null;
        const defaultValue = await input.getAttribute('value') || '';

        // Get label
        let label = '';
        if (id) {
          const labelElement = await this.page.$(`label[for="${id}"]`);
          if (labelElement) {
            label = await labelElement.textContent() || '';
          }
        }

        const field: FormField = {
          name,
          id,
          type,
          label: label.trim(),
          required,
          placeholder,
          defaultValue,
        };

        // Handle select options
        if (type === 'select') {
          const options = await input.$$eval('option', (opts) =>
            opts.map((opt) => opt.textContent?.trim() || '')
          );
          field.options = options.filter(Boolean);
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
}