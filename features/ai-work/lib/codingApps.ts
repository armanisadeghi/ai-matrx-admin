/**
 * The coding apps on the person's Matrx 2 computer — their INSTANCES (one copy of the app with its
 * own data folder; the app's own folder is the main instance) and their ACCOUNTS (one sign-in at the
 * provider) — as /work/connections shows them. The rows come from the computer itself over the relay
 * (`apps.instances.list` / `apps.accounts.list`, protocol 1.47+), the same ops Matrx 2's
 * Code › Desktop apps reads, so the two pages show the same facts.
 *
 * MIRROR: every rule below is the desktop's own (matrx-desktop
 * `app/renderer/src/apps/InstancesAccounts.tsx` and `chats/accountsModel.ts`), copied word for word
 * until both apps read them from one shared package. Change one, change the other. Pure.
 */
import { formatRelativeTime } from "@ai-matrx/kit/format";
import type { AppAccount, AppInstance, ChatRow, InstanceStatus } from "@ai-matrx/desktop-protocol";

/** Every app the page shows, in Matrx 2's sidebar order. */
export const APP_KEYS = ["claude", "codex", "cursor", "vscode", "antigravity"] as const;
export type CodingAppKey = (typeof APP_KEYS)[number];
export const APP_LABEL: Record<string, string> = { claude: "Claude", codex: "Codex", cursor: "Cursor", vscode: "VS Code", antigravity: "Antigravity" };
/** Apps whose accounts the computer reads. */
export const READS_ACCOUNTS = new Set<string>(["claude", "codex", "cursor", "vscode"]);
/** Apps whose chats the computer reads (their instances get Chats / Open / Away). */
export const READS_CHATS = new Set<string>(["claude", "codex", "cursor", "vscode"]);
/** Apps whose usage the computer can read fresh (it opens or restarts the instance for a reading). */
export const ASKS_USAGE = new Set<string>(["claude"]);
/** The protocol minor that carries `apps.instances.list` and `apps.accounts.list`. */
export const APPS_MINOR = 47;

/** Claude's own thresholds: weekly ≥ 95 % or 5-hour ≥ 90 % is at its limit; 70 % is running low. */
const LIMIT = { weekly: 95, fiveHour: 90 } as const;
const LOW = 70;

export const appLabel = (key: string) => APP_LABEL[key] ?? key;
export const appOrder = (key: string) => {
  const i = APP_KEYS.indexOf(key as CodingAppKey);
  return i < 0 ? APP_KEYS.length : i;
};

const STATUS_WORD: Record<InstanceStatus, string> = { open: "Open", closed: "Closed", wrong_account: "Wrong account", update_waiting: "Update waiting", folder_missing: "Folder missing" };
const STATUS_TONE: Record<InstanceStatus, StatusTone> = { open: "success", closed: "neutral", wrong_account: "danger", update_waiting: "warning", folder_missing: "danger" };
const STATUS_ORDER: Record<InstanceStatus, number> = { wrong_account: 0, folder_missing: 1, update_waiting: 2, open: 3, closed: 4 };
export type StatusTone = "success" | "neutral" | "danger" | "warning";

/** The words for a status; an instance added but never opened has no folder yet, which is not "missing". */
export function statusWords(i: Pick<AppInstance, "status" | "first_launch_ms" | "running">): { word: string; tone: StatusTone; order: number } {
  if (i.status === "folder_missing" && i.first_launch_ms === null && !i.running) return { word: "Not opened yet", tone: "neutral", order: STATUS_ORDER.closed };
  return { word: STATUS_WORD[i.status], tone: STATUS_TONE[i.status], order: STATUS_ORDER[i.status] };
}

const shortId = (id: string) => (id.startsWith("org:") ? `org ${id.slice(4, 12)}` : id.slice(0, 8));
export const pct = (v: number) => (v >= 100 ? "Limit" : `${Math.round(Math.max(0, v))}%`);

/** The account's name in a table: its email, else "Unknown · <id>" until an instance signed into it opens. */
export const accountName = (a: Pick<AppAccount, "email" | "account_id">) => a.email ?? `Unknown · ${shortId(a.account_id)}`;
/** The account an instance is signed into, in the same words. */
export const instanceAccount = (i: Pick<AppInstance, "account" | "account_id">) => i.account ?? (i.account_id ? `Unknown · ${shortId(i.account_id)}` : null);

export type Availability = "available" | "weekly" | "five_hour" | "unknown";

/** Can this account take work now: available, at a limit, or unknown (no reading). */
export function availability(a: Pick<AppAccount, "weekly" | "five_hour" | "read_at_ms">): Availability {
  if (a.read_at_ms === null || a.weekly === null) return "unknown";
  if (a.weekly >= LIMIT.weekly) return "weekly";
  if ((a.five_hour ?? 0) >= LIMIT.fiveHour) return "five_hour";
  return "available";
}

