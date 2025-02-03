import { UseAiCockpitHook } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import { getUniqueMetadataFromAllMessages } from '@/features/rich-text-editor/utils/patternUtils';
import { useAppSelector } from '@/lib/redux';
import { RecipeRecordWithKey } from '@/types';
import { createNormalizer } from '@/utils/dataSchemaNormalizer';
import { useCallback } from 'react';

interface UseCompileRecipeProps {
    aiCockpitHook: UseAiCockpitHook;
}

export type BasicMessage = {
    type: 'text' | 'base64_image' | 'blob' | 'image_url' | 'other' | string;
    role: 'user' | 'assistant' | 'system' | string;
    content: string;
};

const extractNestedValues = (settings: any) => {
    return {
        ...settings,
        model: settings?.ai_model_reference?.name,
        provider: settings?.ai_provider_reference?.name,
        endpoint: settings?.ai_endpoint_reference?.name,
        agentId: settings?.ai_agent_inverse?.id,
        systemMessageOverride: settings?.ai_agent_inverse?.system_message_override,

        // Remove the original nested objects since we've extracted what we need
        ai_model_reference: undefined,
        ai_provider_reference: undefined,
        ai_endpoint_reference: undefined,
        ai_agent_inverse: undefined,
    };
};

const AI_SETTINGS_FIELDS = [
    'id',
    'maxTokens',
    'temperature',
    'topP',
    'frequencyPenalty',
    'presencePenalty',
    'stream',
    'responseFormat',
    'size',
    'quality',
    'count',
    'audioVoice',
    'audioFormat',
    'modalities',
    'tools',
    'endpoint',
    'provider',
    'model',
    'systemMessageOverride',
] as const;

const BROKER_FIELDS = ['id', 'name', 'defaultValue', 'dataType'] as const;

const normalizeAiSettings = createNormalizer(AI_SETTINGS_FIELDS);
const normalizeBroker = createNormalizer(BROKER_FIELDS);

export type CompiledRecipe = {
    id: string;
    matrxRecordId: any;
    name: string;
    messages: BasicMessage[];
    brokers: Record<string, any>[];
    settings: Record<string, any>[];
};

export interface RecipeOverrides {
    model_override: string;
    processor_overrides: Record<string, unknown>;
    other_overrides: Record<string, unknown>;
}

export interface BrokerValue {
    id: string;
    official_name: string;
    data_type: string;
    value: unknown;
    ready: boolean;
    [key: string]: unknown;
}

export interface RecipeTaskData {
    recipe_id: string;
    broker_values: BrokerValue[];
    overrides: RecipeOverrides;
}

export function useRecipeCompiler({ activeRecipeMatrxId, activeRecipeId, messages, processedSettings, recipeSelectors }) {
    const selectors = recipeSelectors;

    const recipeRecord = useAppSelector((state) => selectors.selectRecordWithKey(state, activeRecipeId)) as RecipeRecordWithKey;

    const compileRecipe = useCallback(() => {
        const messageList: BasicMessage[] = messages.map((message) => ({
            content: message.content,
            role: message.role,
            type: message.type,
        }));

        const settingsList = processedSettings.map((settings) => normalizeAiSettings(extractNestedValues(settings))) as Record<string, any>[];

        const uniqueMessageBrokers = getUniqueMetadataFromAllMessages(messages);
        const normalizedBrokers = uniqueMessageBrokers.map((broker) => normalizeBroker(broker));
        const compiledRecipe = {
            id: recipeRecord?.id,
            matrxRecordId: activeRecipeMatrxId,
            name: recipeRecord?.name,
            messages: messageList,
            brokers: normalizedBrokers,
            settings: settingsList,
        } as CompiledRecipe;

        const recipeTaskBrokers = normalizedBrokers.map((broker) => ({
            id: broker.id,
            official_name: broker.id,
            data_type: broker.dataType === 'default' ? 'str' : broker.dataType,
            required: true,
            value: broker.defaultValue,
            ready: true,
        })) as BrokerValue[];

        const recipeOverrides: RecipeOverrides[] = settingsList.map((settings) => ({
            model_override: settings.model, // Directly take the model string
            processor_overrides: {}, // Always an empty object
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
                }).filter(([_, value]) => value !== 'default') // Remove "default" values
            ),
        }));

        const recipeTaskDataList: RecipeTaskData[] = recipeOverrides.map((override) => ({
            recipe_id: activeRecipeId,
            broker_values: recipeTaskBrokers,
            overrides: override,
        }));

        return { compiledRecipe, recipeTaskBrokers, recipeOverrides, recipeTaskDataList };
    }, [activeRecipeId, activeRecipeMatrxId, messages, processedSettings, recipeRecord?.name]);

    return {
        recipeRecord,
        compileRecipe,
    };
}

export function useRecipeCompilerViaHook({ aiCockpitHook }: UseCompileRecipeProps) {
    const { activeRecipeMatrxId, activeRecipeId, messages, processedSettings, tools } = aiCockpitHook;

    const selectors = tools.recipe.selectors;

    const recipeRecord = useAppSelector((state) => selectors.selectRecordWithKey(state, activeRecipeId)) as RecipeRecordWithKey;

    const compileRecipe = useCallback(() => {
        const messageList: BasicMessage[] = messages.map((message) => ({
            content: message.content,
            role: message.role,
            type: message.type,
        }));

        const settingsList = processedSettings.map((settings) => normalizeAiSettings(extractNestedValues(settings)));

        const uniqueMessageBrokers = getUniqueMetadataFromAllMessages(messages);
        const normalizedBrokers = uniqueMessageBrokers.map((broker) => normalizeBroker(broker));

        return {
            id: recipeRecord?.id,
            matrxRecordId: activeRecipeMatrxId,
            name: recipeRecord?.name,
            messages: messageList,
            brokers: normalizedBrokers,
            settings: settingsList,
        } as CompiledRecipe;
    }, [activeRecipeId, activeRecipeMatrxId, messages, processedSettings, recipeRecord?.name]);

    return {
        recipeRecord,
        compileRecipe,
    };
}
