"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RecipeViewHeaderProps {
    recipeId: string;
    recipeName: string;
    selectedVersionId: string;
    onVersionChange: (versionId: string) => void;
    versions: Array<{ id: string; version: number | null }>;
}

export function RecipeViewHeader({ recipeId, recipeName, selectedVersionId, onVersionChange, versions }: RecipeViewHeaderProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        setMounted(true);
        const element = document.getElementById('page-specific-header-content');
        setTargetElement(element);
    }, []);

    const handleEdit = () => {
        setIsNavigating(true);
        router.push(`/ai/cockpit/recipes/${recipeId}/edit`);
    };

    const handleBack = () => {
        setIsNavigating(true);
        router.push('/ai/cockpit/recipes');
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
                    <span className="text-xs text-muted-foreground">- View</span>
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
                    onClick={handleEdit}
                    disabled={isNavigating}
                    size="sm"
                    className="h-8 bg-purple-500 hover:bg-purple-600"
                >
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Edit
                </Button>
            </div>
        </div>
    );

    return createPortal(content, targetElement);
}

