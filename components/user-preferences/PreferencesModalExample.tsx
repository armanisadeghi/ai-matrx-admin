'use client';

/**
 * Example Usage Component for PreferencesModal
 * 
 * This demonstrates how to use the preferences modal system
 * from anywhere in your application.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Zap } from 'lucide-react';
import PreferencesModal from './PreferencesModal';
import { usePreferencesModal } from '@/hooks/user-preferences/usePreferencesModal';

export function PreferencesModalExample() {
    const { isOpen, activeTab, openPreferences, closePreferences } = usePreferencesModal();

    return (
        <div className="space-y-4 p-4">
            <h2 className="text-lg font-semibold">Preferences Modal Examples</h2>
            
            {/* Example 1: Open to default tab */}
            <Button onClick={() => openPreferences()} variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Open Preferences (Default Tab)
            </Button>

            {/* Example 2: Open to specific tab */}
            <Button onClick={() => openPreferences('prompts')} variant="outline" className="gap-2">
                <Zap className="h-4 w-4" />
                Open Prompts Preferences
            </Button>

            {/* Example 3: Open to AI Models tab */}
            <Button onClick={() => openPreferences('aiModels')} variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Open AI Models Preferences
            </Button>

            {/* The modal component */}
            <PreferencesModal 
                isOpen={isOpen} 
                onClose={closePreferences}
                initialTab={activeTab}
            />
        </div>
    );
}

/**
 * URL Navigation Examples
 * 
 * You can also navigate directly to specific preference tabs via URL:
 * 
 * - /settings/preferences?tab=display
 * - /settings/preferences?tab=prompts
 * - /settings/preferences?tab=voice
 * - /settings/preferences?tab=textToSpeech
 * - /settings/preferences?tab=assistant
 * - /settings/preferences?tab=email
 * - /settings/preferences?tab=videoConference
 * - /settings/preferences?tab=photoEditing
 * - /settings/preferences?tab=imageGeneration
 * - /settings/preferences?tab=textGeneration
 * - /settings/preferences?tab=coding
 * - /settings/preferences?tab=flashcard
 * - /settings/preferences?tab=playground
 * - /settings/preferences?tab=aiModels
 * 
 * Example using Next.js router:
 * ```tsx
 * import { useRouter } from 'next/navigation';
 * 
 * const router = useRouter();
 * router.push('/settings/preferences?tab=prompts');
 * ```
 * 
 * Example using Link:
 * ```tsx
 * import Link from 'next/link';
 * 
 * <Link href="/settings/preferences?tab=prompts">
 *   Prompts Settings
 * </Link>
 * ```
 */

