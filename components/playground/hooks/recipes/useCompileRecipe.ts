import {
  getUniqueBrokerRecordIds,
  transformEncodedToSimpleIdPattern,
} from "@/features/rich-text-editor/utils/patternUtils";
import { useAppSelector } from "@/lib/redux/hooks";
import { useEntityTools } from "@/lib/redux/entity/hooks/coreHooks";
import {
  DataBrokerRecordWithKey,
  RecipeRecordWithKey,
} from "@/types/AutomationSchemaTypes";
import { createNormalizer } from "@/utils/dataSchemaNormalizer";
import { useCallback, useMemo } from "react";
import type {
  BasicMessage,
  BrokersForBackend,
  CompiledRecipe,
} from "./recipeCompileTypes";
import {
  createRecipeTaskBrokers,
  createRecipeOverrides,
  createRecipeTaskDataList,
  createRecipeToChatTaskDataList,
} from "./recipe-task-utils";

export type {
  BasicMessage,
  BrokerValue,
  BrokersForBackend,
  CompiledRecipe,
  RecipeOverrides,
  RecipeTaskData,
} from "./recipeCompileTypes";

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
  "id",
  "maxTokens",
  "temperature",
  "topP",
  "frequencyPenalty",
  "presencePenalty",
  "stream",
  "responseFormat",
  "size",
  "quality",
  "count",
  "audioVoice",
  "audioFormat",
  "modalities",
  "tools",
  "endpoint",
  "provider",
  "model",
  "aiEndpoint",
  "aiProvider",
  "aiModel",
  "systemMessageOverride",
] as const;

const BROKER_FIELDS = ["id", "name", "defaultValue", "dataType"] as const;

const normalizeAiSettings = createNormalizer(AI_SETTINGS_FIELDS);

const pickBrokerFields = (
  broker: DataBrokerRecordWithKey,
): BrokersForBackend => ({
  id: broker.id,
  name: broker.name,
  default_value: broker.defaultValue,
  data_type: broker.dataType,
  field_component_id: broker.fieldComponentId,
  input_component: broker.inputComponent,
  required: true,
});

export function useRecipeCompiler({
  activeRecipeMatrxId,
  activeRecipeId,
  messages,
  processedSettings,
  recipeSelectors,
}) {
  const selectors = recipeSelectors;
  const recipeRecord = useAppSelector((state) =>
    selectors.selectRecordWithKey(state, activeRecipeMatrxId),
  ) as RecipeRecordWithKey;
  const { selectors: brokerSelectors } = useEntityTools("dataBroker");

  const uniqueBrokerRecordIds = getUniqueBrokerRecordIds(messages);

  const matchingBrokers = useAppSelector((state) =>
    brokerSelectors.selectRecordsWithKeys(state, uniqueBrokerRecordIds),
  ) as DataBrokerRecordWithKey[];

  const filteredBrokers = useMemo(() => {
    return matchingBrokers.map(pickBrokerFields);
  }, [matchingBrokers]);

  const compileRecipe = useCallback(() => {
    const messageList: BasicMessage[] = messages.map((message) => ({
      content: transformEncodedToSimpleIdPattern(message.content),
      role: message.role,
      type: message.type,
    }));

    const settingsList = processedSettings.map((settings) =>
      normalizeAiSettings(extractNestedValues(settings)),
    ) as Record<string, any>[];

    const compiledRecipe = {
      id: recipeRecord?.id,
      name: recipeRecord?.name,
      messages: messageList,
      brokers: filteredBrokers,
      settings: settingsList,
      matrxRecordId: activeRecipeMatrxId,
    } as CompiledRecipe;

    const recipeTaskBrokers = createRecipeTaskBrokers(matchingBrokers);
    const recipeOverrides = createRecipeOverrides(settingsList);
    const recipeTaskDataList = createRecipeTaskDataList(compiledRecipe);
    const recipeToChatTaskDataList =
      createRecipeToChatTaskDataList(compiledRecipe);

    return {
      compiledRecipe,
      recipeTaskBrokers,
      recipeOverrides,
      recipeTaskDataList,
      recipeToChatTaskDataList,
    };
  }, [
    activeRecipeId,
    activeRecipeMatrxId,
    messages,
    processedSettings,
    recipeRecord?.name,
  ]);

  return {
    recipeRecord,
    compileRecipe,
  };
}

export function useCompileRecipeSimple({
  activeRecipeMatrxId,
  activeRecipeId,
  messages,
  processedSettings,
  recipeSelectors,
}) {
  const selectors = recipeSelectors;
  const recipeRecord = useAppSelector((state) =>
    selectors.selectRecordWithKey(state, activeRecipeMatrxId),
  ) as RecipeRecordWithKey;
  const { selectors: brokerSelectors } = useEntityTools("dataBroker");
}
