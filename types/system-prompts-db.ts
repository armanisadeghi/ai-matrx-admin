import { PromptMessage, PromptVariable, PromptSettings } from '@/features/prompts/types/core';

export type TriggerType = 'context-menu' | 'button' | 'card' | 'modal';

export interface TriggerConfig {
  'context-menu'?: {
    menu_label?: string;
    submenu?: string;
    description?: string;
  };
  'button'?: {
    label?: string;
    variant?: string;
    size?: string;
  };
  'card'?: {
    allow_chat?: boolean;
    auto_close?: boolean;
    show_copy?: boolean;
  };
  'modal'?: {
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  };
}

export interface VariableSchema {
  [variableName: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description?: string;
    required?: boolean;
    default?: any;
  };
}

export interface SystemPromptDB {
  id: string;

  // Core prompt fields (matching PromptsData)
  name: string;
  description: string | null;
  messages: PromptMessage[];
  variable_defaults: PromptVariable[] | null;
  settings: PromptSettings | null;

  // System-specific fields
  system_prompt_id: string;
  source_prompt_id: string | null;
  icon_name: string;

  // Organization
  category: string;
  subcategory: string | null;
  sort_order: number;

  // Triggers
  enabled_triggers: TriggerType[];
  trigger_config: TriggerConfig;
  variable_schema: VariableSchema | null;

  // Metadata
  is_active: boolean;
  created_by: string;
  source_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSystemPromptInput {
  name: string;
  description?: string;
  messages: PromptMessage[];
  variable_defaults?: PromptVariable[];
  settings?: PromptSettings;

  system_prompt_id: string;
  source_prompt_id?: string;
  icon_name?: string;
  category: string;
  subcategory?: string;
  sort_order?: number;
  enabled_triggers?: TriggerType[];
  trigger_config?: TriggerConfig;
  variable_schema?: VariableSchema;
  is_active?: boolean;
}

export interface UpdateSystemPromptInput extends Partial<CreateSystemPromptInput> {
  id: string;
}

export interface PublishPromptAsSystemInput {
  source_prompt_id: string;
  system_prompt_id: string;
  category: string;
  subcategory?: string;
  icon_name?: string;
  enabled_triggers: TriggerType[];
  trigger_config?: TriggerConfig;
  variable_schema?: VariableSchema;
}

export interface PromptDiff {
  hasChanges: boolean;
  nameChanged: boolean;
  descriptionChanged: boolean;
  messagesChanged: boolean;
  variablesChanged: boolean;
  settingsChanged: boolean;
  oldPrompt: SystemPromptDB | null;
  newPrompt: Partial<SystemPromptDB> | null;
}

export interface CategoryWithSubcategories {
  id: string;
  category_id: string;
  label: string;
  icon_name: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  subcategories: {
    id: string;
    subcategory_id: string;
    label: string;
    icon_name: string;
    sort_order: number;
    is_active: boolean;
  }[];
}
