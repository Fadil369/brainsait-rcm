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
interface FormField {
    name: string;
    id: string;
    type: string;
    label: string;
    required: boolean;
    placeholder?: string;
    defaultValue?: string;
    options?: Array<{
        value: string;
        text: string;
    }>;
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
declare class OASISDiscovery {
    private browser;
    private context;
    private page;
    private result;
    private apiCalls;
    constructor();
    private createEmptyPageStructure;
    initialize(): Promise<void>;
    private setupNetworkInterception;
    screenshot(name: string): Promise<string>;
    handleSSLWarnings(): Promise<void>;
    analyzePageStructure(pageName: string): Promise<PageStructure>;
    analyzeLoginPage(): Promise<void>;
    performLogin(): Promise<void>;
    discoverHomePage(): Promise<void>;
    navigateToClaimSubmission(): Promise<void>;
    exploreAdditionalPages(): Promise<void>;
    captureCookiesAndSession(): Promise<void>;
    generateDocumentation(): Promise<void>;
    private generateMarkdown;
    private generateTypeScript;
    private toPascalCase;
    private mapFieldTypeToTS;
    private findFieldByType;
    private findSubmitButton;
    cleanup(): Promise<void>;
    run(): Promise<void>;
}
export { OASISDiscovery, DiscoveryResult };
