// features/agents/orchestras/memberContext.ts
//
// The connection setting of one Orchestra member — what context it receives from its Conductor
// (context passthrough). Stored on the member edge as the typed payload `orchestra_member`
// (field `context`, plus a `version` the save door compare-and-swaps). An edge with no payload
// is the default: Handed over, nothing always sent, person and organization on.
//
// Server twin + strict parse: aidream services/orchestras/member_context.py. Contract:
// common-docs projects/intelligence-overhaul/facts/ORCHESTRA.md § Context passthrough.

import type { Json } from "@/types/database.types";

export const ORCHESTRA_MEMBER_PAYLOAD_KIND = "orchestra_member";

export const MEMBER_CONTEXT_MODES = ["closed", "handed_over", "mirror"] as const;
export type MemberContextMode = (typeof MEMBER_CONTEXT_MODES)[number];

export const MEMBER_CONTEXT_MODE_LABEL: Record<MemberContextMode, string> = {
  closed: "Closed",
  handed_over: "Handed over",
  mirror: "Mirror",
};

/** One-sentence tooltip per mode (InfoHint; never inline prose). */
export const MEMBER_CONTEXT_MODE_HINT: Record<MemberContextMode, string> = {
  closed: "No values arrive as context. The Conductor can still fill its fields or message.",
  handed_over: "Gets what it declares, the always-send list, and what the Conductor hands over.",
  mirror: "Gets every value the Conductor holds except the list and the Conductor's own resources.",
};

export interface MemberContext {
  mode: MemberContextMode;
  /** Handed over only: sent every call. Value names, group keys or headings. */
  alwaysSend: string[];
  /** Mirror only: never mirrored. */
  allExcept: string[];
  /** Optional per-value inline limit (characters; 0 = always a pointer). */
  limits: Record<string, number>;
  /** The person, the clock and the organization statement, rebuilt for the member. */
  personAndOrg: boolean;
}

export const DEFAULT_MEMBER_CONTEXT: MemberContext = {
  mode: "handed_over",
  alwaysSend: [],
  allExcept: [],
  limits: {},
  personAndOrg: true,
};

/** A value name, group key or heading: no whitespace, no comma (the server's pattern). */
export const VALUE_REF_PATTERN = /^[^\s,]{1,200}$/;

/** The headings every value is grouped under (server `HEADING_*`). */
export const VALUE_HEADINGS = ["page", "attached", "ai_matrx"] as const;
export const PERSON_AND_ORG_GROUP = "person_and_organization";

export interface ParsedMemberContext {
  context: MemberContext;
  /** The payload version the save names (0 = no payload yet). */
  version: number;
  /** Set when the stored payload cannot be read — the server refuses to run it too. */
  error: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function stringList(v: unknown): string[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every((s) => typeof s === "string" && VALUE_REF_PATTERN.test(s))) return null;
  return v as string[];
}

/** Strict, like the server: a payload that is not exactly the setting is an error, never a default. */
export function parseMemberContext(payloadKind: string | null | undefined, payload: unknown): ParsedMemberContext {
  if (payloadKind == null && payload == null) {
    return { context: DEFAULT_MEMBER_CONTEXT, version: 0, error: null };
  }
  const bad = (why: string): ParsedMemberContext => ({ context: DEFAULT_MEMBER_CONTEXT, version: 0, error: why });
  if (payloadKind !== ORCHESTRA_MEMBER_PAYLOAD_KIND || !isRecord(payload)) return bad("Unreadable setting");
  const version = payload.version;
  const raw = payload.context;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || !isRecord(raw)) {
    return bad("Unreadable setting");
  }
  const mode = raw.mode ?? "handed_over";
  if (!MEMBER_CONTEXT_MODES.includes(mode as MemberContextMode)) return bad("Unknown mode");
  const alwaysSend = stringList(raw.always_send);
  const allExcept = stringList(raw.all_except);
  if (!alwaysSend || !allExcept) return bad("Unreadable list");
  if (alwaysSend.length && mode !== "handed_over") return bad("List does not match the mode");
  if (allExcept.length && mode !== "mirror") return bad("List does not match the mode");
  const limits: Record<string, number> = {};
  if (raw.limits !== undefined) {
    if (!isRecord(raw.limits)) return bad("Unreadable limits");
    for (const [k, n] of Object.entries(raw.limits)) {
      if (!VALUE_REF_PATTERN.test(k) || typeof n !== "number" || !Number.isInteger(n) || n < 0) {
        return bad("Unreadable limits");
      }
      limits[k] = n;
    }
  }
  const personAndOrg = raw.person_and_org === undefined ? true : raw.person_and_org;
  if (typeof personAndOrg !== "boolean") return bad("Unreadable switch");
  return {
    context: { mode: mode as MemberContextMode, alwaysSend, allExcept, limits, personAndOrg },
    version,
    error: null,
  };
}

/** The wire `context` field exactly as the save door stores it (only the mode's own list). */
export function memberContextToWire(ctx: MemberContext): Json {
  return {
    mode: ctx.mode,
    ...(ctx.mode === "handed_over" && ctx.alwaysSend.length ? { always_send: ctx.alwaysSend } : {}),
    ...(ctx.mode === "mirror" && ctx.allExcept.length ? { all_except: ctx.allExcept } : {}),
    ...(Object.keys(ctx.limits).length ? { limits: ctx.limits } : {}),
    person_and_org: ctx.personAndOrg,
  };
}

/** Switching mode keeps only what the new mode can hold (a list belongs to one mode). */
export function withMode(ctx: MemberContext, mode: MemberContextMode): MemberContext {
  return {
    ...ctx,
    mode,
    alwaysSend: mode === "handed_over" ? ctx.alwaysSend : [],
    allExcept: mode === "mirror" ? ctx.allExcept : [],
  };
}
