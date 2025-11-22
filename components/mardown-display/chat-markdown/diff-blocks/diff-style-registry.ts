/**
 * Diff Style Registry
 * 
 * Extensible system for detecting and handling different diff formats
 * Optimized for streaming content with partial detection
 */

import { DiffStyle, DiffStyleDetection, DiffStyleHandler } from './types';

/**
 * SEARCH/REPLACE style detector
 * Format: SEARCH:\n<<<\n[code]\n>>>\nREPLACE:\n<<<\n[code]\n>>>
 */
const searchReplaceHandler: DiffStyleHandler = {
  name: 'search-replace',
  canShowPartial: false, // We buffer SEARCH, stream REPLACE

  detect: (content: string): DiffStyleDetection => {
    const hasSearch = /SEARCH:/i.test(content);
    const hasReplace = /REPLACE:/i.test(content);
    const hasDelimiters = /<{1,3}/.test(content) && />{1,3}/.test(content);
    
    let confidence = 0;
    if (hasSearch) confidence += 0.4;
    if (hasReplace) confidence += 0.4;
    if (hasDelimiters) confidence += 0.2;
    
    // Early detection: if we see SEARCH: with delimiters, we're confident
    if (hasSearch && hasDelimiters) confidence = Math.max(confidence, 0.8);
    
    return {
      style: 'search-replace',
      confidence,
      metadata: {
        hasSearchKeyword: hasSearch,
        hasReplaceKeyword: hasReplace,
        hasDelimiters,
      },
    };
  },

  parse: (content: string) => {
    // Lightweight parse for streaming - just extract what we have so far
    const searchMatch = content.match(/SEARCH:\s*\n\s*<<<\s*\n([\s\S]*?)(?:\n\s*>>>|$)/i);
    const replaceMatch = content.match(/REPLACE:\s*\n\s*<<<\s*\n([\s\S]*?)(?:\n\s*>>>|$)/i);
    
    const searchContent = searchMatch ? searchMatch[1] : '';
    const replaceContent = replaceMatch ? replaceMatch[1] : '';
    
    // Check if blocks are complete
    const searchComplete = !!content.match(/SEARCH:\s*\n\s*<<<\s*\n[\s\S]*?\n\s*>>>/i);
    const replaceComplete = !!content.match(/REPLACE:\s*\n\s*<<<\s*\n[\s\S]*?\n\s*>>>/i);
    
    return {
      search: searchContent.trim(),
      replace: replaceContent.trim(),
      searchComplete,
      replaceComplete,
      isComplete: searchComplete && replaceComplete,
    };
  },
};

/**
 * Unified diff style detector (future)
 * Format: standard diff with + and - lines
 */
const unifiedDiffHandler: DiffStyleHandler = {
  name: 'unified',
  canShowPartial: true, // Can show line by line

  detect: (content: string): DiffStyleDetection => {
    const hasDiffMarkers = /^[+-](?!--)/.test(content);
    const hasMultipleMarkers = (content.match(/^[+-]/gm) || []).length > 1;
    
    let confidence = 0;
    if (hasDiffMarkers) confidence += 0.5;
    if (hasMultipleMarkers) confidence += 0.3;
    
    return {
      style: 'unified',
      confidence,
      metadata: {
        hasDiffMarkers,
      },
    };
  },

  parse: (content: string) => {
    // TODO: Implement unified diff parsing
    return { lines: content.split('\n') };
  },
};

/**
 * Registry of all diff style handlers
 */
const DIFF_STYLE_HANDLERS: DiffStyleHandler[] = [
  searchReplaceHandler,
  // unifiedDiffHandler, // Add when ready
  // Add more handlers here as needed
];

/**
 * Detect the style of diff from streaming content
 * Optimized for partial content - returns best guess so far
 */
export function detectDiffStyle(content: string): DiffStyleDetection {
  if (!content || content.trim().length < 5) {
    return { style: 'unknown', confidence: 0 };
  }

  // Try each handler and pick the one with highest confidence
  let bestMatch: DiffStyleDetection = { style: 'unknown', confidence: 0 };

  for (const handler of DIFF_STYLE_HANDLERS) {
    const detection = handler.detect(content);
    if (detection.confidence > bestMatch.confidence) {
      bestMatch = detection;
    }
  }

  return bestMatch;
}

/**
 * Get handler for a specific style
 */
export function getDiffStyleHandler(style: DiffStyle): DiffStyleHandler | null {
  return DIFF_STYLE_HANDLERS.find(h => h.name === style) || null;
}

/**
 * Quick check if content looks like any diff format
 * Used to decide whether to use StreamingDiffBlock or regular code block
 */
export function looksLikeDiff(content: string): boolean {
  if (!content || content.trim().length < 5) return false;
  
  // Quick heuristics for common patterns
  return (
    /SEARCH:/i.test(content) ||
    /^[+-](?!--)/m.test(content) ||
    /^diff --git/m.test(content) ||
    /<{2,3}.*>{2,3}/s.test(content)
  );
}

