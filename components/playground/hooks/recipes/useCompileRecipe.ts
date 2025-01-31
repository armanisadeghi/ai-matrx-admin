import { UseAiCockpitHook } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import { getUniqueMetadataFromAllMessages } from '@/features/rich-text-editor/utils/patternUtils';
import { useAppSelector } from '@/lib/redux';
import { RecipeRecordWithKey } from '@/types';
import { createNormalizer } from '@/utils/dataSchemaNormalizer';
import { useCallback } from 'react';

interface UseCompileRecipeProps {
    aiCockpitHook: UseAiCockpitHook;
}

type BasicMessage = {
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

export function useRecipeCompiler({ aiCockpitHook }: UseCompileRecipeProps) {
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
        };
    }, [activeRecipeId, activeRecipeMatrxId, messages, processedSettings, recipeRecord?.name]);

    return {
        recipeRecord,
        compileRecipe,
    };
}
