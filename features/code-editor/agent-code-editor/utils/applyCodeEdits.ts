/**
 * Apply Code Edits
 *
 * Takes SEARCH/REPLACE blocks and applies them to source code.
 *
 * Copied verbatim from features/code-editor/utils/applyCodeEdits.ts — pure
 * utility with no system dependencies.
 */

import { CodeEdit } from "./parseCodeEdits";

export interface ApplyResult {
  success: boolean;
  code?: string;
  appliedEdits: number;
  errors: string[];
  warnings: string[];
}

function normalizeForMatching(code: string): string {
  return code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function findFuzzyMatches(code: string, searchPattern: string): number[] {
  const matches: number[] = [];
  const normalizedPattern = normalizeForMatching(searchPattern);
  const codeLines = code.split("\n");
  const searchLines = searchPattern.split("\n");

  for (let i = 0; i <= codeLines.length - searchLines.length; i++) {
    const potentialMatch = codeLines
      .slice(i, i + searchLines.length)
      .join("\n");
    const normalizedMatch = normalizeForMatching(potentialMatch);

    if (normalizedMatch === normalizedPattern) {
      const charPos =
        codeLines.slice(0, i).join("\n").length + (i > 0 ? 1 : 0);
      matches.push(charPos);
    }
  }

  return matches;
}

function extractFuzzyMatch(
  code: string,
  position: number,
  searchPattern: string,
): string {
  const searchLineCount = searchPattern.split("\n").length;
  const codeLines = code.split("\n");

  let currentPos = 0;
  let startLine = 0;

  for (let i = 0; i < codeLines.length; i++) {
    const lineLength = codeLines[i].length + 1;
    if (currentPos + lineLength > position) {
      startLine = i;
      break;
    }
    currentPos += lineLength;
  }

  const matchedLines = codeLines.slice(startLine, startLine + searchLineCount);
  return matchedLines.join("\n");
}

/**
 * Apply all edits to the source code. Returns the modified code or error details.
 */
export function applyCodeEdits(
  originalCode: string,
  edits: CodeEdit[],
): ApplyResult {
  let modifiedCode = originalCode;
  const errors: string[] = [];
  const warnings: string[] = [];
  let appliedCount = 0;

  for (const edit of edits) {
    let index = modifiedCode.indexOf(edit.search);
    let usedFuzzyMatch = false;
    let actualMatchedCode = edit.search;

    if (index === -1) {
      const fuzzyMatches = findFuzzyMatches(modifiedCode, edit.search);

      if (fuzzyMatches.length === 0) {
        errors.push(
          `Could not find search pattern for edit ${edit.id} (tried exact and fuzzy matching)`,
        );
        continue;
      } else if (fuzzyMatches.length === 1) {
        index = fuzzyMatches[0];
        actualMatchedCode = extractFuzzyMatch(
          modifiedCode,
          index,
          edit.search,
        );
        usedFuzzyMatch = true;
        warnings.push(
          `Edit ${edit.id}: Used fuzzy matching (whitespace differences ignored)`,
        );
      } else {
        errors.push(
          `Edit ${edit.id}: Found ${fuzzyMatches.length} possible matches (ambiguous). Search pattern must be more specific.`,
        );
        continue;
      }
    } else {
      const secondIndex = modifiedCode.indexOf(edit.search, index + 1);
      if (secondIndex !== -1) {
        errors.push(
          `Edit ${edit.id}: Multiple exact matches found. Search pattern must be unique.`,
        );
        continue;
      }
    }

    modifiedCode =
      modifiedCode.substring(0, index) +
      edit.replace +
      modifiedCode.substring(index + actualMatchedCode.length);

    appliedCount++;
    void usedFuzzyMatch;
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
export function generateChangePreview(
  originalCode: string,
  edits: CodeEdit[],
): string {
  void originalCode;
  let preview = "# Proposed Changes\n\n";

  edits.forEach((edit, index) => {
    preview += `## Change ${index + 1}\n\n`;
    preview += `**Remove:**\n\`\`\`\n${edit.search}\n\`\`\`\n\n`;
    preview += `**Add:**\n\`\`\`\n${edit.replace}\n\`\`\`\n\n`;
    preview += "---\n\n";
  });

  return preview;
}
