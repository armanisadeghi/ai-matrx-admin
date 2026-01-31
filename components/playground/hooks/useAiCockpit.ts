import { EntityKeys } from "@/types/entityTypes";
import { useCallback, useEffect, useState } from "react";
import { useRecipeAgentSettings } from "@/hooks/aiCockpit/useRecipeAgentSettings";
import { useProcessedRecipeMessages } from "@/hooks/aiCockpit/useProcessedRecipeMessages";
import {
    BrokerValue,
    CompiledRecipe,
    RecipeOverrides,
    RecipeTaskData,
    useRecipeCompiler,
} from "@/components/playground/hooks/recipes/useCompileRecipe";
import { useCockpitSocket } from "@/lib/redux/socket-io/hooks/useCockpitRecipe";
import { useDoubleJoinedActiveParentProcessing } from "@/app/entities/hooks/relationships/useRelationshipsWithProcessing";
import { useCreateRecord } from "@/app/entities/hooks/crud/useDirectCreateRecord";
import { useOrchestrateSave } from "@/hooks/useOrchestrateSave";
import { RecipeToChatTaskData } from "./recipes/recipe-task-utils";

export function useAiCockpit(forceRefresh?: boolean) {
    const [compiledRecipe, setCompiledRecipe] = useState<CompiledRecipe | null>(null);
    const [recipeVersion, setRecipeVersion] = useState(1);
    const [taskBrokers, setTaskBrokers] = useState<BrokerValue[]>([]);
    const [recipeOverrides, setRecipeOverrides] = useState<RecipeOverrides[]>([]);
    const [recipeTaskData, setRecipeTaskData] = useState<RecipeTaskData[]>([]);
    const [recipeToChatTaskData, setRecipeToChatTaskData] = useState<RecipeToChatTaskData[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const {
        activeParentMatrxId: activeRecipeMatrxId,
        activeParentId: activeRecipeId,
        firstRelHook,
        secondRelHook,
    } = useDoubleJoinedActiveParentProcessing("recipeMessage", "aiAgent", forceRefresh);
    
    const recipeMessageHook = useProcessedRecipeMessages(firstRelHook);
    const { messages, deleteMessage, addMessage, handleDragDrop, recipeMessageIsLoading, addAssistantResponse } = recipeMessageHook;
    const recipeAgentSettingsHook = useRecipeAgentSettings(secondRelHook);
    const { generateTabs, createNewSettingsData, processedSettings } = recipeAgentSettingsHook;

    const { recipeRecord, compileRecipe } = useRecipeCompiler({
        activeRecipeMatrxId,
        activeRecipeId,
        messages,
        processedSettings,
        recipeSelectors: firstRelHook.parentTools.selectors,
    });

    const createCompiledRecord = useCreateRecord({
        entityKey: "compiledRecipe" as EntityKeys,
    });

    const recompileRecipe = useCallback(() => {
        const { compiledRecipe: result, recipeTaskBrokers, recipeOverrides, recipeTaskDataList, recipeToChatTaskDataList } = compileRecipe();
        setCompiledRecipe(result);
        setTaskBrokers(recipeTaskBrokers);
        setRecipeOverrides(recipeOverrides);
        setRecipeTaskData(recipeTaskDataList);
        setRecipeToChatTaskData(recipeToChatTaskDataList);
        return { result, recipeTaskBrokers, recipeOverrides, recipeTaskDataList, recipeToChatTaskDataList };
    }, [compileRecipe]);

    const saveCompiledRecipe = useCallback(async () => {
        const { result } = recompileRecipe();
        
        try {
            await createCompiledRecord({
                data: {
                    recipeId: activeRecipeId,
                    compiledRecipe: result,
                    version: recipeVersion,
                },
            });
            
            setRecipeVersion((prev) => prev + 1);
        } catch (error) {
            console.error("Error saving compiled recipe:", error);
        }
    }, [activeRecipeId, recompileRecipe, recipeVersion, createCompiledRecord]);

    const { 
        save: orchestratedSave, 
        registerComponentSave,
        savingComponents
    } = useOrchestrateSave(
        saveCompiledRecipe,
        {
            onError: (error, componentId) => {
                console.error(`Save failed for ${componentId || 'main recipe'}:`, error);
            },
            onSaveComplete: () => {
                recompileRecipe();
            }
        }
    );

    const getLatestTasks = useCallback(async () => {
        const { recipeToChatTaskDataList } = recompileRecipe();
        return recipeToChatTaskDataList;
    }, [recompileRecipe]);

    useEffect(() => {
        if (activeRecipeId) {
            recompileRecipe();
        }
    }, [activeRecipeId]);

    const compiledData = {
        recipeId: activeRecipeId,
        recipe: compiledRecipe,
        brokers: taskBrokers,
        overrides: recipeOverrides,
        tasks: recipeTaskData,
    };

    const socketHook = useCockpitSocket(getLatestTasks);

    const handlePlay = useCallback(async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await orchestratedSave();
            socketHook.handleSend();
        } catch (error) {
            console.error('Error during play operation:', error);
        } finally {
            setIsSaving(false);
        }
    }, [orchestratedSave, socketHook, isSaving]);

    const tools = {
        recipe: firstRelHook.parentTools,
        message: firstRelHook.childTools,
        settings: secondRelHook.childTools,
        agent: secondRelHook.joinTools,
    };

    return {
        activeRecipeMatrxId,
        activeRecipeId,
        messages,
        deleteMessage,
        addMessage,
        handleDragDrop,
        processedSettings,
        generateTabs,
        createNewSettingsData,
        recipeAgentSettingsHook,
        recipeMessageHook,
        socketHook,
        recipeRecord,
        compiledData,
        recompileRecipe,
        onPlay: handlePlay,
        recipeVersion,
        saveCompiledRecipe: orchestratedSave,
        registerComponentSave,
        savingComponents,
        isSaving,
        tools,
        recipeMessageIsLoading,
        addAssistantResponse,
    };
}

export type UseAiCockpitHook = ReturnType<typeof useAiCockpit>;