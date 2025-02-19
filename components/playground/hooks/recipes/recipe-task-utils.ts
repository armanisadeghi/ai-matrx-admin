import { BrokerValueRecordWithKey, DataBrokerData, DataBrokerRecordWithKey } from "@/types";
import { BrokerValue, RecipeOverrides, RecipeTaskData } from "./useCompileRecipe";
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
