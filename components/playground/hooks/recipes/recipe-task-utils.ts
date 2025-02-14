import { DataBrokerRecordWithKey } from "@/types";
import { BrokerValue, RecipeOverrides, CompiledRecipe, RecipeTaskData } from "./useCompileRecipe";

export function createRecipeTaskBrokers(matchingBrokers: DataBrokerRecordWithKey[]): BrokerValue[] {
    return matchingBrokers.map((broker) => ({
        id: broker.id,
        official_name: broker.id,
        data_type: broker.dataType,
        required: true,
        value: broker.defaultValue,
        ready: true,
    }));
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
            }).filter(([_, value]) => value !== 'default')
        ),
    }));
}

export function createRecipeTaskDataList(
    compiledRecipe: CompiledRecipe,
    activeRecipeId: string
): RecipeTaskData[] {
    const { brokers, settings } = compiledRecipe;

    const recipeTaskBrokers = createRecipeTaskBrokers(brokers as DataBrokerRecordWithKey[]);
    const recipeOverrides = createRecipeOverrides(settings);

    return recipeOverrides.map((override) => ({
        recipe_id: activeRecipeId,
        broker_values: recipeTaskBrokers,
        overrides: override,
    }));
}

export function createRecipeTaskData(
    compiledRecipe: CompiledRecipe,
    activeRecipeId: string
): RecipeTaskData {
    const recipeTaskDataList = createRecipeTaskDataList(compiledRecipe, activeRecipeId);
    return recipeTaskDataList[0];
}
