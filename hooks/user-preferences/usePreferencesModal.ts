import { useState, useCallback } from 'react';
import { PreferenceTab } from '@/components/user-preferences/PreferencesPage';

interface UsePreferencesModalReturn {
    isOpen: boolean;
    activeTab: PreferenceTab | undefined;
    openPreferences: (tab?: PreferenceTab) => void;
    closePreferences: () => void;
}

/**
 * Hook to manage preferences modal state
 * 
 * @example
 * ```tsx
 * const { isOpen, activeTab, openPreferences, closePreferences } = usePreferencesModal();
 * 
 * // Open to a specific tab
 * openPreferences('prompts');
 * 
 * // Open to default tab
 * openPreferences();
 * ```
 */
export function usePreferencesModal(): UsePreferencesModalReturn {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<PreferenceTab | undefined>(undefined);

    const openPreferences = useCallback((tab?: PreferenceTab) => {
        setActiveTab(tab);
        setIsOpen(true);
    }, []);

    const closePreferences = useCallback(() => {
        setIsOpen(false);
        // Don't reset activeTab immediately to avoid UI flash
        setTimeout(() => setActiveTab(undefined), 300);
    }, []);

    return {
        isOpen,
        activeTab,
        openPreferences,
        closePreferences,
    };
}

