/**
 * Pure rules for the /work Live hub: a session's presence and a room member's
 * delivery lag. Presence mirrors the server's `effective_presence`
 * (aidream/services/agent_messaging/envelope.py) so the hub and the
 * `agent_messages` tool's `who` never disagree about a session.
 */

export type LivePresence = "busy" | "idle" | "ended";

export const AGENT_ROOM_KINDS = [
  "agent_direct",
  "agent_pair",
  "agent_room",
  "agent_review",
] as const;
export type AgentRoomKind = (typeof AGENT_ROOM_KINDS)[number];

export function agentRoomKind(metadata: unknown): AgentRoomKind | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const kind = (metadata as Record<string, unknown>).kind;
  return AGENT_ROOM_KINDS.find((k) => k === kind) ?? null;
}

/**
 * A `busy` row with no event for this long reads as idle: a turn that died
 * without its Stop hook (killed process, closed laptop) must not stay green.
 * Same window the transcript's live indicator uses (LIVE_SESSION_WINDOW_MS).
 */
export const BUSY_STALE_MS = 5 * 60 * 1000;

/** The ONE presence the hub shows, everywhere it shows one. */
export function effectivePresence(
  status: string | null,
  lastSeenAt: string | null,
  nowMs: number,
  endedAfterMs: number,
): LivePresence {
  if (status === "ended" || status === "archived" || !lastSeenAt) return "ended";
  const seen = Date.parse(lastSeenAt);
  if (Number.isNaN(seen) || nowMs - seen > endedAfterMs) return "ended";
  return status === "busy" && nowMs - seen <= BUSY_STALE_MS ? "busy" : "idle";
}

/**
 * A session title as a person reads it: provider titles are often a first
 * prompt carrying raw markup (`<task-notification>…`) — tags go, whitespace
 * collapses.
 */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/<\/?[A-Za-z][\w:-]*(?:\s[^<>]*)?>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The longest session label, matching the server's agent-mail rule
 * (`agent_messaging.service._short` + `session_label`) the phone shows. */
export const SESSION_LABEL_MAX = 60;

/**
 * A session's short label: its cleaned title on one line, cut at
 * {@link SESSION_LABEL_MAX} with an ellipsis, plus `(workspace)` when known.
 * A title is often the session's whole first prompt; a recipient list must
 * never show that.
 */
export function shortSessionLabel(title: string, workspace?: string | null): string {
  const flat = cleanTitle(title) || "Session";
  const short =
    flat.length <= SESSION_LABEL_MAX ? flat : `${flat.slice(0, SESSION_LABEL_MAX - 1).trimEnd()}…`;
  return workspace?.trim() ? `${short} (${workspace.trim()})` : short;
}

