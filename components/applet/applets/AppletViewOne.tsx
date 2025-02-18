"use client";

import { createRecipeTaskData } from "@/components/playground/hooks/recipes/recipe-task-utils";
import { CompiledRecipe } from "@/components/playground/hooks/recipes/useCompileRecipe";
import { useCallback } from "react";
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

export const AppletViewOne = ({ appletId, allThemes }: AppletViewOneProps) => {
    const prepareRecipeHook = useRunRecipeApplet(appletId);
    const { compiledRecipe, appletRecord, isLoading, hasAllInputComponents } = prepareRecipeHook;
    
    const loading = useDebounce(isLoading || !hasAllInputComponents, 1000);
    console.log("loading", loading);

    const appletRecordData = appletRecord as AppletRecord;
    let appletTheme = allThemes[appletRecordData?.theme || "default"];
    if (DEBUG_THEME) {
        appletTheme = allThemes[DEBUG_THEME_NAME];
    }
    const layout = layoutOption[appletId] || "rendered";
    const legacyTheme = appletRecordData?.theme || "professional";

    const getLatestTasks = useCallback(async () => {
        const firstRecipeTask = createRecipeTaskData(compiledRecipe as unknown as CompiledRecipe);
        return [firstRecipeTask];
    }, [compiledRecipe]);

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

                <EnhancedContentRenderer
                    content={streamingResponses[0] || ""}
                    type='message'
                    fontSize={fontSize}
                    role="assistant"
                    className={className}
                    theme={legacyTheme}
                />
                {/* <SimpleContentRenderer
                    content={streamingResponses[0] || ""}
                    layout={layout}
                    fontSize={fontSize}
                    role="assistant"
                    className={className}
                    theme={legacyTheme}
                /> */}
            </div>
        </div>
    );
};

export default AppletViewOne;

export const AppletSkeleton = () => {
    return (
        <div className="h-screen w-full flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-muted/40 p-4">
                {/* Logo/Brand area */}
                <div className="flex items-center space-x-3 mb-8">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-4 w-32" />
                </div>

                {/* Navigation items */}
                <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>

                {/* Bottom profile section */}
                <div className="absolute bottom-4 flex items-center space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2 w-16" />
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Top form section */}
                <Card className="border border-border">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-3 gap-6">
                            {/* Form fields */}
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-9 w-full" />
                                </div>
                            ))}
                        </div>

                        {/* Form actions */}
                        <div className="flex justify-end space-x-3 mt-6">
                            <Skeleton className="h-9 w-24" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </CardContent>
                </Card>

                {/* Data section */}
                <Card className="border border-border">
                    <CardContent className="p-6">
                        {/* Table header */}
                        <div className="flex items-center justify-between mb-6">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-8 w-32" />
                        </div>

                        {/* Table skeleton */}
                        <div className="space-y-4">
                            {/* Column headers */}
                            <div className="grid grid-cols-4 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} className="h-4 w-24" />
                                ))}
                            </div>

                            {/* Table rows */}
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="grid grid-cols-4 gap-4">
                                    {[...Array(4)].map((_, j) => (
                                        <Skeleton key={j} className="h-4 w-full" />
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-6">
                            <Skeleton className="h-4 w-32" />
                            <div className="flex space-x-2">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-8 w-8" />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
