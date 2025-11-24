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

/**
 * PromptBuiltin interface - Metadata/info about a builtin prompt
 * This is NOT the actual prompt data from the database
 */
export interface PromptBuiltin {
    id: string;           // UUID in prompt_builtins table
    name: string;         // Display name
    description: string;  // What this builtin does
    key: string;          // Unique key for lookups
    context: boolean;     // Whether this builtin uses context
  }
  
  export const PROMPT_BUILTINS = {
    PROMPT_APP_AUTO_CREATE: {
      id: '4b9563db-7a95-476d-b2c7-b76385d35e9c',
      name: 'Prompt App Auto Creator',
      description: 'Specialized for auto creating Prompt Apps',
      key: 'prompt-app-auto-create',
      context: false,
    },
    PROMPT_APP_AUTO_CREATE_LIGHTNING: {
      id: 'aa1cf55b-a8ab-4be1-b0c2-6ab1f9347913',
      name: 'Prompt App Auto Creator (Lightning)',
      description: 'Specialized for auto creating Prompt Apps lightning fast',
      key: 'prompt-app-auto-create-lightning',
      context: false,
    },
    PROMPT_APP_UI: {
      id: 'c1c1f092-ba0d-4d6c-b352-b22fe6c48272',
      name: 'Prompt App Editor',
      description: 'Specialized for editing a Prompt App UI with custom instructions',
      key: 'prompt-app-ui-editor',
      context: false,
    },
    GENERIC_CODE: {
      id: '87efa869-9c11-43cf-b3a8-5b7c775ee415',
      name: 'Master Code Editor',
      description: 'General-purpose code editor for any programming language',
      key: 'generic-code-editor',
      context: false,
    },
    CODE_EDITOR_DYNAMIC_CONTEXT: {
      id: '970856c5-3b9d-4034-ac9d-8d8a11fb3dba',
      name: 'Code Editor (Dynamic Context)',
      description: 'Code editor with dynamic context version management',
      key: 'code-editor-dynamic-context',
      context: true,
    },
    PROMPT_APP_METADATA_GENERATOR: {
      id: 'a2919657-8572-441c-8355-840185f8447c',
      name: 'Prompt App Metadata Generator',
      description: 'Generate metadata for a prompt app using the prompt object. Provides everything, other than the component code.',
      key: 'prompt-app-metadata-generator',
      context: false,
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
   * @returns UUID string (defaults to GENERIC_CODE if key not found)
   */
  export function getBuiltinId(key: string): string {
    return keyToId[key] ?? PROMPT_BUILTINS.GENERIC_CODE.id;
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
   *     executionConfig: { track_in_runs: true }
   *   })
   * ))
   * ```
   */
  export function createBuiltinConfig(
    key: string,
    config?: {
      executionConfig?: Partial<{
        auto_run: boolean;
        allow_chat: boolean;
        show_variables: boolean;
        apply_variables: boolean;
        track_in_runs: boolean;
      }>;
      variables?: Record<string, string>;
      initialMessage?: string;
      runId?: string;
    }
  ) {
    return {
      promptId: getBuiltinId(key),
      promptSource: 'prompt_builtins' as const,
      ...config,
    };
  }