/**
 * Prompt Context Resolver
 * 
 * Resolves variables for system prompts based on:
 * 1. The functionality_id (what the CODE expects)
 * 2. The placement_type (where it's being used)
 * 3. The available UI context
 */

import { extractVariablesFromPrompt } from '@/types/system-prompt-functionalities';

export interface UIContext {
  // Text context
  selection?: string;
  editorContent?: string;
  highlightedText?: string;
  
  // Code context
  currentCode?: string;
  language?: string;
  framework?: string;
  errorMessage?: string;
  
  // Card context
  cardTitle?: string;
  cardDescription?: string;
  cardContext?: string;
  
  // General context
  pageUrl?: string;
  userId?: string;
  topic?: string;
  query?: string;
  
  // Custom
  [key: string]: any;
}

export class PromptContextResolver {
  /**
   * Extract variables from prompt snapshot
   */
  static getVariables(promptSnapshot: any): string[] {
    return extractVariablesFromPrompt(promptSnapshot);
  }

  /**
   * Resolve all variables for a prompt based on functionality and context
   */
  static resolve(
    promptSnapshot: any,
    functionalityId: string,
    placementType: string,
    uiContext: UIContext
  ): Record<string, any> {
    const variables = this.getVariables(promptSnapshot);
    const resolved: Record<string, any> = {};

    for (const varName of variables) {
      resolved[varName] = this.resolveVariable(
        varName,
        functionalityId,
        placementType,
        uiContext
      );
    }

    return resolved;
  }

  /**
   * Checks if all required variables can be resolved from the UI context.
   * 
   * @param promptSnapshot - The prompt snapshot
   * @param functionalityId - The functionality ID
   * @param placementType - Where it's being triggered from
   * @param uiContext - The current UI state
   * @returns Object with canResolve boolean and list of missing variables
   */
  static canResolve(
    promptSnapshot: any,
    functionalityId: string,
    placementType: string,
    uiContext: UIContext
  ): { canResolve: boolean; missingVariables: string[] } {
    const variables = this.getVariables(promptSnapshot);
    const missing: string[] = [];

    for (const varName of variables) {
      const value = this.resolveVariable(varName, functionalityId, placementType, uiContext);
      if (value === undefined || value === null || value === '') {
        missing.push(varName);
      }
    }

    return {
      canResolve: missing.length === 0,
      missingVariables: missing,
    };
  }

  /**
   * Resolve a single variable based on functionality
   */
  private static resolveVariable(
    varName: string,
    functionalityId: string,
    placementType: string,
    uiContext: UIContext
  ): any {
    // Functionality-specific resolution
    switch (functionalityId) {
      // ===== CONTENT CARDS =====
      case 'content-expander-card':
        if (varName === 'title') return uiContext.cardTitle;
        if (varName === 'description') return uiContext.cardDescription;
        if (varName === 'context') return uiContext.cardContext;
        break;

      // ===== TEXT OPERATIONS =====
      case 'explain-text':
        if (varName === 'content_to_explain') {
          return uiContext.selection || uiContext.highlightedText || uiContext.editorContent;
        }
        if (varName === 'context') return uiContext.editorContent;
        break;

      case 'summarize-text':
      case 'improve-writing':
      case 'extract-key-points':
        if (varName === 'text') {
          return uiContext.selection || uiContext.highlightedText || uiContext.editorContent;
        }
        if (varName === 'style') return uiContext.style || 'concise';
        break;

      case 'translate-text':
        if (varName === 'text') {
          return uiContext.selection || uiContext.highlightedText || uiContext.editorContent;
        }
        if (varName === 'target_language') return uiContext.targetLanguage || uiContext.target_language;
        if (varName === 'source_language') return uiContext.sourceLanguage || uiContext.source_language;
        break;

      // ===== CODE OPERATIONS =====
      case 'analyze-code':
      case 'fix-code':
      case 'refactor-code':
        if (varName === 'current_code' || varName === 'code') {
          return uiContext.currentCode || uiContext.selection || uiContext.code;
        }
        if (varName === 'language') return uiContext.language;
        if (varName === 'framework') return uiContext.framework;
        if (varName === 'error_message') return uiContext.errorMessage || uiContext.error_message;
        break;

      // ===== CONTENT GENERATION =====
      case 'generate-content':
      case 'get-ideas':
        if (varName === 'topic') {
          return uiContext.topic || uiContext.selection || uiContext.query;
        }
        if (varName === 'tone') return uiContext.tone;
        if (varName === 'length') return uiContext.length;
        if (varName === 'style') return uiContext.style;
        if (varName === 'audience') return uiContext.audience;
        break;

      case 'create-flashcards':
      case 'create-quiz':
        if (varName === 'content') {
          return uiContext.selection || uiContext.editorContent || uiContext.content;
        }
        if (varName === 'difficulty') return uiContext.difficulty;
        if (varName === 'question_count') return uiContext.questionCount || uiContext.question_count;
        break;

      // ===== UTILITIES =====
      case 'search-web':
        if (varName === 'query') {
          return uiContext.query || uiContext.selection || uiContext.topic;
        }
        break;

      // ===== CUSTOM =====
      case 'custom':
        // Try direct match first
        if (uiContext[varName] !== undefined) {
          return uiContext[varName];
        }
        // Common fallbacks
        if (varName === 'text' || varName === 'content') {
          return uiContext.selection || uiContext.editorContent || uiContext.text || uiContext.content;
        }
        if (varName === 'code' || varName === 'current_code') {
          return uiContext.currentCode || uiContext.code;
        }
        break;
    }

    // Direct match fallback
    if (uiContext[varName] !== undefined) {
      return uiContext[varName];
    }

    // Common variable name fallbacks
    if (varName === 'text' || varName === 'content') {
      return uiContext.selection || uiContext.editorContent;
    }
    if (varName === 'code' || varName === 'current_code') {
      return uiContext.currentCode || uiContext.selection;
    }

    // Return undefined if can't resolve
    return undefined;
  }
}

