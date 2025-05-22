import { BrokerValueRecordWithKey, DataBrokerData, DataBrokerRecordWithKey } from "@/types";
import { BrokersForBackend, BrokerValue, RecipeOverrides, RecipeTaskData } from "./useCompileRecipe";
import { CompiledRecipeEntry } from "@/hooks/run-recipe/types";
import { CompiledRecipe } from "@/components/playground/hooks/recipes/useCompileRecipe";

export function createRecipeTaskBrokers(matchingBrokers: DataBrokerRecordWithKey[]): BrokerValue[] {
    if (!matchingBrokers) {
        return [];
    }

    return matchingBrokers.map((broker) => ({
        id: broker.id,
        official_name: broker.id,
        data_type: broker.dataType,
        required: true,
        value: broker.defaultValue,
        fieldComponentId: broker.fieldComponentId,
        ready: true,
    }));
}

interface RuntimeBrokersProps {
    matchingBrokers: DataBrokerData[];
    brokerValueRecordsWithBrokerKeys: Record<string, BrokerValueRecordWithKey>;
}

export function createRuntimeBrokers({ matchingBrokers, brokerValueRecordsWithBrokerKeys }: RuntimeBrokersProps): BrokerValue[] {
    if (!brokerValueRecordsWithBrokerKeys || !matchingBrokers) {
        return [];
    }

    return matchingBrokers.map((matchingBroker) => {
        const valueBroker = brokerValueRecordsWithBrokerKeys[matchingBroker.id];
        const brokerValue = valueBroker?.data?.value;

        return {
            id: matchingBroker.id,
            official_name: matchingBroker.id,
            data_type: matchingBroker.dataType || "str",
            required: true,
            value: brokerValue,
            fieldComponentId: matchingBroker.fieldComponentId,
            ready: true,
        };
    });
}

export function createRecipeOverrides(settingsList: Record<string, any>[]): RecipeOverrides[] {
    return settingsList.map((settings) => ({
        model_override: settings.model,
        processor_overrides: {},
        other_overrides: Object.fromEntries(
            Object.entries({
                max_tokens: settings.maxTokens,
                temperature: settings.temperature,
                top_p: settings.topP,
                frequency_penalty: settings.frequencyPenalty,
                presence_penalty: settings.presencePenalty,
                response_format: settings.responseFormat,
                size: settings.size,
                quality: settings.quality,
                count: settings.count,
                audio_voice: settings.audioVoice,
                audio_format: settings.audioFormat,
                modalities: settings.modalities,
                tools: settings.tools,
                system_message_override: settings.systemMessageOverride,
            }).filter(([_, value]) => value !== "default")
        ),
    }));
}

export function createRecipeTaskDataList(compiledRecipe: CompiledRecipe): RecipeTaskData[] {
    if (!compiledRecipe) {
        return [];
    }

    const { id, brokers, settings } = compiledRecipe;
    const recipeTaskBrokers = createRecipeTaskBrokers(brokers as DataBrokerRecordWithKey[]);
    const recipeOverrides = createRecipeOverrides(settings);

    return recipeOverrides.map((override) => ({
        recipe_id: id,
        broker_values: recipeTaskBrokers,
        overrides: override,
    }));
}

export function createRecipeTaskData(compiledRecipe: CompiledRecipe): RecipeTaskData {
    const recipeTaskDataList = createRecipeTaskDataList(compiledRecipe);
    return recipeTaskDataList[0];
}

export function createRecipeRuntimePayload(
    task: string = "run_recipe",
    compiledRecipe: CompiledRecipeEntry,
    brokerValueRecordsWithBrokerKeys: Record<string, BrokerValueRecordWithKey>
): Array<{ task: string; taskData: RecipeTaskData }> {
    if (!compiledRecipe) {
        return [];
    }

    const { id, brokers, settings } = compiledRecipe;
    const runtimeBrokers = createRuntimeBrokers({ matchingBrokers: brokers, brokerValueRecordsWithBrokerKeys });
    const recipeOverrides = createRecipeOverrides(settings);

    return recipeOverrides.map((override) => ({
        task,
        taskData: {
            recipe_id: id,
            broker_values: runtimeBrokers,
            overrides: override,
        },
    }));
}

export function createSingleRecipeRuntimeTaskData(
    task: string = "run_recipe",
    compiledRecipe: CompiledRecipeEntry,
    brokerValueRecordsWithBrokerKeys: Record<string, BrokerValueRecordWithKey>
): RecipeTaskData | undefined {
    const runtimeTaskDataList = createRecipeRuntimePayload(task, compiledRecipe, brokerValueRecordsWithBrokerKeys);
    return runtimeTaskDataList.length > 0 ? runtimeTaskDataList[0].taskData : undefined;
}

