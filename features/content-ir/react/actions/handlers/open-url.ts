/**
 * `open_url` — a shape (inside the sealed frame, or in the page) opens a link.
 *
 * The frame has no `allow-popups` and no top navigation, so a plain anchor is
 * dead there. The frame runtime relays every anchor click here (so authors
 * just write `<a href>`), and any component may call it directly.
 *
 * Input: { url: string }
 *   http(s), mailto and tel open in a new tab/window with `noopener`;
 *   a relative path opens that page of the app in a new tab.
 *   Everything else (`javascript:`, `data:`, `blob:`, …) is refused with a sentence.
 * Result: { opened: true, url: string }
 */

import type {
  KindActionContext,
  KindActionDefinition,
  KindActionResult,
} from "../kind-action-context";

const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

/** Whitespace and C0/C1 control characters — how `java\nscript:` hides. */
const CONTROL_CHARS = /[\u0000- \u007f-\u009f]/g;

export type OpenUrlParse = { url: string } | { error: string };

/** Pure: decide what a link may open. `base` is the app origin for relative paths. */
export function parseOpenUrl(input: unknown, base: string): OpenUrlParse {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>).url : undefined;
  if (typeof raw !== "string" || !raw.trim()) return { error: "This link has no address to open." };
  const cleaned = raw.trim().replace(CONTROL_CHARS, "");
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(cleaned);
  if (scheme && !ALLOWED_PROTOCOLS.includes(`${scheme[1].toLowerCase()}:`)) {
    return {
      error: `Links that start with "${scheme[1].toLowerCase()}:" are not opened. Only web, email and phone links open from a shape.`,
    };
  }
  if (scheme) return { url: raw.trim() };
  if (cleaned.startsWith("//")) return { error: "This link has no clear address, so it was not opened." };
  try {
    // A relative path is an in-app path: resolve it against the app origin.
    const resolved = new URL(raw.trim(), base);
    return { url: resolved.toString() };
  } catch {
    return { error: "This link is not a valid address, so it was not opened." };
  }
}

async function openUrlHandler(input: unknown, ctx: KindActionContext): Promise<KindActionResult> {
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const parsed = parseOpenUrl(input, base);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  ctx.openUrl(parsed.url);
  return { ok: true, result: { opened: true, url: parsed.url } };
}

export const openUrlAction: KindActionDefinition = {
  key: "open_url",
  label: "Open link",
  description:
    "Open a web, email or phone link (or an app path) in a new tab. Refuses javascript: and data: links.",
  handler: openUrlHandler,
};
