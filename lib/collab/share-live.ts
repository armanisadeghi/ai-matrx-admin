/**
 * The CURRENT content behind a share link, for the signed-out public page (`/s/[token]`).
 *
 * `resolve_share_token` (the SQL projection) returns the last SAVE. When people are co-editing the record, the room
 * is ahead of that save, so the page asks aidream for the folded room: `POST /collab/share/current`. The token is the
 * only authorization: the database validates it by the rule `resolve_share_token` uses and names the one room that
 * may be read, so no valid token means no content. A link that counts views, a record with no room, and a room with
 * nothing past its last save all keep the projection's content, unchanged.
 *
 * Nothing falls back silently: when the server cannot be reached or cannot fold, the last save is shown with a
 * plain-words notice. Thumbnails and link unfurls deliberately stay on the last save (like Google).
 */
import { AIDREAM_PRODUCTION_URL } from "@/lib/api/endpoints";
import type { ResolvedShareToken } from "@ai-matrx/sharing/core";

const KINDS = { udt_document: { room: "udt_document", children: "document_snapshot" }, workbook: { room: "workbook", children: "workbook_snapshot" } } as const;

const TOO_LARGE_BYTES = 4_000_000; // the projection's own cap (platform.share_link_children)
const TIMEOUT_MS = 8000;

const STALE_NOTICE = "This is the last saved copy: edits people are making right now could not be included.";

interface ShareCurrentResponse {
  source: "no_room" | "checkpoint" | "folded" | "stale";
  head_rev?: number | null;
  checkpoint_rev?: number | null;
  snapshot?: unknown;
}

type Children = Record<string, unknown> | null;

/** What the lens reads: `{ kind, snapshot, too_large?, notice? }`, replacing the projection's children. */
export async function liveShareChildren(
  token: string,
  resourceType: string | undefined,
  saved: Children,
  opts: { baseUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<Children> {
  const kind = resourceType && resourceType in KINDS ? KINDS[resourceType as keyof typeof KINDS] : null;
  if (!kind) return saved;
  const base = (opts.baseUrl ?? AIDREAM_PRODUCTION_URL).replace(/\/+$/, "");
  let res: Response;
  try {
    res = await (opts.fetchImpl ?? fetch)(`${base}/collab/share/current`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, kind: kind.room }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return withNotice(saved, kind.children, STALE_NOTICE);
  }
  if (res.status === 404) return saved; // this link does not open a live copy (counts views, or the server is older)
  if (!res.ok) return withNotice(saved, kind.children, STALE_NOTICE);
  const out = (await res.json()) as ShareCurrentResponse;
  if (out.source === "no_room" || out.source === "checkpoint" || out.snapshot == null) return saved;
  if (out.source === "stale") {
    const missing = Math.max(0, (out.head_rev ?? 0) - (out.checkpoint_rev ?? 0));
    return {
      ...base_(saved, kind.children),
      snapshot: out.snapshot,
      notice: `This is the last saved copy: ${missing} newer edit${missing === 1 ? "" : "s"} by people editing right now could not be included.`,
    };
  }
  if (JSON.stringify(out.snapshot).length > TOO_LARGE_BYTES) return { kind: kind.children, too_large: true };
  return { kind: kind.children, snapshot: out.snapshot };
}

const base_ = (saved: Children, kind: string): Record<string, unknown> => ({ ...(saved ?? {}), kind });

function withNotice(saved: Children, kind: string, notice: string): Children {
  return { ...base_(saved, kind), notice };
}

/** `resolveShareToken`'s result with the live content in place of the last save. */
export async function withLiveShareContent(
  token: string,
  result: ResolvedShareToken,
  opts?: Parameters<typeof liveShareChildren>[3],
): Promise<ResolvedShareToken> {
  if (!result.success) return result;
  const children = await liveShareChildren(token, result.resourceType, result.children ?? null, opts);
  return children === result.children ? result : { ...result, children };
}
