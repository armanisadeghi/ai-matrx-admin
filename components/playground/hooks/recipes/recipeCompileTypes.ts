export type BasicMessage = {
  type: "text" | "base64_image" | "blob" | "image_url" | "other" | string;
  role: "user" | "assistant" | "system" | string;
  content: string;
};

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
  fieldComponentId: string;
  [key: string]: unknown;
}

export interface RecipeTaskData {
  recipe_id: string;
  broker_values: BrokerValue[];
  overrides: RecipeOverrides;
}

export type BrokersForBackend = {
  id: string;
  name: string;
  default_value: string;
  data_type: string;
  field_component_id: string;
  input_component: string;
  required: boolean;
};
