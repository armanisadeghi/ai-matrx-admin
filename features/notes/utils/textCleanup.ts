// features/notes/utils/textCleanup.ts
// Pure text cleanup utility — no React dependencies.

/**
 * Clean up note content:
 * - Collapse multiple spaces/tabs into single space
 * - Limit consecutive blank lines to at most one
 * - Trim trailing whitespace per line
 * - Trim leading/trailing whitespace from entire content
 */
export function cleanupText(content: string): string {
  return content
    .replace(/[^\S\n]+/g, " ")       // collapse horizontal whitespace to single space
    .replace(/[ \t]+$/gm, "")        // trim trailing whitespace per line
    .replace(/\n{3,}/g, "\n\n")      // max one blank line between paragraphs
    .trim();                          // trim leading/trailing
}
