'use client';

import React from 'react';
import PreferenceModuleWrapper from './PreferenceModuleWrapper';
import PromptsPreferences from './PromptsPreferences';

interface StandalonePromptsPreferencesProps {
    onSaveSuccess?: () => void;
    onCancel?: () => void;
    showFooter?: boolean;
}

/**
 * Standalone Prompts Preferences with its own save/cancel functionality
 * 
 * Use this component when you want to show just the prompts preferences
 * with save/cancel buttons (e.g., in a modal or dedicated section)
 * 
 * @example
 * ```tsx
 * <StandalonePromptsPreferences 
 *   onSaveSuccess={() => {
 *     toast.success('Preferences saved!');
 *     closeModal();
 *   }}
 *   onCancel={() => closeModal()}
 * />
 * ```
 */
const StandalonePromptsPreferences: React.FC<StandalonePromptsPreferencesProps> = ({
    onSaveSuccess,
    onCancel,
    showFooter = true
}) => {
    return (
        <PreferenceModuleWrapper 
            module="prompts" 
            showFooter={showFooter}
            onSaveSuccess={onSaveSuccess}
            onCancel={onCancel}
        >
            <PromptsPreferences />
        </PreferenceModuleWrapper>
    );
};

export default StandalonePromptsPreferences;

