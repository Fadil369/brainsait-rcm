/**
 * Claims Oasis - New Claim Submission Page
 * 
 * Derived from Tailwind mobile mock-ups (claim-oaises-2.html)
 * Real-time validation with denial risk scoring
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClaimsValidation } from '@/hooks/useClaimsValidation';
import { ClaimValidationRequest } from '@brainsait/shared-models';
import { RiskScoreCard } from '@/components/claims/RiskScoreCard';
import { ValidationIssuesList } from '@/components/claims/ValidationIssuesList';
import { DocumentUpload } from '@/components/claims/DocumentUpload';

export default function NewClaimPage() {
  const router = useRouter();
  const { validateClaim, isValidating } = useClaimsValidation();
  
  const [formData, setFormData] = useState<Partial<ClaimValidationRequest>>({
    patientId: '',
    payerId: '',
    serviceDate: '',
    icdCodes: [],
    cptCodes: [],
    totalAmount: 0,
    providerId: '',
    documentation: {}
  });
  
  const [validationResult, setValidationResult] = useState<any>(null);
  const [currentIcdCode, setCurrentIcdCode] = useState('');
  const [currentCptCode, setCurrentCptCode] = useState('');
  
  const handleAddIcdCode = () => {
    if (currentIcdCode.trim()) {
      setFormData(prev => ({
        ...prev,
        icdCodes: [...(prev.icdCodes || []), currentIcdCode.trim()]
      }));
      setCurrentIcdCode('');
    }
  };
  
  const handleAddCptCode = () => {
    if (currentCptCode.trim()) {
      setFormData(prev => ({
        ...prev,
        cptCodes: [...(prev.cptCodes || []), currentCptCode.trim()]
      }));
      setCurrentCptCode('');
    }
  };
  
  const handleRemoveIcdCode = (index: number) => {
    setFormData(prev => ({
      ...prev,
      icdCodes: prev.icdCodes?.filter((_, i) => i !== index) || []
    }));
  };
  
  const handleRemoveCptCode = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cptCodes: prev.cptCodes?.filter((_, i) => i !== index) || []
    }));
  };
  
  const handleValidate = async () => {
    try {
      const result = await validateClaim(formData as ClaimValidationRequest);
      setValidationResult(result);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };
  
  const handleSubmit = async () => {
    // TODO: Submit claim to backend
    console.log('Submitting claim:', formData);
    router.push('/claims');
  };
  
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4">
          <button 
            onClick={() => router.back()}
            className="text-foreground-light dark:text-foreground-dark"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-center flex-1 text-foreground-light dark:text-foreground-dark">
            New Claim Submission
          </h1>
          <div className="w-8"></div>
        </div>
      </header>
      
      <main className="p-4 space-y-6 pb-24">
        {/* Patient Information Section */}
        <section>
          <h2 className="text-lg font-bold text-foreground-light dark:text-foreground-dark mb-4">
            Patient Information
          </h2>
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="patient-id" 
                className="block text-sm font-medium text-muted-light dark:text-muted-dark mb-1"
              >
                Patient ID (National ID)*
              </label>
              <input
                id="patient-id"
                type="text"
                className="w-full h-12 px-4 rounded-lg bg-input-light dark:bg-input-dark text-foreground-light dark:text-foreground-dark border-transparent focus:border-primary focus:ring-primary"
                placeholder="10-digit National ID"
                value={formData.patientId}
                onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                maxLength={10}
              />
            </div>
            
            <div>
              <label 
                htmlFor="service-date" 
                className="block text-sm font-medium text-muted-light dark:text-muted-dark mb-1"
              >
                Date of Service*
              </label>
              <input
                id="service-date"
                type="date"
                className="w-full h-12 px-4 rounded-lg bg-input-light dark:bg-input-dark text-foreground-light dark:text-foreground-dark border-transparent focus:border-primary focus:ring-primary"
                value={formData.serviceDate}
                onChange={(e) => setFormData({...formData, serviceDate: e.target.value})}
              />
            </div>
          </div>
        </section>
        
        {/* Claim Details Section */}
        <section>
          <h2 className="text-lg font-bold text-foreground-light dark:text-foreground-dark mb-4">
            Claim Details
          </h2>
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="payer" 
                className="block text-sm font-medium text-muted-light dark:text-muted-dark mb-1"
              >
                Payer*
              </label>
              <select
                id="payer"
                className="form-select w-full h-12 px-4 rounded-lg bg-input-light dark:bg-input-dark text-foreground-light dark:text-foreground-dark border-transparent focus:border-primary focus:ring-primary"
                value={formData.payerId}
                onChange={(e) => setFormData({...formData, payerId: e.target.value})}
              >
                <option value="">Select a Payer</option>
                <option value="PAYER_A">Payer A - Bupa Arabia</option>
                <option value="PAYER_B">Payer B - Tawuniya</option>
                <option value="PAYER_C">Payer C - MedGulf</option>
              </select>
            </div>
            
            <div>
              <label 
                htmlFor="provider-id" 
                className="block text-sm font-medium text-muted-light dark:text-muted-dark mb-1"
              >
                Provider/Facility*
              </label>
              <select
                id="provider-id"
                className="form-select w-full h-12 px-4 rounded-lg bg-input-light dark:bg-input-dark text-foreground-light dark:text-foreground-dark border-transparent focus:border-primary focus:ring-primary"
                value={formData.providerId}
                onChange={(e) => setFormData({...formData, providerId: e.target.value})}
              >
                <option value="">Select Provider</option>
                <option value="HNH_UNAIZAH">HNH Unaizah</option>
                <option value="HNH_MADINAH">HNH Madinah</option>
                <option value="HNH_KHAMIS">HNH Khamis Mushait</option>
                <option value="HNH_JAZAN">HNH Jazan</option>
              </select>
            </div>
            
            <div>
              <label 
                htmlFor="claim-amount" 
                className="block text-sm font-medium text-muted-light dark:text-muted-dark mb-1"
              >
                Total Claim Amount (SAR)*
              </label>
              <input
                id="claim-amount"
                type="number"
                className="w-full h-12 px-4 rounded-lg bg-input-light dark:bg-input-dark text-foreground-light dark:text-foreground-dark border-transparent focus:border-primary focus:ring-primary"
                placeholder="Enter Amount"
                value={formData.totalAmount || ''}
                onChange={(e) => setFormData({...formData, totalAmount: parseFloat(e.target.value)})}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </section>
        
        {/* Diagnosis & Procedures Section */}
        <section>
          <h2 className="text-lg font-bold text-foreground-light dark:text-foreground-dark mb-4">
            Diagnosis & Procedures (NPHIES)
          </h2>
          <div className="space-y-4">
            {/* ICD Codes */}
            <div>
              <label 
                htmlFor="icd-code" 
                className="block text-sm font-medium text-muted-light dark:text-muted-dark mb-1"
              >
                ICD-10 Diagnosis Codes*
              </label>
              <div className="flex gap-2">
                <input
                  id="icd-code"
                  type="text"
                  className="flex-1 h-12 px-4 rounded-lg bg-input-light dark:bg-input-dark text-foreground-light dark:text-foreground-dark border-transparent focus:border-primary focus:ring-primary"
                  placeholder="e.g., J45.0"
                  value={currentIcdCode}
                  onChange={(e) => setCurrentIcdCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddIcdCode()}
                />
                <button
                  onClick={handleAddIcdCode}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
              {formData.icdCodes && formData.icdCodes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.icdCodes.map((code, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 dark:bg-primary/20 text-primary rounded-full text-sm"
                    >
                      {code}
                      <button
                        onClick={() => handleRemoveIcdCode(index)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* CPT Codes */}
            <div>
              <label 
                htmlFor="cpt-code" 
                className="block text-sm font-medium text-muted-light dark:text-muted-dark mb-1"
              >
                CPT Procedure Codes*
              </label>
              <div className="flex gap-2">
                <input
                  id="cpt-code"
                  type="text"
                  className="flex-1 h-12 px-4 rounded-lg bg-input-light dark:bg-input-dark text-foreground-light dark:text-foreground-dark border-transparent focus:border-primary focus:ring-primary"
                  placeholder="e.g., 99213"
                  value={currentCptCode}
                  onChange={(e) => setCurrentCptCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCptCode()}
                />
                <button
                  onClick={handleAddCptCode}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
              {formData.cptCodes && formData.cptCodes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.cptCodes.map((code, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 dark:bg-primary/20 text-primary rounded-full text-sm"
                    >
                      {code}
                      <button
                        onClick={() => handleRemoveCptCode(index)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
        
        {/* Documentation Section */}
        <section>
          <h2 className="text-lg font-bold text-foreground-light dark:text-foreground-dark mb-4">
            Supporting Documentation
          </h2>
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="preauth-number" 
                className="block text-sm font-medium text-muted-light dark:text-muted-dark mb-1"
              >
                Pre-Authorization Number
              </label>
              <input
                id="preauth-number"
                type="text"
                className="w-full h-12 px-4 rounded-lg bg-input-light dark:bg-input-dark text-foreground-light dark:text-foreground-dark border-transparent focus:border-primary focus:ring-primary"
                placeholder="Enter Pre-Auth Number (if applicable)"
                value={formData.documentation?.preAuthNumber || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  documentation: {
                    ...formData.documentation,
                    preAuthNumber: e.target.value
                  }
                })}
              />
            </div>
            
            <DocumentUpload
              onUpload={(files) => {
                console.log('Files uploaded:', files);
                // TODO: Handle file upload
              }}
            />
          </div>
        </section>
        
        {/* Validation Result */}
        {validationResult && (
          <>
            <RiskScoreCard 
              score={validationResult.denialRiskScore}
              riskLevel={validationResult.riskLevel}
              compliance={validationResult.compliance}
            />
            
            {validationResult.issues && validationResult.issues.length > 0 && (
              <ValidationIssuesList issues={validationResult.issues} />
            )}
          </>
        )}
      </main>
      
      {/* Fixed Bottom Actions */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background-light dark:bg-background-dark border-t border-input-light dark:border-input-dark">
        <div className="flex gap-3">
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex-1 h-12 rounded-lg border-2 border-primary text-primary font-semibold disabled:opacity-50"
          >
            {isValidating ? 'Validating...' : 'Validate Claim'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!validationResult || validationResult.status === 'error'}
            className="flex-1 h-12 rounded-lg bg-primary text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Claim
          </button>
        </div>
      </footer>
    </div>
  );
}
