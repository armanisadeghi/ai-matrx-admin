'use client';

import React, { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RotateCcw, AlertCircle, Check } from 'lucide-react';
import { RootState, useAppDispatch } from '@/lib/redux';
import {
    UserPreferencesState,
    UserPreferences,
    saveModulePreferencesToDatabase,
    resetModulePreferences,
    clearError
} from '@/lib/redux/slices/userPreferencesSlice';

interface PreferenceModuleWrapperProps {
    module: keyof UserPreferences;
    children: ReactNode;
    showFooter?: boolean;
    onSaveSuccess?: () => void;
    onCancel?: () => void;
}

/**
 * Wrapper component that adds save/cancel functionality to individual preference modules
 * 
 * @example
 * ```tsx
 * <PreferenceModuleWrapper module="prompts" onSaveSuccess={() => console.log('Saved!')}>
 *   <PromptsPreferences />
 * </PreferenceModuleWrapper>
 * ```
 */
const PreferenceModuleWrapper: React.FC<PreferenceModuleWrapperProps> = ({
    module,
    children,
    showFooter = true,
    onSaveSuccess,
    onCancel
}) => {
    const dispatch = useAppDispatch();
    const preferences = useSelector((state: RootState) => state.userPreferences as UserPreferencesState);
    const { _meta } = preferences;

    // Safety check for _meta
    const meta = _meta || {
        isLoading: false,
        error: null,
        lastSaved: null,
        hasUnsavedChanges: false,
        loadedPreferences: null,
    };

    const handleSave = async () => {
        try {
            const modulePreferences = preferences[module];
            const result = await dispatch(saveModulePreferencesToDatabase({ 
                module, 
                preferences: modulePreferences 
            })).unwrap();
            
            if (onSaveSuccess) {
                onSaveSuccess();
            }
        } catch (error) {
            console.error(`Failed to save ${module} preferences:`, error);
        }
    };

    const handleReset = () => {
        dispatch(resetModulePreferences(module));
    };

    const handleClearError = () => {
        dispatch(clearError());
    };

    const handleCancel = () => {
        // Reset to loaded preferences
        dispatch(resetModulePreferences(module));
        if (onCancel) {
            onCancel();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Error Alert */}
            {meta.error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex justify-between items-center">
                        <span>Error: {meta.error}</span>
                        <Button 
                            onClick={handleClearError} 
                            size="sm" 
                            variant="ghost"
                            className="text-xs h-auto py-1"
                        >
                            Dismiss
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>

            {/* Footer with Save/Cancel */}
            {showFooter && (
                <div className="flex flex-col sm:flex-row justify-between items-center border-t bg-muted/10 px-4 py-3 gap-3 mt-4 shrink-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto">
                        {meta.isLoading && (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Saving changes...</span>
                            </div>
                        )}
                        {meta.lastSaved && !meta.hasUnsavedChanges && !meta.isLoading && (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <Check className="h-4 w-4" />
                                <span>Changes saved</span>
                            </div>
                        )}
                        {meta.hasUnsavedChanges && !meta.isLoading && (
                            <span className="text-amber-600 dark:text-amber-400">
                                Unsaved changes
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            disabled={meta.isLoading}
                            className="gap-2 flex-1 sm:flex-none"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={!meta.hasUnsavedChanges || meta.isLoading}
                            className="gap-2 flex-1 sm:flex-none"
                        >
                            {meta.isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreferenceModuleWrapper;

