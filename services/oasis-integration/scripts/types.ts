/**
 * OASIS+ Discovery Types
 */

export interface FormField {
  name: string;
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface FormStructure {
  name: string;
  action: string;
  method: string;
  fields: FormField[];
}

export interface ButtonStructure {
  text: string;
  id: string;
  type: string;
  disabled: boolean;
}

export interface LinkStructure {
  text: string;
  href: string;
}

export interface TableStructure {
  headers: string[];
  rowCount: number;
}

export interface PageStructure {
  url: string;
  title: string;
  forms: FormStructure[];
  buttons: ButtonStructure[];
  links: LinkStructure[];
  tables: TableStructure[];
}

export interface APIEndpoint {
  url: string;
  method: string;
  headers: Record<string, string>;
  requestBody?: any;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody?: any;
  timestamp: string;
}

export interface DiscoveryResult {
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