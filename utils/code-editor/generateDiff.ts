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
 * Generate a unified diff view (simple implementation)
 * For more complex needs, consider using a library like diff or diff-match-patch
 */
export function generateUnifiedDiff(originalCode: string, modifiedCode: string): DiffResult {
  const originalLines = originalCode.split('\n');
  const modifiedLines = modifiedCode.split('\n');
  
  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;
  
  // Simple line-by-line comparison
  // For production, you'd want a more sophisticated diff algorithm
  const maxLen = Math.max(originalLines.length, modifiedLines.length);
  
  for (let i = 0; i < maxLen; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];
    
    if (origLine === modLine) {
      if (origLine !== undefined) {
        lines.push({
          type: 'unchanged',
          content: origLine,
          lineNumber: i + 1,
        });
        unchanged++;
      }
    } else {
      if (origLine !== undefined) {
        lines.push({
          type: 'removed',
          content: origLine,
          lineNumber: i + 1,
        });
        deletions++;
      }
      if (modLine !== undefined) {
        lines.push({
          type: 'added',
          content: modLine,
          lineNumber: i + 1,
        });
        additions++;
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

