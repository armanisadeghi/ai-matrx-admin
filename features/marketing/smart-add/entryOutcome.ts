/**
 * Every Smart Add entry ends in an honest answer (Arman, 2026-10-14: a missing Instagram handle spun forever, then
 * opened a findings page built from nothing). Pure, so the whole state machine is tested without a screen.
 *
 * - `validateEntry` stops obviously bad input before a paid run (inline, never a run).
 * - `parseEntryOutcome` reads the server's answer (aidream services/brand_intake/entry_outcome.py, on the capture
 *   points' `entry_outcome`); `inferEntryOutcome` reads the same answer off the step notes when a server without it
 *   finished the run.
 * - `entryCopy` is the stage's words for each answer (two short lines, the next actions).
 * - `stagePhase` is the stage's state machine: entering, identifying, still working (quiet too long), the answer.
 */
import { SOCIAL_PLATFORM_LABELS, isSocialPlatform, type SocialPlatform } from "@/features/marketing/social/types";
import type { RoundView } from "./SmartAddRound";

export type EntryStatus =
  | "confirmed"
  | "not_typed"
  | "not_found"
  | "private"
  | "empty"
  | "unsupported"
  | "usage_limit"
  | "provider_failed"
  | "no_such_site"
  | "timed_out"
  | "blocked"
  | "site_error"
  | "parked";

export interface EntryOutcome {
  status: EntryStatus;
  subject: "account" | "website";
  /** What was typed (the account's address or the website). */
  input: string;
  platform: string | null;
}

const FAILED: readonly EntryStatus[] = [
  "not_found",
  "private",
  "empty",
  "unsupported",
  "usage_limit",
  "provider_failed",
  "no_such_site",
  "timed_out",
  "blocked",
  "site_error",
  "parked",
];

export function isFailedEntry(o: EntryOutcome | null | undefined): o is EntryOutcome {
  return Boolean(o && FAILED.includes(o.status));
}

export function parseEntryOutcome(raw: unknown): EntryOutcome | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const status = r.status as EntryStatus;
  if (!FAILED.includes(status) && status !== "confirmed" && status !== "not_typed") return null;
  return {
    status,
    subject: r.subject === "website" ? "website" : "account",
    input: typeof r.input === "string" ? r.input : "",
    platform: typeof r.platform === "string" ? r.platform : null,
  };
}

