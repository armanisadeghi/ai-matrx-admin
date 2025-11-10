/**
 * Apply Code Edits
 * 
 * Takes SEARCH/REPLACE blocks and applies them to source code
 */

import { CodeEdit } from './parseCodeEdits';

export interface ApplyResult {
  success: boolean;
  code?: string;
  appliedEdits: number;
  errors: string[];
  warnings: string[];
}

/**
 * Normalize code for fuzzy matching (whitespace-insensitive)
 */
function normalizeForMatching(code: string): string {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Find all occurrences of a pattern in code with fuzzy whitespace matching
 */
function findFuzzyMatches(code: string, searchPattern: string): number[] {
  const matches: number[] = [];
  const normalizedPattern = normalizeForMatching(searchPattern);
  const codeLines = code.split('\n');
  const searchLines = searchPattern.split('\n');
  
  // Try to find fuzzy matches
  for (let i = 0; i <= codeLines.length - searchLines.length; i++) {
    const potentialMatch = codeLines.slice(i, i + searchLines.length).join('\n');
    const normalizedMatch = normalizeForMatching(potentialMatch);
    
    if (normalizedMatch === normalizedPattern) {
      // Found a fuzzy match - calculate character position
      const charPos = codeLines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
      matches.push(charPos);
    }
  }
  
  return matches;
}

/**
 * Extract the actual code at a fuzzy match position
 */
function extractFuzzyMatch(code: string, position: number, searchPattern: string): string {
  const searchLineCount = searchPattern.split('\n').length;
  const codeLines = code.split('\n');
  
  // Find which line this position is on
  let currentPos = 0;
  let startLine = 0;
  
  for (let i = 0; i < codeLines.length; i++) {
    const lineLength = codeLines[i].length + 1; // +1 for newline
    if (currentPos + lineLength > position) {
      startLine = i;
      break;
    }
    currentPos += lineLength;
  }
  
  // Extract the lines
  const matchedLines = codeLines.slice(startLine, startLine + searchLineCount);
  return matchedLines.join('\n');
}

/**
 * Apply all edits to the source code
 * Returns the modified code or error details
 */
export function applyCodeEdits(originalCode: string, edits: CodeEdit[]): ApplyResult {
  let modifiedCode = originalCode;
  const errors: string[] = [];
  const warnings: string[] = [];
  let appliedCount = 0;
  
  for (const edit of edits) {
    // Try exact match first
    let index = modifiedCode.indexOf(edit.search);
    let usedFuzzyMatch = false;
    let actualMatchedCode = edit.search;
    
    if (index === -1) {
      // Exact match failed - try fuzzy matching
      console.log(`[Edit ${edit.id}] Exact match failed, trying fuzzy match...`);
      const fuzzyMatches = findFuzzyMatches(modifiedCode, edit.search);
      
      if (fuzzyMatches.length === 0) {
        errors.push(`Could not find search pattern for edit ${edit.id} (tried exact and fuzzy matching)`);
        continue;
      } else if (fuzzyMatches.length === 1) {
        // Perfect! Exactly one fuzzy match
        index = fuzzyMatches[0];
        actualMatchedCode = extractFuzzyMatch(modifiedCode, index, edit.search);
        usedFuzzyMatch = true;
        warnings.push(`Edit ${edit.id}: Used fuzzy matching (whitespace differences ignored)`);
        console.log(`[Edit ${edit.id}] ✓ Found via fuzzy match at position ${index}`);
      } else {
        // Multiple fuzzy matches - ambiguous
        errors.push(`Edit ${edit.id}: Found ${fuzzyMatches.length} possible matches (ambiguous). Search pattern must be more specific.`);
        console.log(`[Edit ${edit.id}] ✗ Found ${fuzzyMatches.length} fuzzy matches - too ambiguous`);
        continue;
      }
    } else {
      // Check for multiple exact matches
      const secondIndex = modifiedCode.indexOf(edit.search, index + 1);
      if (secondIndex !== -1) {
        errors.push(`Edit ${edit.id}: Multiple exact matches found. Search pattern must be unique.`);
        continue;
      }
      console.log(`[Edit ${edit.id}] ✓ Exact match found at position ${index}`);
    }
    
    // Apply the replacement
    modifiedCode = modifiedCode.substring(0, index) + 
                   edit.replace + 
                   modifiedCode.substring(index + actualMatchedCode.length);
    
    appliedCount++;
    
    if (usedFuzzyMatch) {
      console.log(`[Edit ${edit.id}] Applied with fuzzy match (preserved target indentation)`);
    }
  }
  
  return {
    success: errors.length === 0,
    code: modifiedCode,
    appliedEdits: appliedCount,
    errors,
    warnings,
  };
}

/**
 * Generate a preview of what changes will be made
 */
export function generateChangePreview(originalCode: string, edits: CodeEdit[]): string {
  let preview = '# Proposed Changes\n\n';
  
  edits.forEach((edit, index) => {
    preview += `## Change ${index + 1}\n\n`;
    preview += `**Remove:**\n\`\`\`\n${edit.search}\n\`\`\`\n\n`;
    preview += `**Add:**\n\`\`\`\n${edit.replace}\n\`\`\`\n\n`;
    preview += '---\n\n';
  });
  
  return preview;
}

