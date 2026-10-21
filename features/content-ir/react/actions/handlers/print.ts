/**
 * `print` — a shape prints through THE platform print system
 * (`@ai-matrx/print`): Markdown through `printMarkdown` (the same document,
 * styles and math the chat's Print uses), HTML sanitized with the print
 * schema and wrapped by `buildPrintDocument`. The print window opens in the
 * page (a sealed frame has no popups); when the browser blocks it the
 * document downloads as an .html file instead, and the result says so.
 *
 * Input: { title?: string, markdown: string } | { title?: string, html: string }
 * Result: { outcome: "opened" | "downloaded" }
 */

import type {
  KindActionContext,
  KindActionDefinition,
  KindActionResult,
  KindPrintRequest,
} from "../kind-action-context";

/** Largest document a shape may print. */
export const MAX_PRINT_CHARS = 2_000_000;

/** Pure: what to print, or the sentence refusing it. */
export function parsePrint(input: unknown): KindPrintRequest | { error: string } {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  const title =
    typeof obj?.title === "string" && obj.title.trim() ? obj.title.trim().slice(0, 200) : "Document";
  const markdown = obj?.markdown;
  const html = obj?.html;
  const body = typeof markdown === "string" ? markdown : typeof html === "string" ? html : null;
  if (body === null || !body.trim()) return { error: "There is nothing to print: pass `markdown` or `html`." };
  if (body.length > MAX_PRINT_CHARS) return { error: "This document is too long to print from a shape." };
  return typeof markdown === "string" ? { title, markdown } : { title, html: body };
}

async function printHandler(input: unknown, ctx: KindActionContext): Promise<KindActionResult> {
  const parsed = parsePrint(input);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  if (!ctx.printDocument) return { ok: false, error: "Printing isn't available on this page." };
  const outcome = await ctx.printDocument(parsed);
  return { ok: true, result: { outcome } };
}

export const printAction: KindActionDefinition = {
  key: "print",
  label: "Print",
  description:
    "Print a document the shape built (markdown or html) through the platform print window; downloads it as .html when the popup is blocked.",
  handler: printHandler,
};
