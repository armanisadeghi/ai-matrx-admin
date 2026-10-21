/**
 * `load_media` / `play_embed` — how a shape inside the sealed frame plays video, audio and embeds.
 *
 * The frame can reach no file host and may open no frame (`connect-src 'none'`, no `frame-src`), so
 * `KindVideo` / `KindAudio` / `KindEmbed` ask the page:
 *
 *  - `load_media { file_id }`  the host fetches the saved file's bytes with the person's own
 *    authorization and returns the Blob (structured-clone over the port). The frame plays it from a
 *    `blob:` URL (`media-src blob:`). Only on Play, never at render, so a large file costs nothing until asked.
 *    Result: { blob: Blob; mime_type: string | null }
 *  - `play_embed { url, title? }`  the host opens the platform's browser-frame window on a provider embed
 *    address (YouTube, Vimeo, Loom, Google Maps, Figma) or a direct media address. http(s) only.
 *    Result: { opened: true; url: string }
 */

import type {
  KindActionContext,
  KindActionDefinition,
  KindActionResult,
} from "../kind-action-context";
import { parseEmbed } from "@ai-matrx/content-ir/kind-kit";

/** A file this large is opened in the file viewer instead of being held in memory by the frame. */
export const MAX_FRAME_MEDIA_BYTES = 250 * 1024 * 1024;

async function loadMediaHandler(input: unknown, ctx: KindActionContext): Promise<KindActionResult> {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  const fileId = typeof obj?.file_id === "string" ? obj.file_id.trim() : "";
  if (!fileId) return { ok: false, error: "This needs a saved file." };
  if (!ctx.loadMedia) return { ok: false, error: "This page can't play saved files here." };
  const organizationId = typeof obj?.organization_id === "string" && obj.organization_id ? obj.organization_id : null;
  try {
    const loaded = await ctx.loadMedia(fileId, organizationId);
    if (loaded.blob.size > MAX_FRAME_MEDIA_BYTES) {
      return { ok: false, error: "This file is too large to play here. Use Expand to open it." };
    }
    return { ok: true, result: { blob: loaded.blob, mime_type: loaded.mime_type ?? loaded.blob.type ?? null } };
  } catch {
    return { ok: false, error: "This file couldn't be loaded." };
  }
}

/** Pure: what `play_embed` may open. A provider link opens its embed; any other http(s) address opens as given. */
export function parsePlayEmbed(input: unknown): { url: string; title: string } | { error: string } {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  const raw = typeof obj?.url === "string" ? obj.url.trim() : "";
  if (!raw) return { error: "This link has no address to play." };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { error: "This link is not a valid address, so it was not opened." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { error: "Only web links can be played." };
  }
  const embed = parseEmbed(raw);
  const title = typeof obj?.title === "string" && obj.title.trim() ? obj.title.trim().slice(0, 120) : embed.label;
  return { url: embed.embedUrl ?? parsed.href, title };
}

async function playEmbedHandler(input: unknown, ctx: KindActionContext): Promise<KindActionResult> {
  const parsed = parsePlayEmbed(input);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  if (!ctx.playEmbed) return { ok: false, error: "This page can't open a player here." };
  ctx.playEmbed(parsed.url, parsed.title);
  return { ok: true, result: { opened: true, url: parsed.url } };
}

export const loadMediaAction: KindActionDefinition = {
  key: "load_media",
  label: "Load media",
  description: "Fetch a saved video or audio file's bytes (by file_id) so the sealed frame can play it from a blob: URL.",
  handler: loadMediaHandler,
};

export const playEmbedAction: KindActionDefinition = {
  key: "play_embed",
  label: "Play embed",
  description: "Open a provider embed (YouTube, Vimeo, Loom, Google Maps, Figma) or a media address in a player window.",
  handler: playEmbedHandler,
};
