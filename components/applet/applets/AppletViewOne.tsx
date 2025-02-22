"use client";

import { useEffect, useMemo, useState } from "react";
import { useRunRecipeApplet } from "@/hooks/run-recipe/useRunApps";
import BrokerInputCard from "@/components/brokers/main-layouts/BrokerInputCard";
import { MatrxRecordId } from "@/types";
import { AppletHeroSections, AppletHeroSectionType } from "@/components/applet/reusable-sections/AppletHero";
import { APPLET_THEMES, AppletTheme, AppletThemeName } from "@/components/brokers/main-layouts/applet-themes";
import { DisplayTheme } from "@/components/mardown-display/themes";
import EnhancedContentRendererTwo from "@/components/mardown-display/EnhancedMarkdownRendererTwo";

const fontSize = 16;
const className = "";

interface AppletViewOneProps {
    appletId: string;
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

const layoutOption = {
    "976c56e5-263c-4815-b2ec-e6d1be04003a": "rendered",
    "da794450-9b3e-46ae-a68a-ff33cb0ab1f0": "multiSectionCards",
    "2057969c-1b22-4b47-b406-2692045466b4": "rendered",
    "4b752655-290c-47e3-a0db-6c5795cc5aa5": "rendered",
};



export const AppletViewOne = ({ appletId }: AppletViewOneProps) => {
    const [loading, setLoading] = useState(true);
    const prepareRecipeHook = useRunRecipeApplet(appletId);
    const { appletRecord, isLoading, hasAllInputComponents } = prepareRecipeHook;

    useEffect(() => {
        if (!loading) {
            return;
        }
        if (!isLoading && hasAllInputComponents) {
            setLoading(false);
        }
    }, [isLoading, hasAllInputComponents, loading]);

    const appletRecordData = appletRecord as AppletRecord;

    const allThemes = useMemo(() => APPLET_THEMES, []);
    const appletThemeName = 'professional'
    const appletTheme = allThemes[appletThemeName] as AppletTheme;

    const layout = layoutOption[appletId] || "rendered";

    const appletHeroName = appletRecordData?.heroSection || "BASIC";

    const AppletHeroComponent = AppletHeroSections[appletHeroName];

    const { streamingResponses } = prepareRecipeHook;
    const content = streamingResponses[0] || "";

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
                />
                <EnhancedContentRendererTwo
                    content={content}
                    type="message"
                    role="assistant"
                    fontSize={fontSize}
                    className={className}
                    mode={layout}
                    theme={appletThemeName as DisplayTheme}
                />
            </div>
        </div>
    );
};

export default AppletViewOne;
