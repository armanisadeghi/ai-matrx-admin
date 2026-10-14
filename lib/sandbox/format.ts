import type {
  SandboxInstanceRow,
  SandboxInstanceDecorations,
} from "@/types/sandbox";
import { isJsonObject } from "@/types/json";

/** PostgreSQL permits infinity timestamps; JavaScript Date does not. */
export function formatSandboxTimestamp(value: string | null): string {
  if (!value) return "—";
  if (value === "infinity") return "No expiry";
  if (value === "-infinity") return "Unbounded past";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid timestamp"
    : date.toLocaleString();
}

/**
 * ONE IDENTITY FOR A BOX, EVERYWHERE.
 *
 * Two defects lived in what this replaced (owner, seen live 2026-09-13):
 *
 *  1. The SAME box was labelled `Unnamed · 7942bd` in one place and
 *     `Sandbox · 2c23df07` in another, because the two formatters sliced two
 *     DIFFERENT identifiers — the orchestrator id (`sandbox_id`, last 6) and
 *     the Postgres row uuid (`id`, first 8). Nothing on screen told the user
 *     those were one box. The short id now ALWAYS comes from the row uuid,
 *     which is the id every surface already holds (a canvas pointer, a
 *     binding, a route param) — before the row is even fetched — so the
 *     suffix is identical whether the row has loaded or not.
 *
 *  2. `Unnamed` is not a name. An unnamed box now gets a DERIVED one that
 *     says what it actually is: `Bare hosted 5515aa` — template, tier, short
 *     id, written as a name (Arman, 2026-10-14: capitalised, no `·` runs).
 *     Whatever is unknown is left out; the short id is never left out here,
 *     because it is the part that identifies. A LIST that shows many boxes at
 *     once may number repeats instead and put the id on hover (the composer's
 *     Environment menu does).
 *
 * Never re-derive a box label anywhere else. Call this.
 */
export interface SandboxNameParts {
  name?: string | null;
  /** `sandbox_instances.id` — the canonical identity. */
  id?: string | null;
  /** Orchestrator id. Only a fallback for rows read without `id`. */
  sandbox_id?: string | null;
  tier?: string | null;
  template?: string | null;
  /**
   * The raw `config` JSONB column. It arrives as bare `unknown` (this repo
   * patches the generated `Json` alias), so it is narrowed at READ time by
   * `configString` below — never declared as an already-shaped object, which
   * would force every caller to cast a row it read honestly.
   */
  config?: unknown;
}

/** One string leaf out of the open `config` JSON, or null if it isn't one. */
function configString(config: unknown, key: "tier" | "template"): string | null {
  if (!isJsonObject(config)) return null;
  const value = config[key];
  return typeof value === "string" ? value : null;
}

/** How many characters of the row uuid identify a box on screen. */
const SHORT_ID_LENGTH = 6;

/**
 * The short id shown to the user. Row uuid first; the orchestrator id only
 * when a caller genuinely has no row id (it is sliced from the END there,
 * because `sbx-` prefixes make the front of that value non-identifying).
 */
export function sandboxShortId(parts: SandboxNameParts): string {
  const rowId = parts.id?.trim();
  if (rowId) return rowId.replace(/-/g, "").slice(0, SHORT_ID_LENGTH);
  const orchestratorId = parts.sandbox_id?.trim();
  if (orchestratorId) return orchestratorId.slice(-SHORT_ID_LENGTH);
  return "unknown";
}

/** How a tier reads inside a name. */
const TIER_IN_NAME: Record<string, string> = { hosted: "hosted", ec2: "EC2" };

/**
 * The name an unnamed box earns from what it IS: `Bare hosted 5515aa` —
 * template, tier, short id. Unknown parts drop out; the short id never does.
 */
export function sandboxDerivedName(parts: SandboxNameParts): string {
  const template = (parts.template ?? configString(parts.config, "template"))?.trim() || null;
  const tierRaw = (parts.tier ?? configString(parts.config, "tier"))?.trim() || null;
  const tier = tierRaw ? (TIER_IN_NAME[tierRaw.toLowerCase()] ?? tierRaw) : null;
  // With neither template nor tier known (a pointer with only a row id), say
  // what the thing is rather than emitting a bare hex fragment.
  const words = [template, tier].filter(Boolean) as string[];
  const head = words.length > 0 ? words.join(" ") : "Sandbox";
  return `${head.charAt(0).toUpperCase()}${head.slice(1)} ${sandboxShortId(parts)}`;
}

/** The editable label if the user set one; otherwise the derived name. */
export function sandboxDisplayName(parts: SandboxNameParts): string {
  return parts.name?.trim() || sandboxDerivedName(parts);
}

/** A derived name's identifying tail: the six-character short id at its end. */
const SHORT_ID_TAIL = /^(.*\s)([0-9a-f]{6})$/;

/**
 * Split a label into the part that may be clipped and the part that must not.
 *
 * A derived name ends in the short id, and CSS `truncate` clips the END — so a
 * chip with `max-w` turned `Bare hosted 5515aa` into `Bare hoste…`, hiding the
 * only characters that say WHICH box. Render `head` in the truncating span and
 * `tail` in a `shrink-0` one and the identity always survives.
 *
 * A label that does not end in a short id (a user-chosen name) is all head:
 * there is no identifying tail to protect, and clipping a long name is fine.
 */
export function splitIdentifyingName(label: string): {
  head: string;
  tail: string;
} {
  const match = SHORT_ID_TAIL.exec(label);
  if (!match) return { head: label, tail: "" };
  return { head: match[1], tail: match[2] };
}

/**
 * Human-readable, multi-line summary of a single sandbox instance — the
 * "Copy" (human) flavor shared by every sandbox surface (admin table, user
 * list, detail page). The agent flavor dumps the full row as JSON via
 * `buildAgentPayload`, so this only needs to cover the fields a human scans.
 */
export function sandboxInstanceSummary(
  i: SandboxInstanceRow & Partial<SandboxInstanceDecorations>,
): string {
  const ttlH = Math.floor(i.ttl_seconds / 3600);
  const ttlM = Math.floor((i.ttl_seconds % 3600) / 60);
  return [
    `Sandbox: ${sandboxDisplayName(i)}`,
    `Sandbox ID: ${i.sandbox_id}`,
    `Status: ${i.status}`,
    `Tier: ${i.tier ?? "—"}`,
    `User ID: ${i.user_id}`,
    `Instance ID: ${i.id}`,
    i.container_id ? `Container ID: ${i.container_id}` : null,
    i.proxy_url ? `Proxy URL: ${i.proxy_url}` : null,
    `Created: ${formatSandboxTimestamp(i.created_at)}`,
    `Expires: ${formatSandboxTimestamp(i.expires_at)}`,
    `TTL: ${i.ttl_seconds}s (${ttlH}h ${ttlM}m)`,
    `Hot Path: ${i.hot_path ?? "—"}`,
    `Cold Path: ${i.cold_path ?? "—"}`,
    i.last_heartbeat_at
      ? `Last Heartbeat: ${formatSandboxTimestamp(i.last_heartbeat_at)}`
      : null,
    i.stop_reason ? `Stop Reason: ${i.stop_reason}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
