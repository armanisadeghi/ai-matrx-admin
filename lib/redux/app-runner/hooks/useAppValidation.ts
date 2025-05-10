'use client';

import { useMemo, useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectAppRuntimeConfig } from '../slices/customAppRuntimeSlice';
import { selectAppletRuntimeApplets } from '../slices/customAppletRuntimeSlice';
import { 
  validateAppWithApplets, 
  ValidationOptions, 
  ValidationResult 
} from '../validations/appRunnerValidations';
import { getValidationResults } from '../thunks/appRunnerThunks';

/**
 * Hook to validate the current app and applets
 * @param options Validation options
 * @returns Validation result
 */
export function useAppValidation(
  options: ValidationOptions = { runValidations: true, logResults: false }
): ValidationResult {
  const appConfig = useAppSelector(selectAppRuntimeConfig);
  const applets = useAppSelector(selectAppletRuntimeApplets);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ 
    valid: true, 
    issues: [] 
  });
  
  // Convert applets record to array
  const appletArray = useMemo(() => 
    Object.values(applets), 
    [applets]
  );
  
  useEffect(() => {
    if (!appConfig) {
      setValidationResult({ 
        valid: false, 
        issues: [{ 
          code: 'APP_CONFIG_MISSING', 
          message: 'App configuration is not loaded', 
          severity: 'error' as const
        }]
      });
      return;
    }
    
    // Check if we have cached validation results
    const storedResults = getValidationResults(appConfig.id);
    
    if (storedResults) {
      // Use stored results if available
      setValidationResult(storedResults);
    } else if (options.runValidations) {
      // If we need to run validations but don't have stored results yet,
      // set up a polling interval to check for results
      const checkInterval = setInterval(() => {
        const results = getValidationResults(appConfig.id);
        if (results) {
          setValidationResult(results);
          clearInterval(checkInterval);
        }
      }, 200); // Check every 200ms
      
      // Clear interval on cleanup
      return () => clearInterval(checkInterval);
    }
  }, [appConfig, options.runValidations]);
  
  return validationResult;
}

/**
 * Hook to get a count of validation issues by severity
 */
export function useValidationSummary(
  options: ValidationOptions = { runValidations: true, logResults: false }
): { 
  errors: number; 
  warnings: number; 
  infos: number; 
  total: number;
  isValid: boolean;
} {
  const { issues, valid } = useAppValidation(options);
  
  const summary = useMemo(() => {
    const errors = issues.filter(issue => issue.severity === 'error').length;
    const warnings = issues.filter(issue => issue.severity === 'warning').length;
    const infos = issues.filter(issue => issue.severity === 'info').length;
    
    return {
      errors,
      warnings,
      infos,
      total: issues.length,
      isValid: valid
    };
  }, [issues, valid]);
  
  return summary;
} 