/**
 * Auto Create Prompt App Service
 * 
 * Handles execution of prompt builtins to generate app code
 */

import { AppDispatch } from '@/lib/redux/store';
import { startPromptInstance } from '@/lib/redux/prompt-execution/thunks/startInstanceThunk';
import { executeMessage } from '@/lib/redux/prompt-execution/thunks/executeMessageThunk';
import { PROMPT_BUILTINS } from '@/lib/redux/prompt-execution/builtins';
import { selectStreamingTextForInstance, selectIsResponseEndedForInstance } from '@/lib/redux/prompt-execution/selectors';
import { removeInstance } from '@/lib/redux/prompt-execution/slice';

export type AutoCreateMode = 'standard' | 'lightning';

// Variables must be Record<string, string> for prompt execution
export type AutoCreateBuiltinVariables = Record<string, string>;

interface AutoCreateResult {
  success: boolean;
  code?: string;
  fullResponse?: string;
  error?: string;
}

/**
 * Extract code from markdown codeblock in response
 * Handles tsx, jsx, typescript, ts, javascript, js wrapping
 */
export function extractCodeFromResponse(response: string): string | null {
  // Match code blocks with optional language specifiers
  const codeBlockRegex = /```(?:tsx|jsx|typescript|ts|javascript|js)?\n([\s\S]*?)```/;
  const match = response.match(codeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return null;
}

/**
 * Execute prompt builtin and wait for completion
 */
export async function executeAutoCreateBuiltin(
  dispatch: AppDispatch,
  getState: () => any,
  variables: AutoCreateBuiltinVariables,
  mode: AutoCreateMode = 'standard'
): Promise<AutoCreateResult> {
  let runId: string | null = null;
  
  try {
    // Select the appropriate builtin
    const builtinId = mode === 'lightning' 
      ? PROMPT_BUILTINS.PROMPT_APP_AUTO_CREATE_LIGHTNING.id
      : PROMPT_BUILTINS.PROMPT_APP_AUTO_CREATE.id;

    console.log(`[AutoCreate] Starting builtin: ${mode}`, { builtinId, variables });

    // Start the prompt instance
    runId = await dispatch(startPromptInstance({
      promptId: builtinId,
      promptSource: 'prompt_builtins',
      variables,
      executionConfig: {
        auto_run: false,
        allow_chat: false,
        show_variables: false,
        apply_variables: true,
        track_in_runs: true,
      },
    })).unwrap();

    console.log('[AutoCreate] Instance created:', runId);

    // Execute the message
    const taskId = await dispatch(executeMessage({
      runId,
    })).unwrap();

    console.log('[AutoCreate] Execution started:', taskId);

    // Wait for response to complete
    const fullResponse = await waitForCompletion(runId, getState);
    
    console.log('[AutoCreate] Response received, length:', fullResponse.length);

    // Extract code from response
    const code = extractCodeFromResponse(fullResponse);
    
    if (!code) {
      console.error('[AutoCreate] Failed to extract code from response');
      return {
        success: false,
        fullResponse,
        error: 'Failed to extract code from response. No code block found.',
      };
    }

    console.log('[AutoCreate] Code extracted successfully, length:', code.length);

    return {
      success: true,
      code,
      fullResponse,
    };

  } catch (error: any) {
    console.error('[AutoCreate] Error during execution:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during code generation',
    };
  } finally {
    // Clean up the instance
    if (runId) {
      dispatch(removeInstance({ runId }));
    }
  }
}

/**
 * Wait for streaming to complete and return full response
 */
async function waitForCompletion(
  runId: string,
  getState: () => any,
  timeoutMs: number = 120000 // 2 minutes
): Promise<string> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const state = getState();
      const isEnded = selectIsResponseEndedForInstance(state, runId);
      
      if (isEnded) {
        clearInterval(checkInterval);
        const fullResponse = selectStreamingTextForInstance(state, runId) || '';
        resolve(fullResponse);
        return;
      }
      
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for response'));
      }
    }, 100); // Check every 100ms
  });
}

/**
 * Generate unique app slug from prompt name
 */
export function generateAppSlug(promptName: string): string {
  // Convert to lowercase, replace spaces and special chars with hyphens
  const baseSlug = promptName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
  
  // Generate random 3-digit code
  const randomCode = Math.floor(100 + Math.random() * 900);
  
  return `${baseSlug}-${randomCode}`;
}

