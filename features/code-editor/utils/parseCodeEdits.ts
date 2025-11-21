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
 * 
 * NEW STRICT PARSING:
 * - Delimiters MUST be on their own line
 * - Opening and closing delimiters must match (<<<...>>> or <<...>> or <...>)
 * - Everything between matching delimiters is treated as code (no partial matches)
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
    
    // Remove markdown code fences if present (but keep the content)
    let cleanedResponse = response.replace(/```[\s\S]*?```/g, (match) => {
      // Extract content inside code fence
      return match.replace(/```[a-z]*\n?/g, '').replace(/\n?```/g, '');
    });

    // Use regex to extract SEARCH/REPLACE blocks with STRICT line-based matching
    // Delimiters MUST be on their own lines
    // We match <<< with >>>, << with >>, and < with >
    const blockPattern = /SEARCH:\s*\n\s*(<<<|<<|<)\s*\n([\s\S]*?)\n\s*(>>>|>>|>)\s*\n\s*REPLACE:\s*\n\s*(<<<|<<|<)\s*\n([\s\S]*?)\n\s*(>>>|>>|>)\s*/gi;
    
    let match;
    let blockIndex = 0;
    const explanation = cleanedResponse.split(/SEARCH:/i)[0].trim();
    
    console.log('\n=== Starting to parse SEARCH/REPLACE blocks ===');
    console.log('Cleaned response length:', cleanedResponse.length);
    console.log('First 500 chars:', cleanedResponse.substring(0, 500));
    
    while ((match = blockPattern.exec(cleanedResponse)) !== null) {
      blockIndex++;
      
      const searchOpenDelim = match[1]; // Opening delimiter for SEARCH (<<<, <<, or <)
      const searchContent = match[2].trim();
      const searchCloseDelim = match[3]; // Closing delimiter for SEARCH (>>>, >>, or >)
      const replaceOpenDelim = match[4]; // Opening delimiter for REPLACE
      const replaceContent = match[5].trim();
      const replaceCloseDelim = match[6]; // Closing delimiter for REPLACE
      
      console.log(`\n--- Parsed SEARCH/REPLACE block ${blockIndex} ---`);
      console.log('Search delimiters:', `${searchOpenDelim}...${searchCloseDelim}`);
      console.log('Search content length:', searchContent.length);
      console.log('Search content preview:', searchContent.substring(0, 100).replace(/\n/g, '\\n'));
      console.log('Replace delimiters:', `${replaceOpenDelim}...${replaceCloseDelim}`);
      console.log('Replace content length:', replaceContent.length);
      console.log('Replace content preview:', replaceContent.substring(0, 100).replace(/\n/g, '\\n'));
      
      // Validate delimiter matching
      const searchDelimMatch = 
        (searchOpenDelim === '<<<' && searchCloseDelim === '>>>') ||
        (searchOpenDelim === '<<' && searchCloseDelim === '>>') ||
        (searchOpenDelim === '<' && searchCloseDelim === '>');
      
      const replaceDelimMatch = 
        (replaceOpenDelim === '<<<' && replaceCloseDelim === '>>>') ||
        (replaceOpenDelim === '<<' && replaceCloseDelim === '>>') ||
        (replaceOpenDelim === '<' && replaceCloseDelim === '>');
      
      if (!searchDelimMatch) {
        const warning = `Block ${blockIndex}: SEARCH delimiters don't match (${searchOpenDelim} vs ${searchCloseDelim})`;
        warnings.push(warning);
        console.warn(warning);
        continue;
      }
      
      if (!replaceDelimMatch) {
        const warning = `Block ${blockIndex}: REPLACE delimiters don't match (${replaceOpenDelim} vs ${replaceCloseDelim})`;
        warnings.push(warning);
        console.warn(warning);
        continue;
      }
      
      if (!searchContent) {
        const warning = `Block ${blockIndex}: Empty SEARCH content`;
        warnings.push(warning);
        skippedBlocks.push(`Empty SEARCH at position ${match.index}`);
        console.warn(warning);
        continue;
      }
      
      edits.push({
        id: `edit-${blockIndex}`,
        search: searchContent,
        replace: replaceContent, // Can be empty (deletion)
      });
    }
    
    console.log(`\n=== Parsing complete: Found ${blockIndex} blocks ===`);
    
    const parseDetails = {
      foundSearchBlocks: blockIndex,
      foundReplaceBlocks: blockIndex,
      skippedBlocks,
      warnings,
    };
    
    if (edits.length === 0) {
      // Try to provide helpful debugging info
      const hasSearchKeyword = /SEARCH:/i.test(cleanedResponse);
      const hasReplaceKeyword = /REPLACE:/i.test(cleanedResponse);
      const hasDelimiters = /<{1,3}/.test(cleanedResponse) && />{1,3}/.test(cleanedResponse);
      
      let errorMsg = `No valid SEARCH/REPLACE blocks found.\n\n`;
      errorMsg += `Diagnostics:\n`;
      errorMsg += `- Contains "SEARCH:": ${hasSearchKeyword ? '✓' : '❌'}\n`;
      errorMsg += `- Contains "REPLACE:": ${hasReplaceKeyword ? '✓' : '❌'}\n`;
      errorMsg += `- Contains delimiters: ${hasDelimiters ? '✓' : '❌'}\n`;
      errorMsg += `- Parsed blocks: ${blockIndex}\n`;
      
      if (warnings.length > 0) {
        errorMsg += `\nWarnings:\n`;
        warnings.forEach((w, idx) => {
          errorMsg += `${idx + 1}. ${w}\n`;
        });
      }
      
      errorMsg += `\nRequired format (delimiters MUST be on their own lines):\n\n`;
      errorMsg += `SEARCH:\n`;
      errorMsg += `<<<\n`;
      errorMsg += `[exact code to find]\n`;
      errorMsg += `>>>\n\n`;
      errorMsg += `REPLACE:\n`;
      errorMsg += `<<<\n`;
      errorMsg += `[replacement code]\n`;
      errorMsg += `>>>\n`;
      
      return {
        success: false,
        edits: [],
        error: errorMsg,
        rawResponse,
        parseDetails,
      };
    }
    
    console.log(`\n=== Successfully parsed ${edits.length} edit(s) ===`);
    
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

