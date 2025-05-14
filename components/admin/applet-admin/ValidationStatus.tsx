'use client';

import { useState } from 'react';
import { useValidationSummary, useAppValidation } from '@/lib/redux/app-runner/hooks/useAppValidation';
import { ValidationOptions, ValidationIssue } from '@/lib/redux/app-runner/validations/appRunnerValidations';

interface ValidationStatusProps {
  options?: ValidationOptions;
  showDetails?: boolean;
}

export default function ValidationStatus({ 
  options = { runValidations: true, logResults: false },
  showDetails = false 
}: ValidationStatusProps) {
  const { errors, warnings, infos, total, isValid } = useValidationSummary(options);
  const [expanded, setExpanded] = useState(false);
  const { issues } = useAppValidation(options);
  
  if (!options.runValidations || total === 0) {
    return null;
  }
  
  return (
    <div className="mt-2 p-2 border border-zinc-300 dark:border-zinc-700 rounded">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {errors > 0 && (
            <span className="text-sm px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
              {errors} {errors === 1 ? 'Error' : 'Errors'}
            </span>
          )}
          
          {warnings > 0 && (
            <span className="text-sm px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">
              {warnings} {warnings === 1 ? 'Warning' : 'Warnings'}
            </span>
          )}
          
          {infos > 0 && (
            <span className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              {infos} {infos === 1 ? 'Info' : 'Infos'}
            </span>
          )}
          
          {isValid && total === 0 && (
            <span className="text-sm px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
              No issues found
            </span>
          )}
        </div>
        
        {showDetails && total > 0 && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>
      
      {expanded && showDetails && (
        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
          {issues.map((issue, index) => (
            <IssueItem key={index} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueItem({ issue }: { issue: ValidationIssue }) {
  const [showData, setShowData] = useState(false);
  
  const bgColor = {
    error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
    warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
    info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  }[issue.severity];
  
  const textColor = {
    error: 'text-red-800 dark:text-red-200',
    warning: 'text-amber-800 dark:text-amber-200',
    info: 'text-blue-800 dark:text-blue-200',
  }[issue.severity];
  
  return (
    <div className={`p-2 border rounded ${bgColor}`}>
      <div className="flex justify-between">
        <div>
          <span className={`font-medium ${textColor}`}>{issue.code}</span>
          <p className="text-sm text-gray-700 dark:text-gray-300">{issue.message}</p>
        </div>
        
        {issue.data && (
          <button 
            onClick={() => setShowData(!showData)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {showData ? 'Hide Data' : 'Show Data'}
          </button>
        )}
      </div>
      
      {showData && issue.data && (
        <pre className="mt-1 p-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded overflow-x-auto">
          {JSON.stringify(issue.data, null, 2)}
        </pre>
      )}
    </div>
  );
} 