export function createEnhancedRecipePayload(
    task: string = "run_recipe",
    compiledRecipe: CompiledRecipeEntry | null,
    allBrokerValueRecords: BrokerValueRecordWithKey[]
): Array<{ task: string; taskData: RecipeTaskData }> {
    if (!compiledRecipe || !allBrokerValueRecords) {
        return [];
    }

    const { id, brokers, settings } = compiledRecipe;

    const runtimeBrokers = brokers.map((broker) => {
        const valueBroker = allBrokerValueRecords.find((record) => record.dataBroker === broker.id);
        const brokerValue = valueBroker?.data?.value;

        return {
            id: broker.id,
            official_name: broker.id,
            data_type: broker.dataType || "str",
            required: true,
            value: brokerValue,
            fieldComponentId: broker.fieldComponentId,
            ready: true,
        };
    });

    const recipeOverrides = createRecipeOverrides(settings);

    return recipeOverrides.map((override) => ({
        task,
        taskData: {
            recipe_id: id,
            broker_values: runtimeBrokers,
            overrides: override,
        },
    }));
}


export type NewBrokerValue = {
    id: string;
    value: string;
    fieldComponentId: string;
    ready: boolean;
}


export function createBrokerValues(matchingBrokers: BrokersForBackend[]): NewBrokerValue[] {
    if (!matchingBrokers) {
        return [];
    }

    return matchingBrokers.map((broker) => ({
        id: broker.id,
        value: broker.default_value,
        fieldComponentId: broker.field_component_id,
        ready: true,
    }));
}



export function createNewRecipeOverrides(settingsList: Record<string, any>[]): RecipeOverrides[] {
    return settingsList.map((settings) => {
        // Handle different formats of tools
        let toolsValue = [];
        if (Array.isArray(settings.tools)) {
            // If tools is already an array of strings, use it directly
            toolsValue = settings.tools;
        } else if (settings.tools?.selectedToolIds && Array.isArray(settings.tools.selectedToolIds)) {
            // Legacy format: extract selectedToolIds
            toolsValue = settings.tools.selectedToolIds;
        }

        return {
            model_override: settings.model,
            processor_overrides: {},
            other_overrides: Object.fromEntries(
                Object.entries({
                    max_tokens: settings.maxTokens,
                    temperature: settings.temperature,
                    top_p: settings.topP,
                    frequency_penalty: settings.frequencyPenalty,
                    presence_penalty: settings.presencePenalty,
                    response_format: settings.responseFormat,
                    size: settings.size,
                    quality: settings.quality,
                    count: settings.count,
                    audio_voice: settings.audioVoice,
                    audio_format: settings.audioFormat,
                    modalities: settings.modalities,
                    tools: toolsValue,
                    system_message_override: settings.systemMessageOverride,
                }).filter(([_, value]) => value !== "default")
            ),
        };
    });
}


export type RecipeToChatTaskData = {
    chat_config: {
        recipe_id: string;
        version: string;
        prepare_for_next_call: boolean;
        save_new_conversation: boolean;
        include_classified_output: boolean;
        tools_override: string[];
        allow_default_values: boolean;
        allow_removal_of_unmatched: boolean;
        [key: string]: any;
    },
    broker_values: NewBrokerValue[];
}

export function createRecipeToChatTaskDataList(compiledRecipe: CompiledRecipe): RecipeToChatTaskData[] {
    if (!compiledRecipe) {
        return [];
    }

    const { id, brokers, settings } = compiledRecipe;
    const recipeTaskBrokers = createBrokerValues(brokers as BrokersForBackend[]);
    const recipeOverrides = createRecipeOverrides(settings);

    return recipeOverrides.map((override) => {
        const toolsOverride = Array.isArray(override.other_overrides.tools) 
            ? override.other_overrides.tools 
            : [];
            
        const { tools, ...otherOverridesWithoutTools } = override.other_overrides;
        
        return {
            chat_config: {
                recipe_id: id,
                version: "latest",
                prepare_for_next_call: true,
                save_new_conversation: true,
                include_classified_output: true,
                tools_override: toolsOverride,
                allow_default_values: true,
                allow_removal_of_unmatched: false,
                ...otherOverridesWithoutTools
            },
            broker_values: recipeTaskBrokers,
        };
    });
}
