'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Settings as SettingsIcon, Save, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSpecificHeader } from '@/components/layout/new-layout/PageSpecificHeader';
import { RootState } from "@/lib/redux/store";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
    UserPreferencesState,
    savePreferencesToDatabase,
    resetToLoadedPreferences,
} from '@/lib/redux/slices/userPreferencesSlice';

interface SettingsHeaderContentProps {
    title: string;
    showBack?: boolean;
    backLabel?: string;
}

function SettingsHeaderContent({ title, showBack, backLabel }: SettingsHeaderContentProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const preferences = useSelector((state: RootState) => state.userPreferences as UserPreferencesState);
    const meta = preferences._meta || { isLoading: false, hasUnsavedChanges: false };

    const handleSave = () => {
        const { _meta: _, ...preferencesWithoutMeta } = preferences;
        dispatch(savePreferencesToDatabase(preferencesWithoutMeta));
    };

    const handleReset = () => {
        dispatch(resetToLoadedPreferences());
    };

    return (
        <div className="flex items-center justify-between gap-2 h-full w-full overflow-hidden">
            {/* Left: back + title */}
            <div className="flex items-center gap-1.5 min-w-0">
                {showBack && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full shrink-0"
                        onClick={() => router.push('/settings/preferences')}
                        title="Back to Preferences"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}
                <SettingsIcon className="h-4 w-4 text-primary shrink-0" />
                <h1 className="text-sm font-semibold truncate">{title}</h1>
                {meta.hasUnsavedChanges && !meta.isLoading && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-orange-500 shrink-0" title="Unsaved changes" />
                )}
            </div>

            {/* Right: save/reset — mr-1 matches the visual gap between the left edge and user avatar on opposite side */}
            <div className="flex items-center gap-1 shrink-0 mr-1">
                {meta.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            disabled={!meta.hasUnsavedChanges}
                            className="h-7 w-7 p-0 rounded-full"
                            title="Reset changes"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={!meta.hasUnsavedChanges}
                            className="h-7 w-7 p-0 rounded-full"
                            title="Save changes"
                        >
                            <Save className="h-3.5 w-3.5" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

interface SettingsPageHeaderProps {
    title?: string;
    showBack?: boolean;
    backLabel?: string;
}

export function SettingsPageHeader({ title = 'Preferences', showBack, backLabel }: SettingsPageHeaderProps) {
    return (
        <PageSpecificHeader>
            <SettingsHeaderContent title={title} showBack={showBack} backLabel={backLabel} />
        </PageSpecificHeader>
    );
}
