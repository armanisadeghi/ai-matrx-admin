/**
 * Generate Diff View
 * 
 * Create a side-by-side or unified diff view for code changes
 */

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unchanged: number;
}

/**
 * Generate a unified diff view using Myers diff algorithm (simplified LCS)
 * This shows blocks of changes rather than line-by-line at same positions
 */
export function generateUnifiedDiff(originalCode: string, modifiedCode: string): DiffResult {
  const originalLines = originalCode.split('\n');
  const modifiedLines = modifiedCode.split('\n');
  
  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;
  
  // Use Myers diff algorithm (simplified)
  const lcs = computeLCS(originalLines, modifiedLines);
  
  let origIndex = 0;
  let modIndex = 0;
  let lcsIndex = 0;
  
  while (origIndex < originalLines.length || modIndex < modifiedLines.length) {
    // If we're at an LCS line, it's unchanged
    if (
      lcsIndex < lcs.length &&
      origIndex < originalLines.length &&
      modIndex < modifiedLines.length &&
      originalLines[origIndex] === lcs[lcsIndex] &&
      modifiedLines[modIndex] === lcs[lcsIndex]
    ) {
      lines.push({
        type: 'unchanged',
        content: originalLines[origIndex],
        lineNumber: origIndex + 1,
      });
      unchanged++;
      origIndex++;
      modIndex++;
      lcsIndex++;
    } else {
      // Collect all deletions until we hit the next LCS line
      while (
        origIndex < originalLines.length &&
        (lcsIndex >= lcs.length || originalLines[origIndex] !== lcs[lcsIndex])
      ) {
        lines.push({
          type: 'removed',
          content: originalLines[origIndex],
          lineNumber: origIndex + 1,
        });
        deletions++;
        origIndex++;
      }
      
      // Collect all additions until we hit the next LCS line
      while (
        modIndex < modifiedLines.length &&
        (lcsIndex >= lcs.length || modifiedLines[modIndex] !== lcs[lcsIndex])
      ) {
        lines.push({
          type: 'added',
          content: modifiedLines[modIndex],
          lineNumber: modIndex + 1,
        });
        additions++;
        modIndex++;
      }
    }
  }
  
  return {
    lines,
    additions,
    deletions,
    unchanged,
  };
}

/**
 * Compute Longest Common Subsequence (LCS) of two arrays
 * This is the core of the Myers diff algorithm
 */
function computeLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  
  // Create DP table
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));
  
  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;
  
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

/**
 * Generate a formatted diff string for display
 */
export function formatDiff(originalCode: string, modifiedCode: string): string {
  const diff = generateUnifiedDiff(originalCode, modifiedCode);
  
  let output = '';
  
  for (const line of diff.lines) {
    const prefix = line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  ';
    output += `${prefix}${line.content}\n`;
  }
  
  return output;
}

/**
 * Get summary statistics about the changes
 */
export function getDiffStats(originalCode: string, modifiedCode: string): {
  additions: number;
  deletions: number;
  changes: number;
} {
  const diff = generateUnifiedDiff(originalCode, modifiedCode);
  
  return {
    additions: diff.additions,
    deletions: diff.deletions,
    changes: diff.additions + diff.deletions,
  };
}