const byName = (a: string | null, b: string | null) => (a ?? "~").localeCompare(b ?? "~", undefined, { sensitivity: "base", numeric: true });
const orInf = (v: number | null | undefined) => (v === null || v === undefined ? Number.POSITIVE_INFINITY : v);
const orNeg = (v: number | null | undefined) => (v === null || v === undefined ? -1 : v);

/** The order to use accounts in: available first, the one whose week resets soonest leading (what is left is lost at the reset). */
export function compareNext(a: AppAccount, b: AppAccount): number {
  const tier = (x: AppAccount) => ({ available: 0, five_hour: 1, weekly: 1, unknown: 2 })[availability(x)];
  const free = (x: AppAccount) => (availability(x) === "weekly" ? x.weekly_resets_at_ms : availability(x) === "five_hour" ? x.five_hour_resets_at_ms : null);
  return tier(a) - tier(b) || (tier(a) === 0 ? orInf(a.weekly_resets_at_ms) - orInf(b.weekly_resets_at_ms) || orNeg(b.weekly) - orNeg(a.weekly) : orInf(free(a)) - orInf(free(b))) || byName(accountName(a), accountName(b));
}

export const acctKey = (a: Pick<AppAccount, "app_key" | "account_id">) => `${a.app_key}:${a.account_id}`;
export const instKey = (i: Pick<AppInstance, "app_key" | "key">) => `${i.app_key}:${i.key}`;

/** Each account's use-next number within its app (available accounts only), keyed by {@link acctKey}. */
export function nextRanks(accounts: readonly AppAccount[]): Map<string, number> {
  const out = new Map<string, number>();
  const n = new Map<string, number>();
  for (const a of [...accounts].sort(compareNext)) {
    if (availability(a) !== "available") continue;
    n.set(a.app_key, (n.get(a.app_key) ?? 0) + 1);
    out.set(acctKey(a), n.get(a.app_key) as number);
  }
  return out;
}

/** The Next cell's word and tone: the use-next number, "Limit", "5 h" or "—". */
export function nextWord(a: AppAccount, ranks: Map<string, number>): { word: string; tone: StatusTone; order: number } {
  const s = availability(a);
  if (s === "available") return { word: String(ranks.get(acctKey(a)) ?? ""), tone: "success", order: ranks.get(acctKey(a)) ?? 0 };
  if (s === "weekly") return { word: "Limit", tone: "danger", order: 1_000 };
  if (s === "five_hour") return { word: "5 h", tone: "warning", order: 1_000 };
  return { word: "—", tone: "neutral", order: 2_000 };
}

/** The Next column's filter groups — the desktop's quick filters: Available, Running low, At the limit, No reading. */
export function nextGroup(a: AppAccount): "Available" | "Running low" | "At the limit" | "No reading" {
  const s = availability(a);
  if (s === "unknown") return "No reading";
  if (s !== "available") return "At the limit";
  return Math.max(a.weekly ?? 0, a.five_hour ?? 0) >= LOW ? "Running low" : "Available";
}

/** Hours or days until a time ("7h", "4d", "now"). */
export const untilWords = (at: number, now = Date.now()) => {
  const h = Math.max(0, Math.ceil((at - now) / 3_600_000));
  return h <= 0 ? "now" : h <= 48 ? `${h}h` : `${Math.round(h / 24)}d`;
};

/** A chat is in an instance when it is placed there and not hidden there, or is running there. */
export const inWindow = (c: ChatRow, w: string) => (c.places.includes(w) && !c.hidden_in.some((h) => h.window === w)) || c.running.some((r) => r.window === w);

/** The instance a "From <instance>" project's chats came from (null for any other project). */
function originOf(name: string, windows: ReadonlySet<string>): string | null {
  const m = /^From (\S+)(?: \((\S+)\))?(?: \d+)?$/.exec(name.trim());
  const w = m?.[1];
  return w && windows.has(w) ? w : null;
}

export interface AppChats {
  projects: ReadonlyArray<{ id: string; name: string; archived: boolean }>;
  chats: ReadonlyArray<ChatRow>;
  windows: ReadonlyArray<{ key: string; main: boolean }>;
}

/** Chats in an instance; -1 when its app's chats are not read (shown "—", never a false 0). */
export function chatCount(data: AppChats | undefined, instance: string): number {
  return data ? data.chats.filter((c) => inWindow(c, instance)).length : -1;
}

/** Chats moved away from an instance (in its "From <instance>" projects, no longer in it); -1 when unknown. */
export function awayCount(data: AppChats | undefined, instance: string): number {
  if (!data) return -1;
  const keys = new Set(data.windows.map((w) => w.key));
  let away = 0;
  for (const p of data.projects) {
    if (p.archived || originOf(p.name, keys) !== instance) continue;
    away += data.chats.filter((c) => c.projects.includes(p.id) && !inWindow(c, instance)).length;
  }
  return away;
}

/** "Updated just now", "Updated 4 min ago": when the oldest list shown was read. */
export function updatedWords(asOfMs: number | null, now = Date.now()): string {
  if (asOfMs === null) return "Reading…";
  return `Updated ${formatRelativeTime(asOfMs, { style: "short", minUnit: "minute", now })}`;
}
