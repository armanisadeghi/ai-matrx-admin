/**
 * The device console's Sessions view, as pure rules (tested, never eyeballed): what this browser
 * tells the computer it is, which honest state the view is in, and how one recent row reads. The
 * rows are the computer's own (its sidebar's Code › Recent, `createRecentChats`), so the words and
 * dots here are the Mac's: Running, Needs you, New output, Running in <app>.
 */
import type { RecentChatRow, TransportStatus } from "@ai-matrx/coding-sessions";

import type { ConsoleStatus } from "../connection";

/** What this browser is, in a person's words, for "Started from iPhone" on the computer. */
export function clientLabelFor(userAgent: string): string {
  const ua = userAgent || "";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua))) return "iPad";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Android phone" : "Android tablet";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const os = /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : null;
  return os ? `${browser} on ${os}` : browser;
}

export type SessionsState =
  | { kind: "ready" }
  | { kind: "blocked"; title: string; body: string };

/**
 * The one sentence the Sessions view shows instead of a list that cannot be trusted, in order:
 * the computer offline (or asleep), refused, still connecting, a Matrx 2 too old to steer its
 * coding sessions, and the coding tools turned off for agents on that computer.
 */
export function sessionsState(input: {
  console: ConsoleStatus;
  transport: TransportStatus;
  deviceName: string;
  refusal: string | null;
}): SessionsState {
  const { console: c, transport, deviceName } = input;
  if (c.pill === "offline") {
    return { kind: "blocked", title: `${deviceName} is offline or asleep`, body: "Its sessions show here when it is awake and online. A Mac with its lid closed on battery sleeps." };
  }
  if (c.pill === "refused") return { kind: "blocked", title: c.label, body: c.detail ?? "This computer cannot be reached from here." };
  if (transport.state === "connecting") return { kind: "blocked", title: "Connecting…", body: `Reaching ${deviceName}.` };
  if (transport.state === "closed") return { kind: "blocked", title: "Can't show sessions", body: transport.reason };
  if (input.refusal) return { kind: "blocked", title: "Coding sessions are turned off", body: input.refusal };
  return { kind: "ready" };
}

/** A computer's refusal that stops the whole view (the person's own switch), or null. */
export function wholeViewRefusal(error: unknown): string | null {
  const e = error as { code?: unknown; message?: unknown } | null;
  if (e?.code === "AUTH_FORBIDDEN" && typeof e.message === "string" && /turned off for agents/.test(e.message)) return e.message;
  return null;
}

export interface RowFacts {
  title: string;
  /** "Claude Code · parser" */
  where: string;
  /** The dot: amber (warning), blue (info), or none. */
  tone: "warning" | "info" | null;
  toneLabel: string | null;
  /** "From iPhone": a run another screen or an agent started. */
  from: string | null;
}

const PROVIDER: Record<RecentChatRow["provider"], string> = { claude: "Claude Code", codex: "Codex" };

export function rowFacts(row: RecentChatRow): RowFacts {
  const folder = row.cwd ? row.cwd.split(/[\\/]+/).filter(Boolean).pop() ?? row.cwd : null;
  const tone = row.state === "new_output" ? "info" : row.state === "idle" ? null : "warning";
  const from = row.startedBy && row.startedBy.kind !== "this_computer" ? (row.startedBy.kind === "agent" ? "From an agent" : `From ${row.startedBy.label}`) : null;
  return { title: row.title, where: [PROVIDER[row.provider], folder].filter(Boolean).join(" · "), tone, toneLabel: tone ? row.stateLabel : null, from };
}

export type SessionsScope = "all" | "attention" | "open" | "pinned";

/** The Mac's Code › Chats smart mailboxes, as the list's scope bar. */
export const SCOPES: { value: SessionsScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "open", label: "Open now" },
  { value: "pinned", label: "Pinned" },
];

export function inScope(row: RecentChatRow, scope: SessionsScope): boolean {
  switch (scope) {
    case "attention":
      return row.state === "needs_attention" || row.state === "new_output";
    case "open":
      return row.state === "running" || row.state === "elsewhere";
    case "pinned":
      return row.pinned;
    default:
      return true;
  }
}
