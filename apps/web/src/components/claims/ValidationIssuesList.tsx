/**
 * ValidationIssuesList Component
 * 
 * Displays validation issues with severity indicators
 * Includes suggestions for issue resolution
 */
'use client';

import { ValidationIssue, IssueSeverity } from '@brainsait/shared-models';

interface ValidationIssuesListProps {
  issues: ValidationIssue[];
}

export function ValidationIssuesList({ issues }: ValidationIssuesListProps) {
  const getSeverityIcon = (severity: IssueSeverity) => {
    switch (severity) {
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'INFO':
        return 'info';
      default:
        return 'help';
    }
  };
  
  const getSeverityColor = (severity: IssueSeverity) => {
    switch (severity) {
      case 'ERROR':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'WARNING':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'INFO':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20';
    }
  };
  
  if (issues.length === 0) {
    return null;
  }
  
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-bold text-foreground-light dark:text-foreground-dark">
        Validation Issues ({issues.length})
      </h3>
      
      <div className="space-y-2">
        {issues.map((issue, index) => (
          <div 
            key={index}
            className="bg-background-light dark:bg-background-dark rounded-lg border border-input-light dark:border-input-dark p-4"
          >
            <div className="flex items-start gap-3">
              <span className={`material-symbols-outlined ${getSeverityColor(issue.severity)} p-1 rounded`}>
                {getSeverityIcon(issue.severity)}
              </span>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-foreground-light dark:text-foreground-dark">
                    {issue.message}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </div>
                
                {issue.field && (
                  <p className="text-sm text-muted-light dark:text-muted-dark mb-2">
                    Field: <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">{issue.field}</code>
                  </p>
                )}
                
                {issue.code && (
                  <p className="text-sm text-muted-light dark:text-muted-dark mb-2">
                    Error Code: <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">{issue.code}</code>
                  </p>
                )}
                
                {issue.suggestion && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-medium">💡 Suggestion:</span> {issue.suggestion}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
