import { AiSettingsData } from "@/types/AutomationSchemaTypes";

type NormalizedAiSettings = Required<{
    [K in keyof AiSettingsData]: string | NonNullable<AiSettingsData[K]>;
}>;

const isNullLike = (value: unknown): boolean => {
    return value === null || value === undefined || value === '';
};

export const normalizeAiSettings = (settings: Partial<AiSettingsData>): NormalizedAiSettings => {
    return {
        id: isNullLike(settings.id) ? 'default' : settings.id,
        aiEndpoint: isNullLike(settings.aiEndpoint) ? 'default' : settings.aiEndpoint,
        aiModel: isNullLike(settings.aiModel) ? 'default' : settings.aiModel,
        aiProvider: isNullLike(settings.aiProvider) ? 'default' : settings.aiProvider,
        maxTokens: isNullLike(settings.maxTokens) ? 'default' : settings.maxTokens,
        presetName: isNullLike(settings.presetName) ? 'default' : settings.presetName,
        temperature: isNullLike(settings.temperature) ? 'default' : settings.temperature,
        topP: isNullLike(settings.topP) ? 'default' : settings.topP,
        frequencyPenalty: isNullLike(settings.frequencyPenalty) ? 'default' : settings.frequencyPenalty,
        presencePenalty: isNullLike(settings.presencePenalty) ? 'default' : settings.presencePenalty,
        stream: isNullLike(settings.stream) ? 'default' : settings.stream,
        responseFormat: isNullLike(settings.responseFormat) ? 'default' : settings.responseFormat,
        size: isNullLike(settings.size) ? 'default' : settings.size,
        quality: isNullLike(settings.quality) ? 'default' : settings.quality,
        count: isNullLike(settings.count) ? 'default' : settings.count,
        audioVoice: isNullLike(settings.audioVoice) ? 'default' : settings.audioVoice,
        audioFormat: isNullLike(settings.audioFormat) ? 'default' : settings.audioFormat,
        modalities: isNullLike(settings.modalities) ? 'default' : settings.modalities,
        tools: isNullLike(settings.tools) ? 'default' : settings.tools,
        aiProviderReference: isNullLike(settings.aiProviderReference) ? 'default' : settings.aiProviderReference,
        aiEndpointReference: isNullLike(settings.aiEndpointReference) ? 'default' : settings.aiEndpointReference,
        aiModelReference: isNullLike(settings.aiModelReference) ? 'default' : settings.aiModelReference,
        aiAgentInverse: isNullLike(settings.aiAgentInverse) ? 'default' : settings.aiAgentInverse
    };
};