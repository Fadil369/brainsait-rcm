/**
 * useClaimsValidation Hook
 * 
 * React hook for claim validation API calls
 * Handles request/response with shared types from @brainsait/shared-models
 */
'use client';

import { useState } from 'react';
import { ClaimValidationRequest, ClaimValidationResponse } from '@brainsait/shared-models';

interface UseClaimsValidationReturn {
  validateClaim: (request: ClaimValidationRequest) => Promise<ClaimValidationResponse>;
  isValidating: boolean;
  error: Error | null;
}

export function useClaimsValidation(): UseClaimsValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const validateClaim = async (request: ClaimValidationRequest): Promise<ClaimValidationResponse> => {
    setIsValidating(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API endpoint from environment variables
      const apiUrl = process.env.NEXT_PUBLIC_CLAIMS_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/v1/claims/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication header
          // 'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }
      
      const data: ClaimValidationResponse = await response.json();
      
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      throw error;
    } finally {
      setIsValidating(false);
    }
  };
  
  return {
    validateClaim,
    isValidating,
    error,
  };
}
