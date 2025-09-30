/**
 * BrainSAIT Claims Engine
 * Core claims processing logic and business rules
 */

export interface ClaimProcessor {
  processClaim(claimData: any): Promise<ProcessingResult>;
  validateClaim(claimData: any): ValidationResult;
  calculateMetrics(claimData: any): ClaimMetrics;
}

export interface ProcessingResult {
  success: boolean;
  claimId: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  rejectionReason?: string;
  processedAmount: number;
  errors?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ClaimMetrics {
  billedAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  rejectionRate: number;
  processingTime: number;
}

/**
 * Default Claims Processor Implementation
 */
export class DefaultClaimProcessor implements ClaimProcessor {
  async processClaim(claimData: any): Promise<ProcessingResult> {
    // Validate claim
    const validation = this.validateClaim(claimData);

    if (!validation.valid) {
      return {
        success: false,
        claimId: claimData.id || 'unknown',
        status: 'REJECTED',
        rejectionReason: validation.errors.join(', '),
        processedAmount: 0,
        errors: validation.errors
      };
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(claimData);

    // Process claim (simplified for now)
    return {
      success: true,
      claimId: claimData.id,
      status: 'APPROVED',
      processedAmount: metrics.approvedAmount,
    };
  }

  validateClaim(claimData: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!claimData.id) errors.push('Claim ID is required');
    if (!claimData.patient_id) errors.push('Patient ID is required');
    if (!claimData.provider_id) errors.push('Provider ID is required');
    if (!claimData.billed_amount || claimData.billed_amount <= 0) {
      errors.push('Valid billed amount is required');
    }

    // Check for required financial breakdown
    if (claimData.billed_amount && !claimData.billed_amount.net) {
      warnings.push('Missing net amount breakdown');
    }
    if (claimData.billed_amount && !claimData.billed_amount.vat) {
      warnings.push('Missing VAT breakdown');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  calculateMetrics(claimData: any): ClaimMetrics {
    const billedAmount = typeof claimData.billed_amount === 'number'
      ? claimData.billed_amount
      : claimData.billed_amount?.total || 0;

    const rejectedAmount = typeof claimData.rejected_amount === 'number'
      ? claimData.rejected_amount
      : claimData.rejected_amount?.total || 0;

    const approvedAmount = billedAmount - rejectedAmount;
    const rejectionRate = billedAmount > 0 ? (rejectedAmount / billedAmount) * 100 : 0;

    return {
      billedAmount,
      approvedAmount,
      rejectedAmount,
      rejectionRate,
      processingTime: Date.now()
    };
  }
}

/**
 * Factory function to create claim processor
 */
export function createClaimProcessor(): ClaimProcessor {
  return new DefaultClaimProcessor();
}

// Export types
export * from './types';