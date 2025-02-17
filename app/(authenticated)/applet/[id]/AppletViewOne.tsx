"use client";

import PinkBlueBrokerDisplay from "@/components/brokers/main-layouts/variations/PinkBlueBrokerDisplay";
import { createRecipeTaskData } from "@/components/playground/hooks/recipes/recipe-task-utils";
import { usePrepareRecipeToRun } from "@/hooks/run-recipe/usePrepareRecipeToRun";
import { CompiledRecipe } from "@/components/playground/hooks/recipes/useCompileRecipe";
import { useCallback, useState } from "react";
import { useCockpitSocket } from "@/lib/redux/socket/hooks/useCockpitRecipe";
import { parseMarkdownContent } from "@/components/brokers/output/markdown-utils";
import AnimatedEventComponent from "@/components/brokers/output/AnimatedEventComponent";
import MultiSectionMarkdownCard from "@/components/mardown-display/MultiSectionMarkdownCard";
import { separatedMarkdownParser } from "@/components/mardown-display/parser-separated";
import { THEMES } from "@/components/mardown-display/themes";

const TEXT_IDS = [
    "8255edc9-5170-4f67-8d40-718e77a3561c",
    "ce63d140-5619-4f4f-9d7d-055f622f887b",
    "01f7331c-5183-4453-8e0c-9f347c478bfc",
    "c6926be3-00c7-4e4c-a34f-1bdee86ab01a",
];
const currentTheme = "professional";
const fontSize = 16;
const className = "";

interface AppletViewOneProps {
    appletId: string;
}   

export const AppletViewOne = ({ appletId }: AppletViewOneProps) => {
    

    
    const [recipeId, setRecipeId] = useState(TEXT_IDS[2]);
    const recipeRecordKey = `id:${recipeId}`;
    const prepareRecipeHook = usePrepareRecipeToRun({
        recipeRecordKey: recipeRecordKey,
        version: "latest",
    });

    const { compiledRecipe } = prepareRecipeHook;

    const getLatestTasks = useCallback(async () => {
        const firstRecipeTask = createRecipeTaskData(compiledRecipe as unknown as CompiledRecipe, recipeId);

        return [firstRecipeTask];
    }, [compiledRecipe]);

    const { streamingResponses, responseRef, handleSend, handleClear, isResponseActive } = useCockpitSocket(getLatestTasks);

    const parsedContent = separatedMarkdownParser(streamingResponses[0] || "");

    return (
        <div className="flex flex-col h-screen">
            <PinkBlueBrokerDisplay
                prepareRecipeHook={prepareRecipeHook}
                recipeTitle="Plan Your Perfect Vegas Trip"
                recipeDescription="Tell us about your travel plans and we'll help you plan the perfect trip to Las Vegas."
                recipeActionText="Get Personalized Recommendations"
                onSubmit={handleSend}
            />
            {isResponseActive && (
                <MultiSectionMarkdownCard parsed={parsedContent} theme={currentTheme} fontSize={fontSize} className={className} />
            )}
        </div>
    );
}

export default AppletViewOne;