/** The socials step's note for a lookup that failed, by the provider's own sentence. */
const SOCIAL_NOTE: [RegExp, EntryStatus][] = [
  [/couldn't find that account|not found|does not exist/i, "not_found"],
  [/private|forbidden/i, "private"],
  [/no posts|empty/i, "empty"],
  [/points|allowance|limit/i, "usage_limit"],
];
const SITE_NOTE: [RegExp, EntryStatus][] = [
  [/nodename|name or service|resolve|getaddrinfo|does not exist/i, "no_such_site"],
  [/timed? ?out|timeout/i, "timed_out"],
  [/answered (401|403|429|451)/i, "blocked"],
  [/answered \d{3}|not a web page/i, "site_error"],
  [/parked|for-sale/i, "parked"],
];

/**
 * The answer read off a FINISHED round's step notes (a server that does not send `entry_outcome` yet), only when the
 * round found nothing at all AND a step said so in words. "Doesn't exist" needs a POSITIVE signal: an empty, partial
 * or unreadable replay (admin opening someone's run, lost events) is never not-found — `replayUnreadable` covers it.
 * Null when the round is still running, found something, or no note names the failure.
 */
export function inferEntryOutcome(
  view: Pick<RoundView, "status" | "steps"> | null | undefined,
  typed: { website: string; social: string; platform: string | null },
  foundSomething: boolean,
): EntryOutcome | null {
  if (!view || foundSomething || !["completed", "failed", "errored"].includes(view.status ?? "")) return null;
  if (!typed.website && !typed.social) return null;
  const notes = (step: string) => view.steps.filter((s) => s.step === step).flatMap((s) => s.notes);
  if (typed.social) {
    const note = notes("socials").join(" ");
    const hit = /could not be looked up/i.test(note) ? SOCIAL_NOTE.find(([re]) => re.test(note)) : undefined;
    return hit ? { status: hit[1], subject: "account", input: typed.social, platform: typed.platform } : null;
  }
  const note = [...notes("probe"), ...notes("page"), ...notes("web")].join(" ");
  const hit = SITE_NOTE.find(([re]) => re.test(note));
  return hit ? { status: hit[1], subject: "website", input: typed.website, platform: null } : null;
}

/**
 * The run could not be read back: the attach read was refused, or a FINISHED run came back with no step data at all
 * (every step idle, no notes) and nothing found. Shown as "Couldn't load this run" with a retry — never as an answer
 * about what was typed.
 */
export function replayUnreadable(
  view: Pick<RoundView, "status" | "steps" | "readFailure"> | null | undefined,
  foundSomething: boolean,
): boolean {
  if (!view || foundSomething) return false;
  if (view.readFailure) return true;
  if (!["completed", "failed", "errored", "cancelled", "stopped", "refused"].includes(view.status ?? "")) return false;
  return view.steps.every((s) => s.phase === "idle" && !s.notes.length);
}

/** How the typed entry reads in a sentence: "@name" for an account, the bare host for a site. */
export function entryLabel(o: Pick<EntryOutcome, "subject" | "input">): string {
  const text = o.input.trim();
  if (o.subject === "website") return text.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
  const fromUrl = text.match(/^https?:\/\/[^/]+\/(?:@)?([^/?#]+)/i)?.[1];
  const handle = (fromUrl ?? text).replace(/^@/, "");
  return handle ? `@${handle}` : text;
}

function platformLabel(platform: string): string {
  return isSocialPlatform(platform) ? SOCIAL_PLATFORM_LABELS[platform] : platform;
}

export interface EntryCopy {
  title: string;
  line: string;
  /** "Try again" makes sense (the same input may work in a moment). */
  retry: boolean;
}

export function entryCopy(o: EntryOutcome): EntryCopy {
  const who = entryLabel(o);
  const on = o.platform ? ` on ${platformLabel(o.platform)}` : "";
  switch (o.status) {
    case "not_found":
      return { title: "No account found", line: `${who}${on} doesn't exist.`, retry: false };
    case "private":
      return { title: "That account is private", line: `We can't read ${who}${on}.`, retry: false };
    case "empty":
      return { title: "That account is empty", line: `${who}${on} has no posts.`, retry: false };
    case "unsupported":
      return { title: "Can't look that up", line: `We can't read ${platformLabel(o.platform ?? "")} accounts yet.`, retry: false };
    case "usage_limit":
      return { title: "Out of points", line: "Nothing was charged.", retry: false };
    case "provider_failed":
      return { title: "The lookup failed", line: "Our lookup service had a problem.", retry: true };
    case "no_such_site":
      return { title: "No website there", line: `${who} doesn't exist.`, retry: false };
    case "timed_out":
      return { title: "The site didn't answer", line: `${who} took too long.`, retry: true };
    case "blocked":
      return { title: "The site blocked us", line: `${who} refused our visit.`, retry: true };
    case "site_error":
      return { title: "The site has a problem", line: `${who} answered with an error.`, retry: true };
    case "parked":
      return { title: "That domain is parked", line: `${who} is for sale, not a brand site.`, retry: false };
    default:
      return { title: "Nothing found", line: `${who} returned nothing.`, retry: true };
  }
}

// ── up-front checks: never a paid run on something that cannot exist ─────────

/** Each platform's handle rule, where the platform has one (an account address passes through untouched). */
const HANDLE_RULES: Partial<Record<SocialPlatform, { re: RegExp; max: number; chars: string }>> = {
  instagram: { re: /^[a-z0-9._]+$/i, max: 30, chars: "letters, numbers, . and _" },
  threads: { re: /^[a-z0-9._]+$/i, max: 30, chars: "letters, numbers, . and _" },
  tiktok: { re: /^[a-z0-9._]+$/i, max: 24, chars: "letters, numbers, . and _" },
  x: { re: /^[a-z0-9_]+$/i, max: 15, chars: "letters, numbers and _" },
  youtube: { re: /^[a-z0-9._-]+$/i, max: 30, chars: "letters, numbers, . - and _" },
};

/** A problem with a typed handle for one platform, or null. */
export function handleProblem(platform: SocialPlatform | null, handle: string): string | null {
  const rule = platform ? HANDLE_RULES[platform] : undefined;
  const h = handle.trim().replace(/^@/, "");
  if (!rule || !h) return null;
  const name = platformLabel(platform ?? "");
  if (!rule.re.test(h)) return `${name} handles use only ${rule.chars}.`;
  if (h.length > rule.max) return `${name} handles are ${rule.max} characters at most.`;
  if (/^\.|\.$|\.\./.test(h) && (platform === "instagram" || platform === "threads")) return `${name} handles can't start, end or repeat a dot.`;
  return null;
}

const HOST_LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;

/** A problem with a typed website, or null. Only what is sure: a host that cannot be an address. */
export function websiteProblem(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (/\s/.test(t)) return "A web address has no spaces.";
  let host = t.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(host) && !/^[^/]+:\d+/.test(host)) return "That isn't a web address.";
  host = host.replace(/[/?#].*$/, "").replace(/:\d+$/, "").replace(/^www\./i, "");
  if (host.includes("@")) return "That looks like an email, not a website.";
  const labels = host.split(".");
  if (labels.length < 2 || labels.some((l) => !l)) return "Add the ending, like .com.";
  if (!labels.every((l) => HOST_LABEL.test(l))) return "Use only letters, numbers and dashes.";
  if (!/^[a-z]{2,63}$/i.test(labels[labels.length - 1]) && !/^xn--/i.test(labels[labels.length - 1])) return "That ending isn't a real one.";
  return null;
}

// ── the stage's state machine ────────────────────────────────────────────────

export type StagePhase = "enter" | "identifying" | "slow" | "outcome" | "unloaded" | "failed" | "nothing" | "done";

export interface StageInputs {
  submitted: boolean;
  /** The typed entry's answer (server or inferred). */
  outcome: EntryOutcome | null;
  /** The run could not be read back (`replayUnreadable`). */
  unreadable?: boolean;
  /** A round still running. */
  working: boolean;
  /** A round broke (a start error, a failed run, an errored step). */
  failed: boolean;
  /** Something real was found. */
  found: boolean;
  /** Ms since the last new step event while working. */
  quietMs: number;
  /** The quiet-time knob, ms. */
  stallMs: number;
}

/**
 * What the stage shows. The order is the honesty rule: a failed entry wins over everything (it never morphs into a
 * findings page); a quiet run says so; a broken run says so; a run that finished with nothing says so.
 */
export function stagePhase(s: StageInputs): StagePhase {
  if (!s.submitted) return "enter";
  if (isFailedEntry(s.outcome)) return "outcome";
  if (s.unreadable) return "unloaded";
  if (s.working) return s.quietMs >= s.stallMs ? "slow" : "identifying";
  if (s.found) return "done";
  if (s.failed) return "failed";
  return "nothing";
}

/** The quiet-time knob (`marketing.smart_add_quiet_seconds`) as ms; the starting value when unset or nonsense. */
export const SMART_ADD_QUIET_DEFAULT_S = 40;
export function quietMs(knob: unknown): number {
  const n = Number(knob);
  return (Number.isFinite(n) && n >= 5 ? n : SMART_ADD_QUIET_DEFAULT_S) * 1000;
}
