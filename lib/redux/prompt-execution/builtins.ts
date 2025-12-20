/**
 * Generic Prompt Builtin Configuration
 * 
 * Centralized configuration for builtin prompts across the application.
 * 
 * IMPORTANT: This file contains METADATA ONLY (id, name, description, key, context).
 * It does NOT contain the actual prompt data (messages, variables, settings).
 * 
 * To execute a builtin prompt, use startPromptInstance() with the UUID:
 * ```
 * await dispatch(startPromptInstance({
 *   promptId: PROMPT_BUILTINS.PROMPT_APP_AUTO_CREATE.id,
 *   promptSource: 'prompt_builtins',
 *   ...
 * }))
 * ```
 */

import type { StartInstancePayload, ExecutionConfig } from './types';

/**
 * PromptBuiltin interface - Metadata/info about a builtin prompt
 * This is NOT the actual prompt data from the database
 */
export interface PromptBuiltin {
    id: string;           // UUID in prompt_builtins table
    name: string;         // Display name
    description: string;  // What this builtin does
    key: string;          // Unique key for lookups
    context: boolean;     // Whether this builtin can be used in the context-aware system
    icon: string;         // Lucide icon name for display
  }
  
  export const PROMPT_BUILTINS = {
    PROMPT_APP_AUTO_CREATE: {
      id: '4b9563db-7a95-476d-b2c7-b76385d35e9c',
      name: 'Prompt App Auto Creator',
      description: 'Specialized for auto creating Prompt Apps',
      key: 'prompt-app-auto-create',
      context: false,
      icon: 'Rocket',
    },
    PROMPT_APP_AUTO_CREATE_LIGHTNING: {
      id: 'aa1cf55b-a8ab-4be1-b0c2-6ab1f9347913',
      name: 'Prompt App Auto Creator (Lightning)',
      description: 'Specialized for auto creating Prompt Apps lightning fast',
      key: 'prompt-app-auto-create-lightning',
      context: false,
      icon: 'Zap',
    },
    PROMPT_APP_UI_EDITOR: {
      id: 'c1c1f092-ba0d-4d6c-b352-b22fe6c48272',
      name: 'Prompt App UI Editor',
      description: 'Specialized for editing a Prompt App UI with custom instructions',
      key: 'prompt-app-ui-editor',
      context: false,
      icon: 'Paintbrush',
    },
    GENERIC_CODE: {
      id: '87efa869-9c11-43cf-b3a8-5b7c775ee415',
      name: 'Master Code Editor',
      description: 'General-purpose code editor for any programming language',
      key: 'generic-code-editor',
      context: false,
      icon: 'Code2',
    },
    CODE_EDITOR_DYNAMIC_CONTEXT: {
      id: '970856c5-3b9d-4034-ac9d-8d8a11fb3dba',
      name: 'Code Editor',
      description: 'Code editor with dynamic context version management',
      key: 'code-editor-dynamic-context',
      context: true,
      icon: 'Brain',
    },
    PROMPT_APP_METADATA_GENERATOR: {
      id: 'a2919657-8572-441c-8355-840185f8447c',
      name: 'Prompt App Metadata Generator',
      description: 'Generate metadata for a prompt app using the prompt object. Provides everything, other than the component code.',
      key: 'prompt-app-metadata-generator',
      context: false,
      icon: 'FileText',
    },
    MATRIX_CUSTOM_CHAT: {
      id: 'ce7c5e71-cbdc-4ed1-8dd9-a7eac930b6b8',
      name: 'Matrx Custom Chat',
      description: 'Custom AI chat assistant for quick conversations',
      key: 'matrix-custom-chat',
      context: false,
      icon: 'MessageSquare',
    },
    FULL_PROMPT_STRUCTURE_BUILDER: {
      id: '62895ef4-1f3a-499d-9af3-148944462769',
      name: 'Full Prompt Structure Builder',
      description: 'Build a full prompt structure from a current prompt or a concept.',
      key: 'full-prompt-structure-builder',
      context: false,
      icon: 'Brain',
    },
  } as const;
  
  // Create reverse lookups for O(1) access
  const keyToId = Object.fromEntries(
    Object.values(PROMPT_BUILTINS).map(p => [p.key, p.id])
  );
  
  const idToBuiltin = Object.fromEntries(
    Object.values(PROMPT_BUILTINS).map(p => [p.id, p])
  );
  
  const keyToBuiltin = Object.fromEntries(
    Object.values(PROMPT_BUILTINS).map(p => [p.key, p])
  );
  
  /** 
   * Get builtin UUID by key
   * @returns UUID string
   * @throws Error if key not found
   */
  export function getBuiltinId(key: string): string {
    const id = keyToId[key];
    if (!id) {
      throw new Error(
        `Unknown builtin key: "${key}". Valid keys: ${Object.keys(keyToId).join(', ')}`
      );
    }
    return id;
  }
  
  /** 
   * Get builtin info/metadata by UUID
   * @returns PromptBuiltin info object (id, name, description, key, context)
   * Note: This returns metadata only, not the actual prompt data from database
   */
  export function getBuiltinInfoById(id: string): PromptBuiltin | undefined {
    return idToBuiltin[id];
  }
  
  /** 
   * Get builtin info/metadata by key
   * @returns PromptBuiltin info object (id, name, description, key, context)
   * Note: This returns metadata only, not the actual prompt data from database
   */
  export function getBuiltinInfoByKey(key: string): PromptBuiltin | undefined {
    return keyToBuiltin[key];
  }
  
  /** 
   * Resolve an identifier (UUID, key, or name) to a UUID
   * @returns UUID string
   * @throws Error if identifier cannot be resolved
   * Note: Use this when you need to normalize various identifier formats to UUID
   */
  export function resolveBuiltinId(identifier: string): string {
    // If it's already a UUID (exists in our lookup), return it
    if (idToBuiltin[identifier]) {
      return identifier;
    }
  
    // Try to look up by key
    const idByKey = keyToId[identifier];
    if (idByKey) {
      return idByKey;
    }
  
    // Try to look up by name
    const builtin = Object.values(PROMPT_BUILTINS).find(p => p.name === identifier);
    if (builtin) {
      return builtin.id;
    }
  
    // If nothing matches, throw an error
    throw new Error(
      `Unknown builtin identifier: "${identifier}". Must be a valid UUID, key, or name.`
    );
  }

  /**
   * Create a pre-configured payload for executing a builtin prompt
   * 
   * This is the recommended way to execute builtins as it ensures:
   * - Correct promptId lookup
   * - Proper promptSource setting
   * - Type safety
   * 
   * @param key - The builtin key (e.g., 'prompt-app-auto-create')
   * @param config - Optional execution configuration (variables, executionConfig, etc.)
   * @returns Complete StartInstancePayload ready for startPromptInstance()
   * 
   * @example
   * ```typescript
   * // Simple execution
   * dispatch(startPromptInstance(
   *   createBuiltinConfig('prompt-app-auto-create')
   * ))
   * 
   * // With variables and config
   * dispatch(startPromptInstance(
   *   createBuiltinConfig('prompt-app-auto-create', {
   *     variables: { name: 'My App', description: 'Cool app' },
   *     executionConfig: { track_in_runs: true, use_pre_execution_input: false }
   *   })
   * ))
   * ```
   */
  export function createBuiltinConfig(
    key: string,
    config?: {
      executionConfig?: Partial<ExecutionConfig>;
      variables?: Record<string, string>;
      initialMessage?: string;
      runId?: string;
    }
  ): StartInstancePayload {
    const defaultExecutionConfig: ExecutionConfig = {
      auto_run: false,
      allow_chat: false,
      show_variables: false,
      apply_variables: true,
      track_in_runs: true,
      use_pre_execution_input: false,
    };

    return {
      promptId: getBuiltinId(key),
      promptSource: 'prompt_builtins' as const,
      variables: config?.variables,
      initialMessage: config?.initialMessage,
      runId: config?.runId,
      executionConfig: {
        ...defaultExecutionConfig,
        ...config?.executionConfig,
      },
    };
  }