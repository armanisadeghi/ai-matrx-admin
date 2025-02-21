"use client";

import PinkBlueBrokerDisplay from "@/components/brokers/main-layouts/variations/PinkBlueBrokerDisplay";
import { createRecipeTaskData } from "@/components/playground/hooks/recipes/recipe-task-utils";
import { usePrepareRecipeToRun } from "@/hooks/run-recipe/usePrepareRecipeToRun";
import { CompiledRecipe } from "@/components/playground/hooks/recipes/useCompileRecipe";
import { useCallback, useState } from "react";
import { useCockpitSocket } from "@/lib/redux/socket/hooks/useCockpitRecipe";
import { parseMarkdownContent } from "@/components/brokers/output/markdown-utils";
import FunMarkdownRenderer from "./FunMarkdown";
import AnimatedEventComponent from "@/components/brokers/output/AnimatedEventComponent";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TEXT_IDS = ["8255edc9-5170-4f67-8d40-718e77a3561c", "ce63d140-5619-4f4f-9d7d-055f622f887b", "01f7331c-5183-4453-8e0c-9f347c478bfc", "c6926be3-00c7-4e4c-a34f-1bdee86ab01a"];

export default function PinkBlueBrokerPage() {
    const [recipeId, setRecipeId] = useState(TEXT_IDS[2]);
    const recipeRecordKey = `id:${recipeId}`;
    const prepareRecipeHook = usePrepareRecipeToRun({
        recipeRecordKey: recipeRecordKey,
        version: "latest",
    });

    const { compiledRecipe } = prepareRecipeHook;

    const getLatestTasks = useCallback(async () => {
        const firstRecipeTask = createRecipeTaskData(compiledRecipe as unknown as CompiledRecipe);

        return [firstRecipeTask];
    }, [compiledRecipe]);

    const { streamingResponses, responseRef, handleSend, handleClear, isResponseActive } = useCockpitSocket(getLatestTasks);

    const { intro, sections, outro } = parseMarkdownContent(streamingResponses[0] || "");

    return (
        <div className="flex flex-col h-screen">
            <Select value={recipeId} onValueChange={(value) => setRecipeId(value)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a recipe" />
                </SelectTrigger>
                <SelectContent>
                    {TEXT_IDS.map((id) => (
                        <SelectItem key={id} value={id}>
                            {id}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <PinkBlueBrokerDisplay
                prepareRecipeHook={prepareRecipeHook}
                recipeTitle="Plan Your Perfect Vegas Trip"
                recipeDescription="Tell us about your travel plans and we'll help you plan the perfect trip to Las Vegas."
                recipeActionText="Get Personalized Recommendations"
                onSubmit={handleSend}
            />
            {isResponseActive && (
                <div className="flex-1 overflow-y-auto">
                    {intro && (
                        <div className="w-full bg-gradient-to-br from-pink-50 to-cyan-50 dark:from-pink-950 dark:to-cyan-950 border-2 border-pink-200 dark:border-pink-800 shadow-lg rounded-xl  mt-4">
                            <FunMarkdownRenderer content={intro || ""} type="message" role="assistant" fontSize={18} />
                        </div>
                    )}

                    {sections && (
                        <div className="pt-6">
                            <AnimatedEventComponent sections={sections} />
                        </div>
                    )}

                    {outro && (
                        <div className="w-full px-2 pt-6 pb-6">
                            <div className="w-full bg-gradient-to-br from-pink-50 to-cyan-50 dark:from-pink-950 dark:to-cyan-950 border-2 border-pink-200 dark:border-pink-800 shadow-lg rounded-xl p-2">
                                <FunMarkdownRenderer content={outro || ""} type="message" role="assistant" fontSize={18} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
