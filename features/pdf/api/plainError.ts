/**
 * features/pdf/api/plainError.ts — every PDF tool error reaches a person in plain words, never as endpoint text
 * ("POST cropPages → 422: Invalid request..."). ONE home, pure: `client.ts` (`pdfErrorFromResponse`), the
 * workspace host's compress and the stream drain all speak through it. The technical line (verb, endpoint, status,
 * the server's own detail) stays on the Error as `technical` for logs and the debug view; `message` is for people.
 */

/** What the person was doing, by endpoint key, as a verb phrase after "could not". */
const ACTION_BY_ENDPOINT: Record<string, string> = {
  rotatePages: "rotate those pages",
  deletePages: "delete those pages",
  reorderPages: "reorder the pages",
  extractPages: "extract those pages",
  split: "split the file",
  cropPages: "crop those pages",
  redactPattern: "redact those matches",
  redactPatterns: "redact those matches",
  redactRegions: "redact those regions",
  compress: "compress the file",
  merge: "merge the files",
  insertPages: "insert those pages",
  renderAll: "make the page images",
  extractTextRemote: "read the text",
  extractText: "read the text",
  extractTables: "read the tables",
  stripRepeatedRegions: "strip the repeated headers and footers",
  cleanContent: "clean the text with AI",
  fullPipeline: "run the full pipeline",
  duplicatePages: "duplicate those pages",
  scrub: "scrub the file",
  stripMetadata: "strip the file info",
  flattenAnnotations: "flatten the notes",
  classifyPages: "classify the pages",
  detectRepeatedRegions: "find the repeated regions",
  redactRepeatedRegions: "redact the repeated regions",
};

export interface PlainPdfErrorInput {
  /** "POST cropPages", "GET redactPatterns", or just the endpoint key. */
  label?: string;
  status?: number;
  /** The server's own words, when it sent any. */
  detail?: string;
}

/** The endpoint key inside a label ("POST cropPages (expected binary)" -> "cropPages"). */
export function endpointKeyOf(label: string | undefined): string | null {
  const m = /^(?:(?:POST|GET|PUT|PATCH|DELETE)\s+)?([A-Za-z][A-Za-z0-9_]*)/.exec((label ?? "").trim());
  return m ? m[1] : null;
}

/** True when the server's detail reads as a sentence a person could act on (not a code, a path or a stack). */
function readableDetail(detail: string | undefined): detail is string {
  if (!detail) return false;
  const d = detail.trim();
  if (d.length < 8 || d.length > 240) return false;
  if (/^(invalid request|unprocessable|bad request|internal server error|error)\b/i.test(d)) return false;
  if (/(traceback|exception|\bat \S+:\d+|\/[\w.-]+\/[\w.-]+|[a-z]+_[a-z_]+\b.*\bnot\b|mediabox|cropbox|pydantic|validation error)/i.test(d)) return false;
  return /\s/.test(d);
}

/** The sentence a person reads. */
export function plainPdfMessage({ label, status, detail }: PlainPdfErrorInput): string {
  const key = endpointKeyOf(label);
  const verb = (key && ACTION_BY_ENDPOINT[key]) || "do that";
  if (status === 401) return "You were signed out. Sign in again and try once more.";
  if (status === 403) return "You do not have access to this file.";
  if (status === 404) return "That file could not be found. It may have been moved or deleted.";
  if (status === 413) return `That file is too large to ${verb}.`;
  if (status === 429) return "Too many requests at once. Wait a moment and try again.";
  if (status !== undefined && status >= 500) return `The server could not ${verb} just now. Try again in a moment.`;
  if (readableDetail(detail)) return `Could not ${verb}. ${/[.!?]$/.test(detail.trim()) ? detail.trim() : `${detail.trim()}.`}`;
  return `Could not ${verb} with these settings. Check them and try again.`;
}

export interface PlainPdfError extends Error {
  status?: number;
  /** Verb, endpoint, status and the server's detail, for logs and the debug view. */
  technical: string;
}

export function plainPdfError(input: PlainPdfErrorInput): PlainPdfError {
  const err = new Error(plainPdfMessage(input)) as PlainPdfError;
  err.status = input.status;
  err.technical = `${input.label ?? "request"}${input.status !== undefined ? ` → ${input.status}` : ""}${input.detail ? `: ${input.detail.slice(0, 2000)}` : ""}`;
  return err;
}
