/**
 * useClaimsValidation Hook
 * 
 * React hook for claim validation API calls
 * Handles request/response with shared types from @brainsait/shared-models
 */
'use client';

import { useState } from 'react';

import { getAccessTokenSnapshot } from '@/lib/api';
import { ClaimValidationRequest, ClaimValidationResponse } from '@/types/claims';

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
      const rawUrl = process.env.NEXT_PUBLIC_CLAIMS_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://brainsait-rcm.pages.dev');
      let apiUrl: string;
      try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
          parsed.protocol = 'https:';
        }
        apiUrl = parsed.toString().replace(/\/$/, '');
      } catch (parseError) {
        console.warn('Invalid NEXT_PUBLIC_CLAIMS_API_URL value, falling back to provided string');
        apiUrl = rawUrl.replace(/\/$/, '');
      }

      const token = getAccessTokenSnapshot();

      const response = await fetch(`${apiUrl}/api/v1/claims/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
        credentials: 'include',
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