/** A one-line preview: markdown markers, links and headings flattened to text. */
export function plainPreview(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~|`)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MemberCursor {
  offered_through: string | null;
  offered_at: string | null;
  delivered_through: string | null;
  delivered_at: string | null;
  lookup_failures: number;
  expired_count: number;
  last_failure_reason: string | null;
  last_failure_at: string | null;
  muted: boolean;
}

/**
 * The server cloud courier's member-row reason when no connected Claude account
 * owns a cloud session (`aidream agent_messaging/cloud_courier.py` NEEDS_ACCOUNT).
 */
export const NEEDS_CLAUDE_ACCOUNT = "Connect the Claude account that owns this session";

export function needsClaudeAccount(lag: DeliveryLag): boolean {
  return lag.state === "failing" && (lag.reason ?? "").startsWith(NEEDS_CLAUDE_ACCOUNT);
}

export type DeliveryLag =
  | { state: "clear" }
  | { state: "offered"; sinceMs: number }
  | { state: "failing"; failures: number; expired: number; reason: string | null }
  | { state: "muted" };

/**
 * Offered-but-unconfirmed is normal for a moment (the next hook confirms it);
 * it becomes a marker after `graceMs`. Failures and expiries are lifetime
 * counters, so they mark the member only while the latest failure is newer
 * than the latest confirmed delivery.
 */
export function deliveryLag(
  member: MemberCursor,
  nowMs: number,
  graceMs = 60_000,
): DeliveryLag {
  if (member.muted) return { state: "muted" };
  const failedAt = member.last_failure_at ? Date.parse(member.last_failure_at) : NaN;
  const deliveredAt = member.delivered_at ? Date.parse(member.delivered_at) : NaN;
  const unrecovered =
    !Number.isNaN(failedAt) && (Number.isNaN(deliveredAt) || failedAt > deliveredAt);
  if (unrecovered && (member.lookup_failures > 0 || member.expired_count > 0)) {
    return {
      state: "failing",
      failures: member.lookup_failures,
      expired: member.expired_count,
      reason: member.last_failure_reason,
    };
  }
  if (
    member.offered_through &&
    member.offered_through !== member.delivered_through &&
    member.offered_at
  ) {
    const offered = Date.parse(member.offered_at);
    if (!Number.isNaN(offered) && nowMs - offered > graceMs) {
      return { state: "offered", sinceMs: nowMs - offered };
    }
  }
  return { state: "clear" };
}

/** "12s", "4m", "3h", "2d" — compact relative age for dense rows. */
export function compactAge(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/**
 * Where each agent room is listed, the ONE split every count in the hub uses
 * (the empty-state summary and the sidebar's section headers), so the numbers
 * always add up. A direct line nobody has written in yet is reached through
 * its session, not listed.
 */
export interface RoomSplit<T> {
  /** The Rooms section: direct lines with mail, pairs and named rooms. */
  listed: T[];
  /** The Review rooms section. */
  review: T[];
  /** Unwritten direct lines: not listed, and never counted as rooms. */
  unwritten: T[];
}

export function splitRooms<T extends { conversation: { metadata?: unknown }; lastMessageAt: string | null }>(
  rooms: readonly T[],
): RoomSplit<T> {
  const split: RoomSplit<T> = { listed: [], review: [], unwritten: [] };
  for (const room of rooms) {
    const kind = agentRoomKind(room.conversation.metadata);
    if (kind === "agent_review") split.review.push(room);
    else if (kind === "agent_direct" && !room.lastMessageAt) split.unwritten.push(room);
    else split.listed.push(room);
  }
  return split;
}

/** "24 rooms · 926 review rooms": the summary of the same split the sidebar lists. */
export function roomCountText(split: RoomSplit<unknown>, complete: boolean): string {
  const more = complete ? "" : "+";
  const parts = [`${split.listed.length}${more} room${split.listed.length === 1 && complete ? "" : "s"}`];
  if (split.review.length > 0) {
    parts.push(`${split.review.length}${more} review room${split.review.length === 1 && complete ? "" : "s"}`);
  }
  return parts.join(" · ");
}

/**
 * Labels that collide (same title, provider and workspace) get the session's
 * short id, so ten "Claude Code session · agent-mail-live-test" rows are ten
 * distinguishable rows. Returns the id suffix per session id; unique labels get
 * none.
 */
export function collidingLabelSuffixes(
  sessions: readonly { id: string; title: string; provider: string; workspace: string | null }[],
): Map<string, string> {
  const groups = new Map<string, string[]>();
  for (const s of sessions) {
    const key = [s.title.toLowerCase(), s.provider, s.workspace ?? ""].join("\u0000");
    groups.set(key, [...(groups.get(key) ?? []), s.id]);
  }
  const out = new Map<string, string>();
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    // Shortest prefix (from 6 chars) that tells every member of the group apart.
    let len = 6;
    while (len < 36 && new Set(ids.map((id) => id.replace(/-/g, "").slice(0, len))).size < ids.length) len += 2;
    for (const id of ids) out.set(id, id.replace(/-/g, "").slice(0, len));
  }
  return out;
}
