import { createAsyncThunk } from '@reduxjs/toolkit';
import { 
  fetchAppById, 
  fetchAppBySlug, 
  fetchTransformedAppAndApplets 
} from '../service/app-runtime-service';
import { 
  setAppRuntimeConfig, 
  setAppRuntimeLoading, 
  resetAppRuntimeConfig 
} from '../slices/customAppRuntimeSlice';
import { 
  setAppletRuntimeConfig, 
  setAppletRuntimeLoading, 
  resetAppletRuntimeConfig 
} from '../slices/customAppletRuntimeSlice';
import { 
  validateAppWithApplets, 
  ValidationOptions,
  ValidationResult
} from '../validations/appRunnerValidations';
import { setBrokerMap } from '../slices/brokerSlice';

// Object to store validation results for retrieval later
const validationStore: Record<string, ValidationResult> = {};

/**
 * Runs validations asynchronously without blocking the main thread
 */
function runDeferredValidations(
  appConfig: any, 
  applets: any[], 
  options: ValidationOptions, 
  storeKey: string
): void {
  // Use setTimeout to defer validation to next tick
  setTimeout(() => {
    try {
      console.log('Running deferred validations for:', storeKey);
      const validationResult = validateAppWithApplets(appConfig, applets, options);
      validationStore[storeKey] = validationResult;
      console.log('Validation complete:', validationResult.issues.length, 'issues found');
    } catch (error) {
      console.error('Background validation error:', error);
    }
  }, 0);
}

/**
 * Get validation results for a specific app
 */
export function getValidationResults(appId: string): ValidationResult | null {
  return validationStore[appId] || null;
}

/**
 * Thunk to fetch app data by ID and populate both the app and applet slices
 */
export const fetchAppWithApplets = createAsyncThunk(
  'appRunner/fetchAppWithApplets',
  async ({ 
    idOrSlug, 
    isSlug = true, 
    defaultAppletId = null,
    validationOptions = { runValidations: true, logResults: true } 
  }: { 
    idOrSlug: string; 
    isSlug?: boolean;
    defaultAppletId?: string | null;
    validationOptions?: ValidationOptions;
  }, { dispatch }) => {
    
    try {
      // Reset both slices and set loading state
      dispatch(resetAppRuntimeConfig());
      dispatch(resetAppletRuntimeConfig());
      dispatch(setAppRuntimeLoading());
      dispatch(setAppletRuntimeLoading());
      
      const { appConfig, applets } = await fetchTransformedAppAndApplets(idOrSlug, isSlug);
      const activeAppletId = determineActiveAppletId(appConfig, applets, defaultAppletId);
      
      // Extract and set broker mappings from all applets
      const brokerMappings = applets.reduce((acc, applet) => {
        if (applet.brokerMap) {
          applet.brokerMap.forEach(mapping => {
            acc.push({
              source: 'applet',
              sourceId: applet.id,
              itemId: mapping.fieldId,
              brokerId: mapping.brokerId
            });
          });
        }
        return acc;
      }, [] as Array<{ source: string; sourceId: string; itemId: string; brokerId: string }>);
      
      dispatch(setBrokerMap(brokerMappings));
      
      dispatch(setAppRuntimeConfig(appConfig));
      dispatch(setAppletRuntimeConfig({ 
        applets, 
        activeAppletId 
      }));
      
      // Run validations in the background *after* app is loaded
      if (validationOptions.runValidations) {
        runDeferredValidations(appConfig, applets, validationOptions, appConfig.id);
      }
      
      return { 
        appConfig, 
        applets, 
        activeAppletId
      };
    } catch (error) {
      console.error('Error in fetchAppWithApplets thunk:', error);
      // Reset both slices on error
      dispatch(resetAppRuntimeConfig());
      dispatch(resetAppletRuntimeConfig());
      throw error;
    }
  }
);

/**
 * Helper function to determine which applet should be active initially
 */
function determineActiveAppletId(
  appConfig: any, 
  applets: any[], 
  defaultAppletId: string | null
): string | null {
  // If a specific applet ID was requested, use that if it exists
  if (defaultAppletId && applets.some(applet => applet.id === defaultAppletId)) {
    return defaultAppletId;
  }
  
  // If there's an appletList in the appConfig, use the first one
  if (appConfig.appletList && appConfig.appletList.length > 0) {
    const firstAppletId = appConfig.appletList[0].appletId;
    if (applets.some(applet => applet.id === firstAppletId)) {
      return firstAppletId;
    }
  }
  
  // Otherwise, use the first applet in the list if available
  return applets.length > 0 ? applets[0].id : null;
} 