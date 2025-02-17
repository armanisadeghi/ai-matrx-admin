"use client";

import PinkBlueBrokerDisplay from "@/components/brokers/main-layouts/variations/PinkBlueBrokerDisplay";
import { createRecipeTaskData } from "@/components/playground/hooks/recipes/recipe-task-utils";
import { CompiledRecipe } from "@/components/playground/hooks/recipes/useCompileRecipe";
import { useCallback } from "react";
import { useCockpitSocket } from "@/lib/redux/socket/hooks/useCockpitRecipe";
import MultiSectionMarkdownCard from "@/components/mardown-display/MultiSectionMarkdownCard";
import { separatedMarkdownParser } from "@/components/mardown-display/parser-separated";
import { DisplayTheme, THEMES } from "@/components/mardown-display/themes";
import { useRunRecipeApplet } from "@/hooks/run-recipe/useRunApps";
import BrokerInputCard from "@/components/brokers/main-layouts/BrokerInputCard";
import { MatrxRecordId } from "@/types";

const TEXT_IDS = [
    "8255edc9-5170-4f67-8d40-718e77a3561c",
    "ce63d140-5619-4f4f-9d7d-055f622f887b",
    "01f7331c-5183-4453-8e0c-9f347c478bfc",
    "c6926be3-00c7-4e4c-a34f-1bdee86ab01a",
];
const currentTheme = "default";
const fontSize = 16;
const className = "";

interface AppletViewOneProps {
    appletId: string;
}

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
    theme: DisplayTheme;
}


export const AppletViewOne = ({ appletId }: AppletViewOneProps) => {
    const prepareRecipeHook = useRunRecipeApplet(appletId);

    const { compiledRecipe, appletRecord } = prepareRecipeHook;

    const appletRecordData = appletRecord as AppletRecord;

    const getLatestTasks = useCallback(async () => {
        const firstRecipeTask = createRecipeTaskData(compiledRecipe as unknown as CompiledRecipe);

        return [firstRecipeTask];
    }, [compiledRecipe]);

    const { streamingResponses, responseRef, handleSend, handleClear, isResponseActive } = useCockpitSocket(getLatestTasks);

    const parsedContent = separatedMarkdownParser(streamingResponses[0] || "");

    

    return (
        <div className="flex flex-col h-screen">
            <BrokerInputCard
                prepareRecipeHook={prepareRecipeHook}
                recipeTitle={appletRecord?.name}
                recipeDescription={appletRecord?.description}
                recipeActionText={appletRecordData?.ctaText}
                themeName={appletRecordData?.theme as DisplayTheme}
                onSubmit={handleSend}
            />
            {isResponseActive && (
                <MultiSectionMarkdownCard parsed={parsedContent} theme={appletRecordData?.theme} fontSize={fontSize} className={className} />
            )}
        </div>
    );
};

export default AppletViewOne;
