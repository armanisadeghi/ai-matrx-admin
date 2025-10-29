"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Save, Loader2, FileJson } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RecipeEditHeaderProps {
    recipeId: string;
    recipeName: string;
    selectedVersionId: string;
    onVersionChange: (versionId: string) => void;
    versions: Array<{ id: string; version: number | null }>;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    onSettingsClick: () => void;
}

export function RecipeEditHeader({ 
    recipeId, 
    recipeName, 
    selectedVersionId, 
    onVersionChange, 
    versions,
    isDirty,
    isSaving,
    onSave,
    onSettingsClick
}: RecipeEditHeaderProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        setMounted(true);
        const element = document.getElementById('page-specific-header-content');
        setTargetElement(element);
    }, []);

    const handleView = () => {
        setIsNavigating(true);
        router.push(`/ai/recipes/${recipeId}`);
    };

    const handleBack = () => {
        setIsNavigating(true);
        router.push('/ai/recipes');
    };

    if (!mounted || !targetElement) {
        return null;
    }

    const content = (
        <div className="flex items-center justify-between w-full px-4 py-2">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    disabled={isNavigating}
                    className="h-8"
                >
                    {isNavigating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <ArrowLeft className="h-4 w-4" />
                    )}
                </Button>
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {recipeName || "Untitled Recipe"}
                    </h1>
                    <span className="text-xs text-muted-foreground">- Edit</span>
                    {isDirty && (
                        <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                            • Unsaved
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Select value={selectedVersionId} onValueChange={onVersionChange}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {versions.map((v) => (
                            <SelectItem key={v.id} value={v.id} className="text-xs">
                                Version {v.version || "N/A"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    variant="outline"
                    onClick={onSettingsClick}
                    size="sm"
                    className="h-8"
                >
                    <FileJson className="h-3 w-3 mr-1.5" />
                    Settings
                </Button>

                <Button
                    variant="outline"
                    onClick={handleView}
                    disabled={isNavigating}
                    size="sm"
                    className="h-8"
                >
                    <Eye className="h-3 w-3 mr-1.5" />
                    View
                </Button>

                <Button
                    onClick={onSave}
                    disabled={!isDirty || isSaving}
                    size="sm"
                    className="h-8 bg-purple-500 hover:bg-purple-600"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-3 w-3 mr-1.5" />
                            Save v{(versions[0]?.version || 0) + 1}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );

    return createPortal(content, targetElement);
}

