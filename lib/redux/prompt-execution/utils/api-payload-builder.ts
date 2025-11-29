/**
 * API Payload Builder Utility
 * 
 * SINGLE SOURCE OF TRUTH for what gets sent to the API.
 * This utility replicates the EXACT logic from executeMessageThunk.
 * 
 * Used by:
 * 1. Debug panel - to show accurate preview
 * 2. Any other debugging/logging tools
 * 
 * CRITICAL: This must match executeMessageThunk.ts logic exactly.
 */

import type { ConversationMessage } from '../types';
import type { Resource } from '@/features/prompts/types/resources';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';
import { buildFinalMessage } from './message-builder';

export interface APIPayloadBuilderOptions {
  /**
   * Current state from Redux
   */
  requiresVariableReplacement: boolean;
  messages: ConversationMessage[];
  currentInput: string;
  resources: Resource[];
  variables: Record<string, string>;
}

export interface APIPayloadResult {
  /**
   * The exact messages array that will be sent to the API
   */
  messages: Array<{ role: string; content: string }>;
  
  /**
   * Whether this is simulating first execution (Mode 1)
   */
  isSimulation: boolean;
  
  /**
   * Error if payload cannot be built
   */
  error?: string;
}

/**
 * Build the EXACT API payload that will be sent
 * 
 * This function follows the same logic as executeMessageThunk:
 * 1. First execution (requiresVariableReplacement=true): Simulate template processing
 * 2. Subsequent execution: Show current messages + what would be appended
 * 
 * @param options - Current state options
 * @returns The exact API payload with metadata
 */
export async function buildAPIPayload(
  options: APIPayloadBuilderOptions
): Promise<APIPayloadResult> {
  const {
    requiresVariableReplacement,
    messages,
    currentInput,
    resources,
    variables,
  } = options;

  try {
    if (requiresVariableReplacement) {
      // ========== MODE 1: FIRST EXECUTION (SIMULATION) ==========
      // This simulates what executeMessageThunk does on first execution
      
      // Process all template messages (replace variables)
      const processedMessages = messages.map(msg => ({
        role: msg.role,
        content: replaceVariablesInText(msg.content, variables),
      }));

      // Check if last message is user message
      const lastMsg = processedMessages[processedMessages.length - 1];
      const isLastMessageUser = lastMsg?.role === 'user';
      
      if (isLastMessageUser && lastMsg) {
        // Build the final message using the message builder
        const lastTemplateMessage = messages[messages.length - 1];
        
        const result = await buildFinalMessage({
          isFirstMessage: true,
          isLastTemplateMessageUser: true,
          lastTemplateMessage: {
            role: lastTemplateMessage.role as 'user' | 'assistant' | 'system',
            content: lastTemplateMessage.content,
          },
          userInput: currentInput,
          resources,
          variables,
        });

        // Replace last message with the combined one
        lastMsg.content = result.finalContent;
        
        return {
          messages: processedMessages,
          isSimulation: true,
        };
      } else {
        // Last message is not user - append new user message
        if (currentInput.trim() || resources.length > 0) {
          const result = await buildFinalMessage({
            isFirstMessage: true,
            isLastTemplateMessageUser: false,
            userInput: currentInput,
            resources,
            variables,
          });

          processedMessages.push({
            role: 'user',
            content: result.finalContent,
          });
        }

        return {
          messages: processedMessages,
          isSimulation: true,
        };
      }
    } else {
      // ========== MODE 2: SUBSEQUENT EXECUTION ==========
      // Show current messages + what will be appended
      
      const currentMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // If there's input/resources, show what would be appended
      if (currentInput.trim() || resources.length > 0) {
        const result = await buildFinalMessage({
          isFirstMessage: false,
          isLastTemplateMessageUser: false,
          userInput: currentInput,
          resources,
          variables,
        });

        currentMessages.push({
          role: 'user',
          content: result.finalContent,
        });
      }

      return {
        messages: currentMessages,
        isSimulation: false,
      };
    }
  } catch (error) {
    return {
      messages: [],
      isSimulation: requiresVariableReplacement,
      error: error instanceof Error ? error.message : 'Failed to build payload',
    };
  }
}

/**
 * Synchronous version for quick previews (without resources)
 * Use this when you don't need resource fetching/formatting
 */
export function buildAPIPayloadSync(
  options: APIPayloadBuilderOptions
): APIPayloadResult {
  const {
    requiresVariableReplacement,
    messages,
    currentInput,
    variables,
  } = options;

  try {
    if (requiresVariableReplacement) {
      // Process templates
      const processedMessages = messages.map(msg => ({
        role: msg.role,
        content: replaceVariablesInText(msg.content, variables),
      }));

      // Check last message
      const lastMsg = processedMessages[processedMessages.length - 1];
      const isLastMessageUser = lastMsg?.role === 'user';

      if (isLastMessageUser && lastMsg) {
        // Append to last message
        if (currentInput.trim()) {
          lastMsg.content = `${lastMsg.content}\n\n${currentInput.trim()}`;
        }
      } else if (currentInput.trim()) {
        // Add new message
        processedMessages.push({
          role: 'user',
          content: currentInput.trim(),
        });
      }

      return {
        messages: processedMessages,
        isSimulation: true,
      };
    } else {
      // Show current messages + potential append
      const currentMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      if (currentInput.trim()) {
        currentMessages.push({
          role: 'user',
          content: currentInput.trim(),
        });
      }

      return {
        messages: currentMessages,
        isSimulation: false,
      };
    }
  } catch (error) {
    return {
      messages: [],
      isSimulation: requiresVariableReplacement,
      error: error instanceof Error ? error.message : 'Failed to build payload',
    };
  }
}

