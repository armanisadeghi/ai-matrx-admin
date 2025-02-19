"use client";

import { createRecipeTaskData } from "@/components/playground/hooks/recipes/recipe-task-utils";
import { CompiledRecipe } from "@/components/playground/hooks/recipes/useCompileRecipe";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useCockpitSocket } from "@/lib/redux/socket/hooks/useCockpitRecipe";
import { useRunRecipeApplet } from "@/hooks/run-recipe/useRunApps";
import BrokerInputCard from "@/components/brokers/main-layouts/BrokerInputCard";
import { MatrxRecordId } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppletThemeName } from "@/components/brokers/main-layouts/applet-themes";
import { AppletHeroSections, AppletHeroSectionType } from "@/components/applet/reusable-sections/AppletHero";
import EnhancedContentRenderer from "@/components/mardown-display/EnhancedMarkdownRenderer";
import { useDebounce } from "@uidotdev/usehooks";
import { AppletSkeleton } from "./AppletViewOne";
import SimpleContentRenderer from "@/components/mardown-display/SimpleContentRenderer";

const fontSize = 16;
const className = "";

interface AppletViewOneProps {
    appletId: string;
    allThemes: any;
}

type BrokerInputSectionType = any;
type ResultSectionType = any;

type AppletRecord = {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    creator: string;
    type: "recipe" | "other" | "workflow";
    compiledRecipeId: string;
    slug: string;
    userId: string;
    isPublic: boolean;
    dataSourceConfig: Record<string, unknown>;
    resultComponentConfig: Record<string, unknown>;
    nextStepConfig: Record<string, unknown>;
    subcategoryId: string;
    matrxRecordId: MatrxRecordId;
    ctaText: string;
    theme: AppletThemeName;
    heroSection: AppletHeroSectionType;
    brokerInputSection: BrokerInputSectionType;
    resultSection: ResultSectionType;
};

const DEBUG_THEME = true;
const DEBUG_THEME_NAME = "pinkBlue";

const layoutOption = {
    "976c56e5-263c-4815-b2ec-e6d1be04003a": "rendered",
    "da794450-9b3e-46ae-a68a-ff33cb0ab1f0": "multiSectionCards",
};

export const AppletViewOneWithDiagnostics = ({ appletId, allThemes }: AppletViewOneProps) => {
    const prepareRecipeHook = useRunRecipeApplet(appletId);
    const { compiledRecipe, appletRecord, isLoading, hasAllInputComponents } = prepareRecipeHook;

    const loading = useDebounce(isLoading || !hasAllInputComponents, 1000);

    const appletRecordData = appletRecord as AppletRecord;

    // Use refs to stabilize objects that shouldn't change
    const compiledRecipeRef = useRef<CompiledRecipe | null>(null);
    const cachedTaskRef = useRef<any>(null);

    // Only update the ref when compiledRecipe changes from undefined to defined
    useEffect(() => {
        if (compiledRecipe && !compiledRecipeRef.current) {
            compiledRecipeRef.current = compiledRecipe as unknown as CompiledRecipe;
            // Pre-compute the task data once
            cachedTaskRef.current = createRecipeTaskData(compiledRecipeRef.current);
        }
    }, [compiledRecipe]);

    // Stable getLatestTasks function that uses the cached result
    const getLatestTasks = useCallback(async () => {
        // If we have cached data, use it
        if (cachedTaskRef.current) {
            return [cachedTaskRef.current];
        }

        // Fallback for initial render before cache is ready
        if (compiledRecipeRef.current) {
            const task = createRecipeTaskData(compiledRecipeRef.current);
            cachedTaskRef.current = task;
            return [task];
        }

        // Return empty array if no data yet
        return [];
    }, []); // No dependencies - this function never changes

    let appletTheme = allThemes[appletRecordData?.theme || "default"];
    if (DEBUG_THEME) {
        appletTheme = allThemes[DEBUG_THEME_NAME];
    }

    const layout = layoutOption[appletId] || "rendered";
    const legacyTheme = appletRecordData?.theme || "professional";

    const { streamingResponses, handleSend } = useCockpitSocket(getLatestTasks);

    const appletHeroName = appletRecordData?.heroSection || "BASIC";
    const AppletHeroComponent = AppletHeroSections[appletHeroName];

    if (loading) {
        return <AppletSkeleton />;
    }

    return (
        <div className="w-full h-full">
            <AppletHeroComponent
                title={appletRecordData?.name}
                description={appletRecordData?.description}
                appletTheme={appletTheme}
                className=""
            />
            {/* Main Content */}
            <div className="w-full h-full px-4 py-6 space-y-4">
                <BrokerInputCard
                    prepareRecipeHook={prepareRecipeHook}
                    recipeTitle={appletRecord?.name}
                    recipeDescription={appletRecord?.description}
                    recipeActionText={appletRecordData?.ctaText}
                    theme={appletTheme}
                    onSubmit={handleSend}
                />

                <SimpleContentRenderer
                    content={streamingResponses[0] || ""}
                    layout={layout}
                    fontSize={fontSize}
                    role="assistant"
                    className={className}
                    theme={legacyTheme}
                />
            </div>
        </div>
    );
};

export default AppletViewOneWithDiagnostics;
