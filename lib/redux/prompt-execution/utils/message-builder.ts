/**
 * Message Builder Utility
 * 
 * Shared logic for building the final message content that will be sent to the model.
 * This ensures the debug component shows EXACTLY what will be sent.
 * 
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for message construction.
 * Both executeMessageThunk and debug components MUST use this.
 */

import type { Resource } from '@/features/prompts/types/resources';
import type { ConversationMessage } from '../types';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';
import { fetchResourcesData } from '@/features/prompts/utils/resource-data-fetcher';
import { formatResourcesToXml, appendResourcesToMessage } from '@/features/prompts/utils/resource-formatting';

export interface BuildMessageOptions {
  /**
   * Mode 1: Is this the first message with a template?
   * If true, we'll combine template + user input
   */
  isFirstMessage: boolean;
  
  /**
   * Mode 1: Is the last template message from the user?
   * If true, we replace it with our combined message
   */
  isLastTemplateMessageUser: boolean;
  
  /**
   * The last message from the conversation template (if in Mode 1)
   * Note: Template messages may not have timestamps
   */
  lastTemplateMessage?: { role: 'user' | 'assistant' | 'system'; content: string };
  
  /**
   * The user's additional input/message
   */
  userInput: string;
  
  /**
   * Resources to attach to the message
   */
  resources: Resource[];
  
  /**
   * Variables to replace in the message
   */
  variables: Record<string, string>;
}

export interface BuildMessageResult {
  /**
   * The final message content with variables replaced and resources appended
   */
  finalContent: string;
  
  /**
   * The base message before resources were added (for debugging)
   */
  baseContent: string;
  
  /**
   * The formatted resources XML (for debugging)
   */
  resourcesXml: string;
  
  /**
   * Whether resources were included
   */
  hasResources: boolean;
}

/**
 * Build the final message content that will be sent to the model
 * 
 * This function handles:
 * 1. Combining template + user input (Mode 1) OR just user input (Mode 2)
 * 2. Fetching and formatting resources
 * 3. Appending resources to message
 * 4. Replacing variables in the complete message
 * 
 * @param options - Message building options
 * @returns The final message content and metadata
 */
export async function buildFinalMessage(
  options: BuildMessageOptions
): Promise<BuildMessageResult> {
  const {
    isFirstMessage,
    isLastTemplateMessageUser,
    lastTemplateMessage,
    userInput,
    resources,
    variables,
  } = options;
  
  // ========== STEP 1: Build Base Message Content ==========
  let baseContent: string;
  
  if (isFirstMessage && isLastTemplateMessageUser && lastTemplateMessage) {
    // Mode 1: First message with template
    // Combine template with user input
    const templateContent = lastTemplateMessage.content;
    
    baseContent = userInput.trim()
      ? `${templateContent}\n\n${userInput}`
      : templateContent;
  } else {
    // Mode 2: Direct chat (subsequent messages)
    // Just use input
    baseContent = userInput;
  }
  
  if (!baseContent.trim()) {
    throw new Error('No message content to build');
  }
  
  // ========== STEP 2: Fetch and Format Resources ==========
  let resourcesXml = '';
  const hasResources = resources.length > 0;
  
  if (hasResources) {
    // Fetch data for resources that need it (e.g., tables)
    const enrichedResources = await fetchResourcesData(resources);
    
    // Format to XML
    resourcesXml = formatResourcesToXml(enrichedResources);
  }
  
  // ========== STEP 3: Append Resources to Message ==========
  const messageWithResources = appendResourcesToMessage(
    baseContent,
    resourcesXml
  );
  
  // ========== STEP 4: Replace Variables ==========
  // Replace variables in the COMPLETE message (template + input + resources)
  const finalContent = replaceVariablesInText(
    messageWithResources,
    variables
  );
  
  return {
    finalContent,
    baseContent,
    resourcesXml,
    hasResources,
  };
}

