/**
 * RiskScoreCard Component
 * 
 * Visual display of denial risk score with color-coded severity
 * Includes compliance status indicators for NPHIES MDS
 */
'use client';

import { RiskLevel } from '@brainsait/shared-models';

interface RiskScoreCardProps {
  score: number;
  riskLevel: RiskLevel;
  compliance: {
    nphiesCompliant: boolean;
    payerRulesCompliant: boolean;
  };
}

export function RiskScoreCard({ score, riskLevel, compliance }: RiskScoreCardProps) {
  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'LOW':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'MEDIUM':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'CRITICAL':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20';
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-green-600 dark:text-green-400';
    if (score < 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score < 80) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  return (
    <section className="bg-background-light dark:bg-background-dark rounded-lg border border-input-light dark:border-input-dark p-6 space-y-4">
      <h3 className="text-lg font-bold text-foreground-light dark:text-foreground-dark">
        Denial Risk Assessment
      </h3>
      
      {/* Risk Score Display */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-light dark:text-muted-dark mb-1">Denial Risk Score</p>
          <p className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score.toFixed(1)}
          </p>
          <p className="text-sm text-muted-light dark:text-muted-dark">out of 100</p>
        </div>
        
        <div className={`px-4 py-2 rounded-full ${getRiskColor(riskLevel)}`}>
          <span className="font-semibold">{riskLevel}</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            score < 30 ? 'bg-green-500' :
            score < 60 ? 'bg-yellow-500' :
            score < 80 ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      
      {/* Compliance Badges */}
      <div className="flex gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
          compliance.nphiesCompliant 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          <span className="material-symbols-outlined text-base">
            {compliance.nphiesCompliant ? 'check_circle' : 'cancel'}
          </span>
          <span className="font-medium">NPHIES MDS</span>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
          compliance.payerRulesCompliant 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          <span className="material-symbols-outlined text-base">
            {compliance.payerRulesCompliant ? 'check_circle' : 'cancel'}
          </span>
          <span className="font-medium">Payer Rules</span>
        </div>
      </div>
    </section>
  );
}
