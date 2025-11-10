/**
 * Parse AI Code Edit Response
 * 
 * Extracts SEARCH/REPLACE blocks from AI-generated responses
 * Format:
 * ```
 * SEARCH:
 * <<<
 * [code to find]
 * >>>
 * 
 * REPLACE:
 * <<<
 * [replacement code]
 * >>>
 * ```
 */

export interface CodeEdit {
  search: string;
  replace: string;
  id: string;
}

export interface ParseResult {
  edits: CodeEdit[];
  explanation?: string;
  success: boolean;
  error?: string;
  rawResponse?: string; // Always preserve the original response
  parseDetails?: {
    foundSearchBlocks: number;
    foundReplaceBlocks: number;
    skippedBlocks: string[];
    warnings: string[];
  };
}

/**
 * Parse the AI response to extract SEARCH/REPLACE blocks
 */
export function parseCodeEdits(response: string): ParseResult {
  const warnings: string[] = [];
  const skippedBlocks: string[] = [];
  
  try {
    const edits: CodeEdit[] = [];
    
    // Always preserve raw response
    const rawResponse = response;
    
    // Log the raw response for debugging
    console.log('=== RAW AI RESPONSE ===');
    console.log(response);
    console.log('=== END RAW RESPONSE ===');
    
    // Remove markdown code fences if present
    let cleanedResponse = response.replace(/```[\s\S]*?```/g, (match) => {
      // Extract content inside code fence
      return match.replace(/```[a-z]*\n?/g, '').replace(/\n?```/g, '');
    });

    // Try multiple delimiter variations
    const searchDelimiters = [
      /SEARCH:\s*\n?<<<\s*\n?/gi,
      /SEARCH:\s*\n?<<\s*\n?/gi,
      /SEARCH:\s*\n?<\s*\n?/gi,
      /SEARCH:\s*\n/gi,
    ];
    
    const replaceDelimiters = [
      />>>\s*\n?\s*REPLACE:\s*\n?<<<\s*\n?/gi,
      />>>\s*\n?\s*REPLACE:\s*\n?<<\s*\n?/gi,
      />>>\s*\n?\s*REPLACE:\s*\n?<\s*\n?/gi,
      />>\s*\n?\s*REPLACE:\s*\n?<<<\s*\n?/gi,
      />>\s*\n?\s*REPLACE:\s*\n?<<\s*\n?/gi,
      />\s*\n?\s*REPLACE:\s*\n?<<<\s*\n?/gi,
      />\s*\n?\s*REPLACE:\s*\n?<\s*\n?/gi,
      /REPLACE:\s*\n?<<<\s*\n?/gi,
      /REPLACE:\s*\n?<<\s*\n?/gi,
      /REPLACE:\s*\n?<\s*\n?/gi,
    ];
    
    const endDelimiters = [
      />>>/g,
      />>/g,
      />/g,
    ];

    // Try to split by SEARCH: blocks with different delimiters
    let searchBlocks: string[] = [];
    let usedDelimiter = '';
    
    for (const delimiter of searchDelimiters) {
      const blocks = cleanedResponse.split(delimiter);
      if (blocks.length > 1) {
        searchBlocks = blocks;
        usedDelimiter = delimiter.toString();
        console.log(`Found ${blocks.length - 1} SEARCH blocks using delimiter: ${usedDelimiter}`);
        break;
      }
    }
    
    if (searchBlocks.length <= 1) {
      return {
        success: false,
        edits: [],
        error: `No SEARCH: blocks found in response. Expected format:
        
SEARCH:
<<<
[code to find]
>>>

REPLACE:
<<<
[replacement code]
>>>

Response preview: ${response.substring(0, 200)}...`,
        rawResponse,
        parseDetails: {
          foundSearchBlocks: 0,
          foundReplaceBlocks: 0,
          skippedBlocks: [],
          warnings: ['No SEARCH: delimiter found in response'],
        },
      };
    }
    
    // Skip first element (text before first SEARCH)
    const explanation = searchBlocks[0].trim();
    let foundReplaceBlocks = 0;
    
    for (let i = 1; i < searchBlocks.length; i++) {
      const block = searchBlocks[i];
      const blockPreview = block.substring(0, 100).replace(/\n/g, '\\n');
      
      console.log(`\n--- Processing SEARCH block ${i} ---`);
      console.log('Block preview:', blockPreview);
      
      // Try different REPLACE delimiters
      let parts: string[] = [];
      let usedReplaceDelimiter = '';
      
      for (const replaceDelim of replaceDelimiters) {
        const testParts = block.split(replaceDelim);
        if (testParts.length >= 2) {
          parts = testParts;
          usedReplaceDelimiter = replaceDelim.toString();
          console.log(`Found REPLACE using delimiter: ${usedReplaceDelimiter}`);
          foundReplaceBlocks++;
          break;
        }
      }
      
      if (parts.length < 2) {
        const warning = `Block ${i}: No REPLACE: section found. Block preview: "${blockPreview}"`;
        warnings.push(warning);
        skippedBlocks.push(blockPreview);
        console.warn(warning);
        continue;
      }
      
      // Extract search content (before REPLACE)
      let searchContent = parts[0];
      
      // Try different end delimiters for search
      for (const endDelim of endDelimiters) {
        const endMatch = searchContent.match(endDelim);
        if (endMatch) {
          searchContent = searchContent.substring(0, endMatch.index);
          break;
        }
      }
      
      searchContent = searchContent.trim();
      
      // Extract replace content (after REPLACE)
      let replaceContent = parts[1];
      
      // Try different end delimiters for replace
      for (const endDelim of endDelimiters) {
        const endMatch = replaceContent.match(endDelim);
        if (endMatch) {
          replaceContent = replaceContent.substring(0, endMatch.index);
          break;
        }
      }
      
      replaceContent = replaceContent.trim();
      
      if (!searchContent) {
        const warning = `Block ${i}: Empty SEARCH content after parsing. Block preview: "${blockPreview}"`;
        warnings.push(warning);
        skippedBlocks.push(blockPreview);
        console.warn(warning);
        continue;
      }
      
      console.log(`Block ${i} parsed successfully:`);
      console.log('- Search length:', searchContent.length);
      console.log('- Replace length:', replaceContent.length);
      console.log('- Search preview:', searchContent.substring(0, 50).replace(/\n/g, '\\n'));
      
      edits.push({
        id: `edit-${i}`,
        search: searchContent,
        replace: replaceContent,
      });
    }
    
    const parseDetails = {
      foundSearchBlocks: searchBlocks.length - 1,
      foundReplaceBlocks,
      skippedBlocks,
      warnings,
    };
    
    if (edits.length === 0) {
      let errorMsg = `No valid SEARCH/REPLACE blocks could be parsed.\n\n`;
      errorMsg += `Analysis:\n`;
      errorMsg += `- Found ${parseDetails.foundSearchBlocks} SEARCH: blocks\n`;
      errorMsg += `- Found ${parseDetails.foundReplaceBlocks} REPLACE: blocks\n`;
      
      if (warnings.length > 0) {
        errorMsg += `\nIssues found:\n`;
        warnings.forEach((w, idx) => {
          errorMsg += `${idx + 1}. ${w}\n`;
        });
      }
      
      errorMsg += `\nExpected format:\n`;
      errorMsg += `SEARCH:\n<<<\n[code]\n>>>\n\nREPLACE:\n<<<\n[code]\n>>>`;
      
      return {
        success: false,
        edits: [],
        error: errorMsg,
        rawResponse,
        parseDetails,
      };
    }
    
    return {
      success: true,
      edits,
      explanation: explanation || undefined,
      rawResponse,
      parseDetails,
    };
    
  } catch (error) {
    console.error('Error parsing code edits:', error);
    return {
      success: false,
      edits: [],
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      rawResponse: response,
      parseDetails: {
        foundSearchBlocks: 0,
        foundReplaceBlocks: 0,
        skippedBlocks,
        warnings: [...warnings, `Exception during parsing: ${error}`],
      },
    };
  }
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
 * Find fuzzy matches (whitespace-insensitive)
 */
function findFuzzyMatches(code: string, searchPattern: string): number {
  const normalizedPattern = normalizeForMatching(searchPattern);
  const codeLines = code.split('\n');
  const searchLines = searchPattern.split('\n');
  let matchCount = 0;
  
  for (let i = 0; i <= codeLines.length - searchLines.length; i++) {
    const potentialMatch = codeLines.slice(i, i + searchLines.length).join('\n');
    const normalizedMatch = normalizeForMatching(potentialMatch);
    
    if (normalizedMatch === normalizedPattern) {
      matchCount++;
    }
  }
  
  return matchCount;
}

/**
 * Validate that search blocks can be found in the source code
 */
export function validateEdits(code: string, edits: CodeEdit[]): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    const exactMatch = code.indexOf(edit.search);
    
    // Try exact match first
    if (exactMatch !== -1) {
      // Check for duplicates
      const secondMatch = code.indexOf(edit.search, exactMatch + 1);
      if (secondMatch !== -1) {
        errors.push(`\n━━━ Edit ${i + 1} of ${edits.length} ━━━\n❌ Multiple exact matches found\n💡 Make search pattern more specific to uniquely identify the code block\n`);
      }
      continue; // Exact match found and unique
    }
    
    // Try fuzzy match (whitespace-insensitive)
    const fuzzyMatchCount = findFuzzyMatches(code, edit.search);
    
    if (fuzzyMatchCount === 1) {
      // Perfect! One fuzzy match - this will work
      warnings.push(`Edit ${i + 1}: Will use fuzzy matching (whitespace differs but pattern is unique)`);
      continue;
    }
    
    if (fuzzyMatchCount > 1) {
      errors.push(`\n━━━ Edit ${i + 1} of ${edits.length} ━━━\n❌ Found ${fuzzyMatchCount} similar patterns (ambiguous)\n💡 Make search pattern more specific to uniquely identify the code block\n`);
      continue;
    }
    
    // No match at all - provide detailed debugging
    const searchLines = edit.search.split('\n');
    const firstLine = searchLines[0].trim();
    const lastLine = searchLines[searchLines.length - 1].trim();
    
    let errorMsg = `\n━━━ Edit ${i + 1} of ${edits.length} ━━━\n`;
    errorMsg += `❌ SEARCH pattern not found in code\n\n`;
    
    // Show search pattern details
    errorMsg += `📝 Search Pattern (${searchLines.length} lines, ${edit.search.length} chars):\n`;
    errorMsg += `   First line: "${firstLine.substring(0, 60)}${firstLine.length > 60 ? '...' : ''}"\n`;
    if (searchLines.length > 1) {
      errorMsg += `   Last line:  "${lastLine.substring(0, 60)}${lastLine.length > 60 ? '...' : ''}"\n`;
    }
    errorMsg += `\n`;
    
    // Try to find similar content
    const firstLineMatches = code.includes(firstLine);
    const fuzzyMatch = findSimilarContent(code, firstLine);
    
    if (firstLineMatches) {
      errorMsg += `✓ First line DOES exist in the code\n`;
      errorMsg += `⚠️  But the full pattern doesn't match (even with fuzzy matching)\n`;
      errorMsg += `💡 Likely issue: Missing lines, or surrounding code differs significantly\n\n`;
      
      // Show where the first line appears
      const firstLineIndex = code.indexOf(firstLine);
      const contextStart = Math.max(0, firstLineIndex - 100);
      const contextEnd = Math.min(code.length, firstLineIndex + firstLine.length + 100);
      const context = code.substring(contextStart, contextEnd);
      
      errorMsg += `📍 First line found near:\n`;
      errorMsg += `\`\`\`\n${context}\n\`\`\`\n`;
    } else if (fuzzyMatch) {
      errorMsg += `🔍 Similar content found: "${fuzzyMatch.substring(0, 80)}..."\n`;
      errorMsg += `💡 The AI's search pattern might not match the actual code exactly\n`;
    } else {
      errorMsg += `❌ First line not found anywhere in the code\n`;
      errorMsg += `💡 The AI might be editing code that doesn't exist in this file\n`;
    }
    
    errorMsg += `\n`;
    errorMsg += `📋 Full SEARCH pattern:\n`;
    errorMsg += `${'─'.repeat(60)}\n`;
    errorMsg += edit.search;
    errorMsg += `\n${'─'.repeat(60)}\n`;
    
    errors.push(errorMsg);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Find similar content in the code (fuzzy matching)
 */
function findSimilarContent(code: string, searchLine: string): string | null {
  // Normalize the search line (remove extra whitespace)
  const normalized = searchLine.replace(/\s+/g, ' ').trim().toLowerCase();
  
  if (normalized.length < 10) return null;
  
  // Look for the first 30 chars
  const searchPart = normalized.substring(0, 30);
  const codeLines = code.split('\n');
  
  for (const line of codeLines) {
    const normalizedLine = line.replace(/\s+/g, ' ').trim().toLowerCase();
    if (normalizedLine.includes(searchPart)) {
      return line.trim();
    }
  }
  
  return null;
}

