/**
 * Unlock demo — pure logic: which recent blocked addresses to offer, how a try is judged and tallied.
 * Contract (aidream `services/data_fetch/unlock.py`): POST /data-sources/unlock/compare → CompareAnswer.
 */

export interface BlockedUrl {
  id: string;
  url: string;
  host: string;
  reason: string;
  lastSeenAt: string;
}

export const REASON_LABELS: Record<string, string> = {
  cloudflare_block: "Cloudflare wall",
  bot_wall: "Bot wall",
  login_wall: "Login wall",
  thin_content: "Almost no text",
  empty_content: "No text",
  request_error: "Could not connect",
  bad_status: "Error page",
  wrong_resource: "Wrong page",
};

/** The reasons worth offering: a page a different door might open. Files, DRM and account scopes are not pages. */
export const OFFERED_REASONS = Object.keys(REASON_LABELS);

export const reasonLabel = (reason: string): string => REASON_LABELS[reason] ?? reason;

export function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

interface RawBlock {
  id: string;
  input_ref: string;
  error_class: string;
  last_seen_at: string;
}

/** Newest first, ONE row per host, http(s) addresses only, offered reasons only. */
export function dedupeByHost(rows: RawBlock[]): BlockedUrl[] {
  const seen = new Set<string>();
  const out: BlockedUrl[] = [];
  const sorted = [...rows].sort((a, b) => (a.last_seen_at < b.last_seen_at ? 1 : a.last_seen_at > b.last_seen_at ? -1 : 0));
  for (const r of sorted) {
    if (!OFFERED_REASONS.includes(r.error_class)) continue;
    const host = hostOf(r.input_ref);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    out.push({ id: r.id, url: r.input_ref, host, reason: r.error_class, lastSeenAt: r.last_seen_at });
  }
  return out;
}

export type Verdict = "unlocked" | "both_failed" | "ours_was_fine";

export const VERDICT_LABELS: Record<Verdict, string> = {
  unlocked: "Unlocked",
  both_failed: "Both failed",
  ours_was_fine: "Ours was fine",
};

export interface Side {
  ok: boolean;
  status: number;
  text_chars: number;
  preview: string;
  title?: string | null;
  elapsed_s: number;
  cost_usd?: number;
  points?: number;
  error_code?: string | null;
  error?: string | null;
  failure_reason?: string | null;
}

export interface Compare {
  url: string;
  ours: Side;
  unlocker: Side | null;
  verdict: Verdict;
  unlocker_skipped?: string | null;
}

const VERDICTS: Verdict[] = ["unlocked", "both_failed", "ours_was_fine"];

export function parseCompare(raw: unknown): Compare {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const verdict = VERDICTS.includes(o.verdict as Verdict) ? (o.verdict as Verdict) : "both_failed";
  const side = (v: unknown): Side | null => {
    if (!v || typeof v !== "object") return null;
    const s = v as Record<string, unknown>;
    return {
      ok: s.ok === true,
      status: Number(s.status) || 0,
      text_chars: Number(s.text_chars) || 0,
      preview: typeof s.preview === "string" ? s.preview : "",
      title: typeof s.title === "string" ? s.title : null,
      elapsed_s: Number(s.elapsed_s) || 0,
      cost_usd: Number(s.cost_usd) || 0,
      points: Number(s.points) || 0,
      error_code: typeof s.error_code === "string" ? s.error_code : null,
      error: typeof s.error === "string" ? s.error : null,
      failure_reason: typeof s.failure_reason === "string" ? s.failure_reason : null,
    };
  };
  const ours = side(o.ours) ?? { ok: false, status: 0, text_chars: 0, preview: "", elapsed_s: 0 };
  return {
    url: typeof o.url === "string" ? o.url : "",
    ours,
    unlocker: side(o.unlocker),
    verdict,
    unlocker_skipped: typeof o.unlocker_skipped === "string" ? o.unlocker_skipped : null,
  };
}

export interface Tally {
  tried: number;
  unlocked: number;
  points: number;
  usd: number;
}

export const EMPTY_TALLY: Tally = { tried: 0, unlocked: 0, points: 0, usd: 0 };

/** Fold one finished try into the running tally. */
export function addToTally(t: Tally, c: Compare): Tally {
  return {
    tried: t.tried + 1,
    unlocked: t.unlocked + (c.verdict === "unlocked" ? 1 : 0),
    points: t.points + (c.unlocker?.points ?? 0),
    usd: t.usd + (c.unlocker?.cost_usd ?? 0),
  };
}

/** First few lines of a preview, for the side-by-side cell. */
export function firstLines(text: string, n = 4): string {
  return text.split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, n).join("\n");
}

/** A pasted address, trimmed; a bare host gets https://. Null when it is not an address. */
export function normalizeUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
  return hostOf(withScheme) && withScheme.length <= 2000 ? withScheme : null;
}
