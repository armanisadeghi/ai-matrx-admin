/**
 * Generic Prompt Builtin Configuration
 * 
 * Centralized configuration for builtin prompts across the application
 */

export interface PromptBuiltin {
    id: string;
    name: string;
    description: string;
    key: string;
    context: boolean;
  }
  
  export const PROMPT_BUILTINS = {
    PROMPT_APP_UI: {
      id: 'c1c1f092-ba0d-4d6c-b352-b22fe6c48272',
      name: 'Prompt App Editor',
      description: 'Specialized for editing React components for Prompt Apps',
      key: 'prompt-app-ui-builder',
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
  
  /** Get builtin ID by key */
  export function getBuiltinId(key: string): string {
    return keyToId[key] ?? PROMPT_BUILTINS.GENERIC_CODE.id;
  }
  
  /** Get builtin by ID */
  export function getBuiltinById(id: string): PromptBuiltin | undefined {
    return idToBuiltin[id];
  }
  
  /** Get builtin by key */
  export function getBuiltinByKey(key: string): PromptBuiltin | undefined {
    return keyToBuiltin[key];
  }
  
  /** 
   * Resolve an identifier (UUID, key, or name) to a UUID
   * Useful for thunks that need to normalize input identifiers
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