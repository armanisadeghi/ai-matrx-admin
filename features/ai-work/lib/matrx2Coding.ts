/**
 * THE /work CODING DOORS: capability, start, continue and reconcile ask the person's Matrx 2
 * computer first, and fall back to Matrx Local, announced, only when no Matrx 2 computer answers.
 *
 * Every door speaks to the computer through the shared client (`createDesktopProtocolTransport`
 * from `@ai-matrx/coding-sessions`, the device console's own) — no new client, no new op. The
 * browser wiring (relay, sign-in, the cloud lookup, the Matrx Local bridge) is injected as
 * `CodingDoors`, so this module has no browser import and a live proof can call it as shipped
 * (matrx-desktop `test/live/web-coding-doors-live.test.ts`).
 *
 * Which computer: the one the page names; otherwise the online one; with several online, the
 * newest check-in, and the `notice` says which BEFORE anything runs. Only that computer gets a
 * socket — the rest are read from the relay's status, never connected to.
 *
 * Pending filings live in `app_instances.metadata`, not `custom_fields`: system-managed state the person never edits; the UI shows a status derived from it, never the raw field.
 */
import type { PendingFiling, PendingFilingStore } from "@ai-matrx/coding-sessions";
import {
  createDesktopProtocolTransport,
  type ActiveElsewhere,
  type CodingSession,
  type DesktopProtocolLikeClient,
  type DiscoveredSession,
  type ProviderStatus,
  type RecentFolder,
} from "@ai-matrx/coding-sessions";

/*
 * Matrx Local's answers, by SHAPE (structurally identical to `matrxLocalRuntime.ts`'s types, which
 * satisfy them). Not imported: that module pulls the browser's Supabase client, and the live proof
 * in matrx-desktop type-checks this file from outside this app. Deleted with Matrx Local.
 */
export interface LocalRuntimeCapability {
  state: "loading" | "ready" | "unreachable";
  available: boolean;
  reasons: string[];
  claudeCli: string | null;
  claudeAccountLabel: string | null;
  workspaceRoots: string[];
  approvedFolders: string[];
  activeRuns: number;
}
export interface LocalRuntimeRun {
  conversation_id: string | null;
}
export interface LocalResumableVerdict {
  resumable: boolean;
  reason?: string;
  session_id?: string;
  workspace?: string;
}
export interface LocalReconcileResult {
  actions: Array<{ step: string; outcome: string; detail?: string | null }>;
  truth: { verdict: { sentence: string; remedy: string | null } };
}

/**
 * THE fallback order. Matrx 2 first; Matrx Local while it is still installed. Deleted together
 * with `matrxLocalRuntime.ts` — the day Matrx Local retires, the second entry and every
 * `via: "matrx-local"` branch below go with it.
 */
export const FALLBACK_ORDER = ["matrx2", "matrx-local"] as const;

/** The protocol minor that carries `coding.*`. */
export const CODING_MINOR = 38;

/** How many of a computer's newest chats Continue looks through (`coding.discover` has no lookup by id). */
export const DISCOVER_WINDOW = 200;

/** How long a start waits for the chat's own id (its first output) before filing is recorded as pending. */
export const FILING_WAIT_MS = 20_000;
const FILING_POLL_MS = 1_000;
/** How long one computer gets to answer the relay's connect. */
export const READY_MS = 6_000;
/** The most computers a door tries (newest check-in first). */
export const MAX_COMPUTERS = 4;

export interface Matrx2Computer {
  deviceId: string;
  name: string;
}

/** What the relay says about one computer — no socket opened. */
export interface Matrx2ComputerStatus extends Matrx2Computer {
  /** null: the relay could not say. */
  online: boolean | null;
  protocolVersion: string | null;
}

export interface Matrx2Reach {
  /** The person's Matrx 2 computers (only `deviceId`'s when given), from the relay's status. */
  listComputers(deviceId?: string | null): Promise<Matrx2ComputerStatus[] | { reason: string }>;
  /** One socket to that computer for the length of `work`, closed after. */
  withClient<T>(computer: Matrx2Computer, work: (client: DesktopProtocolLikeClient) => Promise<T>): Promise<T>;
  /** The AI Matrx conversation a provider chat landed in, or null when it has not arrived. */
  findConversation(providerSessionId: string): Promise<string | null>;
}

export interface MatrxLocalDoor {
  capability(): Promise<LocalRuntimeCapability>;
  start(input: { workspace: string; prompt: string; resume_session_id?: string }): Promise<LocalRuntimeRun>;
  resumable(providerSessionId: string): Promise<LocalResumableVerdict>;
  reconcile(providerSessionId: string): Promise<LocalReconcileResult>;
}

/**
 * PENDING FILING — a chat started on a Matrx 2 computer that has not reached AI Matrx yet, with the
 * homes it is to be filed under, kept on the computer's own `app_instances` row
 * (`metadata.ai_work.pending_filings`). ONE implementation, shared with Matrx 2 (which files its
 * scheduled coding runs the same way): `@ai-matrx/coding-sessions` filing. Used here by the /work doors; delivery itself is always the person's explicit act.
 */

export interface CodingDoors {
  reach: Matrx2Reach;
  local: MatrxLocalDoor;
  /** Where unfiled starts wait. Absent: filing is reported pending and not remembered. */
  filings?: PendingFilingStore;
}

// ── THE relay reach (one implementation; the browser injects its wiring) ─────

/** A desktop-protocol client the reach can open, wait on and close. */
export type ReachClient = DesktopProtocolLikeClient & {
  connect(): void;
  ready(options: { timeoutMs: number }): Promise<{ protocol_version: string }>;
  close(): void;
};

export interface ReachDeps {
  /** The signed-in person's token and id, or null when signed out. */
  session(): Promise<{ token: string; userId: string } | null>;
  /** The person's active computers, newest check-in first. Throws on a failed query. */
  devices(userId: string): Promise<Array<{ id: string; name: string }>>;
  /** The relay's word on one computer; null when it cannot say. */
  relayStatus(deviceId: string, token: string): Promise<{ online: boolean; protocol_version?: string | null } | null>;
  /** A client to that computer through the relay. */
  client(deviceId: string): ReachClient;
  /** The AI Matrx conversation for a `cloudSessionFilter`, read as the person. */
  conversation(userId: string, filter: string): Promise<string | null>;
}

/** The one relay reach: the browser's (matrx2Computers.ts) and the live proof's are both this. */
export function createMatrx2Reach(deps: ReachDeps): Matrx2Reach {
  return {
    async listComputers(deviceId) {
      const session = await deps.session();
      if (!session) return { reason: "Sign in to reach your computers." };
      let devices: Array<{ id: string; name: string }>;
      try {
        devices = await deps.devices(session.userId);
      } catch (error) {
        return { reason: `Your computers could not be listed: ${error instanceof Error ? error.message : String(error)}` };
      }
      // The page's own computer is filtered BEFORE the cap, so a named fifth computer is still asked.
      const pool = (deviceId ? devices.filter((d) => d.id === deviceId) : devices).slice(0, MAX_COMPUTERS);
      return Promise.all(
        pool.map(async (d) => {
          const status = await deps.relayStatus(d.id, session.token).catch(() => null);
          return { deviceId: d.id, name: d.name, online: status ? status.online : null, protocolVersion: status?.protocol_version ?? null };
        }),
      );
    },
    async withClient(computer, work) {
      const client = deps.client(computer.deviceId);
      try {
        client.connect();
        const welcome = await client.ready({ timeoutMs: READY_MS });
        if (protocolMinor(welcome.protocol_version) < CODING_MINOR) throw new Error("update Matrx 2 to reach its coding sessions from here.");
        return await work(client);
      } finally {
        client.close();
      }
    },
    async findConversation(providerSessionId) {
      const session = await deps.session();
      if (!session) return null;
      return deps.conversation(session.userId, cloudSessionFilter(providerSessionId));
    },
  };
}

/** "Arrived by" in words: each desktop app stamps its own origin (matrx_desktop is Matrx 2). Pure. */
export function arrivedByLabel(origin: string | null | undefined, humanize: (value: string) => string): string {
  if (!origin) return "Not recorded";
  if (origin === "matrx_desktop") return "Matrx 2";
  if (origin === "matrx_local") return "Matrx Local";
  if (origin === "matrx_sandbox") return "Matrx Sandbox";
  return humanize(origin);
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/** "1.38" → 38; anything else → 0. */
export function protocolMinor(version: string | null | undefined): number {
  const minor = Number(String(version ?? "").split(".")[1]);
  return Number.isFinite(minor) ? minor : 0;
}

/** One computer's failure, in words: a dropped or silent link reads "offline or asleep". */
export function computerReason(name: string, error: unknown): string {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/offline|timed out|TIMEOUT|DEVICE_OFFLINE|closed/i.test(text)) return `${name}: offline or asleep.`;
  return `${name}: ${error instanceof Error ? error.message : String(error)}`;
}

/** The cloud stores an imported chat as `claude-sdk:…:<base64url(id)>`; the computer knows the bare id. */
export function nativeSessionId(providerSessionId: string): string {
  const last = providerSessionId.split(":").pop() ?? providerSessionId;
  if (last === providerSessionId) return providerSessionId;
  try {
    const decoded =
      typeof atob === "function"
        ? atob(last.replace(/-/g, "+").replace(/_/g, "/"))
        : Buffer.from(last, "base64url").toString("utf8");
    return /^[0-9a-f-]{36}$/i.test(decoded) ? decoded : providerSessionId;
  } catch {
    return providerSessionId;
  }
}

/**
 * The PostgREST filter that finds a chat's AI Matrx row (`chat.coding_session`): the bare id, or the
 * imported form `…:<base64url(id)>`. Pure.
 */
export function cloudSessionFilter(providerSessionId: string): string {
  const encoded = btoa(providerSessionId).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `provider_session_id.eq.${providerSessionId},provider_session_id.like.*:${encoded}`;
}

export interface ComputerPick {
  computer: Matrx2Computer | null;
  /** The other online computers, in the order they are tried after `computer`. */
  others?: Matrx2Computer[];
  /** Why each other computer will not run it. */
  reasons: string[];
  /** Said before anything runs: which computer runs it. Null when none. */
  notice: string | null;
}

/**
 * Which computer runs it. Pure. The page's own device when it names one; else the online one; with
 * several online, the first (newest check-in) — and the notice names it, never a silent pick.
 */
export function chooseComputer(statuses: Matrx2ComputerStatus[], deviceId?: string | null): ComputerPick {
  const pool = deviceId ? statuses.filter((s) => s.deviceId === deviceId) : statuses;
  if (pool.length === 0) {
    return { computer: null, reasons: [deviceId ? "That computer is not one of yours on Matrx 2." : "No computer runs Matrx 2 on this account."], notice: null };
  }
  const reasons: string[] = [];
  const online: Matrx2ComputerStatus[] = [];
  const unknown: Matrx2ComputerStatus[] = [];
  // Offline computers: only the two most recently seen are named (the ones the person could mean).
  const offline = pool.filter((s) => s.online === false);
  for (const s of offline.slice(0, 2)) reasons.push(`${s.name}: offline or asleep.`);
  if (offline.length > 2) reasons.push(`${offline.length - 2} more ${offline.length - 2 === 1 ? "is" : "are"} offline.`);
  for (const s of pool) {
    if (s.online === false) continue;
    else if (protocolMinor(s.protocolVersion) > 0 && protocolMinor(s.protocolVersion) < CODING_MINOR) reasons.push(`${s.name}: update Matrx 2 to reach its coding sessions from here.`);
    else if (s.online) online.push(s);
    else unknown.push(s);
  }
  const candidates = [...online, ...unknown];
  const first = candidates[0];
  if (!first) return { computer: null, reasons, notice: null };
  const computer = { deviceId: first.deviceId, name: first.name };
  const others = candidates.slice(1).map((c) => ({ deviceId: c.deviceId, name: c.name }));
  // The device list is newest check-in first (`last_seen` descending).
  const notice =
    candidates.length > 1 && !deviceId
      ? `Runs on ${first.name}, the newest of ${candidates.length} online.`
      : `Runs on ${first.name} (Matrx 2).`;
  return { computer, others, reasons, notice };
}

/** The line shown when Matrx 2 could not take it and Matrx Local is tried. */
export function fallbackNotice(reasons: string[]): string {
  return `No Matrx 2 computer answered: ${reasons.join(" ") || "none found."} Trying Matrx Local.`;
}

/** Matrx 2's providers + recent folders, as the composer's capability. Pure. */
export function capabilityFromMatrx2(name: string, providers: ProviderStatus[], folders: RecentFolder[]): LocalRuntimeCapability {
  const claude = providers.find((p) => p.provider === "claude");
  const usable = folders.filter((f) => f.exists).map((f) => f.path);
  const reasons = !claude
    ? [`Claude Code is not on ${name}.`]
    : claude.ready
      ? []
      : [claude.problem ?? `Claude Code is not ready on ${name}.`, ...(claude.fix ? [claude.fix] : [])];
  return {
    state: "ready",
    available: Boolean(claude?.ready),
    reasons,
    claudeCli: claude?.version ?? null,
    claudeAccountLabel: claude?.account ?? null,
    workspaceRoots: usable,
    approvedFolders: usable,
    activeRuns: 0,
  };
}

/** Which chat on that computer Continue reaches. Pure. */
export type ContinueTarget =
  | { state: "ready"; cwd: string; ownSessionId: string | null; elsewhere: ActiveElsewhere | null }
  | { state: "blocked"; sentence: string };

export function continueTarget(
  name: string,
  id: string,
  sessions: CodingSession[],
  discovered: DiscoveredSession[],
  window: number = DISCOVER_WINDOW,
): ContinueTarget {
  const own = sessions.find((s) => s.providerSessionId === id);
  if (own) return { state: "ready", cwd: own.cwd, ownSessionId: own.id, elsewhere: null };
  const chat = discovered.find((c) => c.providerSessionId === id);
  if (!chat) return { state: "blocked", sentence: `This chat is not among the newest ${window} chats on ${name}.` };
  if (chat.unavailable) return { state: "blocked", sentence: chat.unavailable };
  if (!chat.cwd) return { state: "blocked", sentence: `${name} has no record of the folder this chat worked in, so it cannot continue there.` };
  return { state: "ready", cwd: chat.cwd, ownSessionId: null, elsewhere: chat.activeElsewhere };
}

// ── The doors ───────────────────────────────────────────────────────────────

async function pick(doors: CodingDoors, deviceId?: string | null): Promise<ComputerPick> {
  const listed = await doors.reach.listComputers(deviceId).catch((error: unknown) => ({ reason: error instanceof Error ? error.message : String(error) }));
  if ("reason" in listed) return { computer: null, reasons: [listed.reason], notice: null };
  return chooseComputer(listed, deviceId);
}

/** Which computer would run it, said before anything runs. */
export async function pickComputer(doors: CodingDoors, deviceId?: string | null): Promise<ComputerPick> {
  return pick(doors, deviceId);
}

/**
 * The computer that holds this chat (each online one asked, the page's own first), for the
 * reconcile confirm to name. None holds it: no computer, and the reasons say so.
 */
export async function pickChatHolder(doors: CodingDoors, providerSessionId: string, deviceId?: string | null): Promise<ComputerPick> {
  const id = nativeSessionId(providerSessionId);
  const chosen = await pick(doors, deviceId);
  const found = await firstComputerWith<boolean>(doors, chosen, async (client, computer) => {
    const target = await locateChat(client, computer, id);
    // A chat with no folder or one open elsewhere is still on this computer: it can be delivered.
    return target.state === "ready" || !/^This chat is not among/.test(target.sentence) ? { value: true } : { notHere: target.sentence };
  });
  if (found.found) return { computer: found.computer, others: [], reasons: chosen.reasons, notice: `Runs on ${found.computer.name}, which holds this chat.` };
  return { computer: null, others: [], reasons: [...found.reasons, ...(found.notHere.length ? [notHereSentence(found.notHere)] : [])], notice: null };
}

function transportFor(client: DesktopProtocolLikeClient, name: string) {
  return createDesktopProtocolTransport({ client, deviceName: name, newRequestId: () => crypto.randomUUID() });
}

/** Run `work` on the picked computer; a failure becomes that computer's reason. */
async function onComputer<T>(doors: CodingDoors, chosen: ComputerPick, work: (client: DesktopProtocolLikeClient, computer: Matrx2Computer) => Promise<T>): Promise<{ value: T } | { reasons: string[] }> {
  const computer = chosen.computer;
  if (!computer) return { reasons: chosen.reasons };
  try {
    return { value: await doors.reach.withClient(computer, (client) => work(client, computer)) };
  } catch (error) {
    return { reasons: [...chosen.reasons, computerReason(computer.name, error)] };
  }
}

/**
 * Ask each online computer in turn (the chosen one first) until one has it. `work` returns the
 * value, or a sentence for "not on this computer". `answered`: some computer answered, so the door
 * does not fall back to Matrx Local. Used by Full Download, Continue and Reconcile.
 */
export async function firstComputerWith<T>(
  doors: CodingDoors,
  chosen: ComputerPick,
  work: (client: DesktopProtocolLikeClient, computer: Matrx2Computer) => Promise<{ value: T } | { notHere: string }>,
): Promise<{ found: true; computer: Matrx2Computer; value: T } | { found: false; reasons: string[]; notHere: string[]; answered: boolean }> {
  const reasons = [...chosen.reasons];
  const notHere: string[] = [];
  for (const computer of chosen.computer ? [chosen.computer, ...(chosen.others ?? [])] : []) {
    try {
      const answer = await doors.reach.withClient(computer, (client) => work(client, computer));
      if ("value" in answer) return { found: true, computer, value: answer.value as T };
      notHere.push(answer.notHere);
    } catch (error) {
      reasons.push(computerReason(computer.name, error));
    }
  }
  return { found: false, reasons, notHere, answered: notHere.length > 0 };
}

/** Is that chat on this computer, and where can it continue? */
async function locateChat(client: DesktopProtocolLikeClient, computer: Matrx2Computer, id: string): Promise<ContinueTarget> {
  const transport = transportFor(client, computer.name);
  try {
    const sessions = await transport.call("listSessions");
    const discovered = sessions.some((s) => s.providerSessionId === id) ? [] : await transport.call("discoverSessions", { limit: DISCOVER_WINDOW });
    return continueTarget(computer.name, id, sessions, discovered);
  } finally {
    transport.dispose();
  }
}

export type ChatHolding =
  | { via: "matrx2"; computer: Matrx2Computer; updatedAt: string | null }
  | { via: "none"; sentence: string };

/**
 * Which Matrx 2 computer holds this chat, and when it last changed there: what Matrx 2 can tell
 * the sync panel. It cannot count transcript entries (no protocol op does), so it never fakes them.
 */
export async function readChatHolding(doors: CodingDoors, providerSessionId: string): Promise<ChatHolding> {
  const id = nativeSessionId(providerSessionId);
  const chosen = await pick(doors, null);
  const found = await firstComputerWith<string | null>(doors, chosen, async (client, computer) => {
    const transport = transportFor(client, computer.name);
    try {
      const own = (await transport.call("listSessions")).find((x) => x.providerSessionId === id);
      if (own) return { value: own.updatedAt ?? null };
      const chat = (await transport.call("discoverSessions", { limit: DISCOVER_WINDOW })).find((c) => c.providerSessionId === id);
      return chat ? { value: chat.updatedAt } : { notHere: `This chat is not among the newest ${DISCOVER_WINDOW} chats on ${computer.name}.` };
    } finally {
      transport.dispose();
    }
  });
  if (found.found) return { via: "matrx2", computer: found.computer, updatedAt: found.value };
  return { via: "none", sentence: [...found.reasons, ...(found.notHere.length ? [notHereSentence(found.notHere)] : [])].join(" ") || "No Matrx 2 computer answered." };
}

/** "not among the newest 200 chats on A." + "… on B." → one sentence naming both. Pure. */
export function notHereSentence(sentences: string[]): string {
  const window = /^This chat is not among the newest (\d+) chats on (.+)\.$/;
  const names = sentences.map((s) => window.exec(s)).filter((m): m is RegExpExecArray => m !== null);
  if (names.length === sentences.length && names.length > 1) {
    return `This chat is not among the newest ${names[0]?.[1]} chats on ${names.map((m) => m[2]).join(" or ")}.`;
  }
  return sentences.join(" ");
}

export type DoorCapability = LocalRuntimeCapability & {
  via: (typeof FALLBACK_ORDER)[number];
  computer: Matrx2Computer | null;
  /** One line under the destination: which computer runs it, or why Matrx Local is tried. */
  notice: string | null;
};

/** Lazy: called when the person picks "Claude Code on my computer", never on mount. */
export async function readCodingCapability(doors: CodingDoors, deviceId?: string | null): Promise<DoorCapability> {
  const chosen = await pick(doors, deviceId);
  const answer = await onComputer(doors, chosen, async (client, computer) => {
    const transport = transportFor(client, computer.name);
    try {
      const providers = await transport.call("providers");
      const folders = await transport.call("recentFolders").catch(() => [] as RecentFolder[]);
      return capabilityFromMatrx2(computer.name, providers, folders);
    } finally {
      transport.dispose();
    }
  });
  if ("value" in answer) return { ...answer.value, via: "matrx2", computer: chosen.computer, notice: chosen.notice };
  const local = await doors.local.capability();
  const notice = fallbackNotice(answer.reasons);
  if (local.state === "unreachable") {
    return { ...local, reasons: [...answer.reasons, ...local.reasons], via: "matrx-local", computer: null, notice };
  }
  return { ...local, via: "matrx-local", computer: null, notice: `${notice} Through Matrx Local.` };
}

export type StartOutcome =
  | { via: "matrx2"; computer: Matrx2Computer; sessionId: string; runId: string | null; queued: boolean }
  | { via: "matrx-local"; run: LocalRuntimeRun };

/** Start a Claude Code chat where the capability said it runs. */
export async function startCodingRun(
  doors: CodingDoors,
  capability: Pick<DoorCapability, "via" | "computer">,
  input: { cwd: string; prompt: string; provider?: "claude" | "codex"; accountProfileId?: string | null },
): Promise<StartOutcome> {
  const provider = input.provider ?? "claude";
  if (capability.via === "matrx2" && capability.computer) {
    const computer = capability.computer;
    try {
      return await doors.reach.withClient(computer, async (client) => {
        const transport = transportFor(client, computer.name);
        try {
          const started = await transport.call("start", {
            provider,
            cwd: input.cwd,
            prompt: input.prompt,
            ...(input.accountProfileId ? { accountId: input.accountProfileId } : {}),
          });
          return { via: "matrx2" as const, computer, sessionId: started.session.id, runId: started.run?.runId ?? null, queued: started.queued };
        } finally {
          transport.dispose();
        }
      });
    } catch (error) {
      throw new Error(computerReason(computer.name, error));
    }
  }
  if (provider !== "claude") throw new Error("Codex runs only on a computer with Matrx 2.");
  return { via: "matrx-local", run: await doors.local.start({ workspace: input.cwd, prompt: input.prompt }) };
}

/** The line shown while a Matrx 2 chat has not reached AI Matrx yet. */
export function filingPendingSentence(name: string): string {
  return `Running on ${name}. Filed under your homes once ${name} delivers it to AI Matrx.`;
}

export type FilingOutcome = { conversationId: string } | { pending: string };

/**
 * The join from a Matrx 2 chat to its AI Matrx conversation, by the chat's own id. Matrx 2 has no
 * per-turn cloud mirror and no per-chat delivery, and a delivery sends EVERY chat that computer has
 * (`coding.reconcile`), so filing never delivers by itself: it reads the chat's id, files at once
 * when the chat is already in AI Matrx, and otherwise records a pending filing (with its homes)
 * that the next /work load resumes. Never throws: a "not yet" is a sentence.
 */
export async function fileMatrx2Run(
  doors: CodingDoors,
  computer: Matrx2Computer,
  sessionId: string,
  options: { homes?: unknown[]; waitMs?: number; pollMs?: number; signal?: AbortSignal } = {},
): Promise<FilingOutcome> {
  const deadline = Date.now() + (options.waitMs ?? FILING_WAIT_MS);
  const pollMs = options.pollMs ?? FILING_POLL_MS;
  let providerSessionId: string | null = null;
  let reason: string | null = null;
  try {
    providerSessionId = await doors.reach.withClient(computer, async (client) => {
      const transport = transportFor(client, computer.name);
      try {
        for (;;) {
          const found = (await transport.call("listSessions")).find((s) => s.id === sessionId)?.providerSessionId ?? null;
          if (found || options.signal?.aborted || Date.now() > deadline) return found;
          await new Promise((r) => setTimeout(r, pollMs));
        }
      } finally {
        transport.dispose();
      }
    });
  } catch (error) {
    reason = computerReason(computer.name, error);
  }
  if (providerSessionId) {
    const conversationId = await doors.reach.findConversation(providerSessionId).catch(() => null);
    if (conversationId) return { conversationId };
  }
  const remembered = await (doors.filings?.put({ deviceId: computer.deviceId, computerName: computer.name, sessionId, providerSessionId, homes: options.homes ?? [], startedAt: Date.now() }) ?? Promise.resolve())
    .then(() => null)
    .catch((error: unknown) => `It is not remembered for filing: ${error instanceof Error ? error.message : String(error)}`);
  return { pending: [filingPendingSentence(computer.name), reason, remembered].filter(Boolean).join(" ") };
}

/**
 * The next /work load: every pending filing whose chat has reached AI Matrx is filed (`attach`
 * with its homes) and forgotten. Returns what still waits, for the page to show.
 */
export async function resumePendingFilings(
  doors: CodingDoors,
  attach: (conversationId: string, filing: PendingFiling) => Promise<void>,
): Promise<PendingFiling[]> {
  const store = doors.filings;
  if (!store) return [];
  const waiting: PendingFiling[] = [];
  for (const filing of await store.list()) {
    let providerSessionId = filing.providerSessionId;
    if (!providerSessionId) {
      const computer = { deviceId: filing.deviceId, name: filing.computerName };
      providerSessionId = await doors.reach
        .withClient(computer, async (client) => {
          const transport = transportFor(client, computer.name);
          try {
            return (await transport.call("listSessions")).find((s) => s.id === filing.sessionId)?.providerSessionId ?? null;
          } finally {
            transport.dispose();
          }
        })
        .catch(() => null);
      if (providerSessionId) await store.put({ ...filing, providerSessionId });
    }
    const conversationId = providerSessionId ? await doors.reach.findConversation(providerSessionId).catch(() => null) : null;
    if (conversationId) {
      await attach(conversationId, filing);
      await store.remove(filing);
    } else waiting.push({ ...filing, providerSessionId });
  }
  return waiting;
}

/** A start whose filing went pending before its homes were known (the chooser's Run): add them. */
export async function addHomesToFiling(doors: CodingDoors, sessionId: string, homes: unknown[]): Promise<void> {
  const store = doors.filings;
  const filing = (await store?.list())?.find((f) => f.sessionId === sessionId);
  if (store && filing) await store.put({ ...filing, homes });
}

/** The person's explicit "deliver now" for a pending filing: that computer's whole delivery, scope said by the caller. */
export async function deliverFromComputer(doors: CodingDoors, filing: PendingFiling): Promise<string> {
  const computer = { deviceId: filing.deviceId, name: filing.computerName };
  try {
    const answer = (await doors.reach.withClient(computer, (client) =>
      client.request("coding.reconcile", { provider: "claude", provider_session_id: filing.providerSessionId ?? filing.sessionId }, { timeoutMs: 180_000 }),
    )) as { summary: string };
    return `${computer.name}: ${answer.summary}`;
  } catch (error) {
    return computerReason(computer.name, error);
  }
}

export type ContinueVerdict =
  | { via: "matrx2"; computer: Matrx2Computer; notice: string | null; target: ContinueTarget }
  | { via: "matrx-local"; verdict: LocalResumableVerdict; notice: string }
  | { via: "none"; sentence: string };

/**
 * Can this chat continue, and where: the computer that holds it (each online one is asked, the
 * page's own first). A computer that answered is never passed over for Matrx Local.
 */
export async function readContinueVerdict(doors: CodingDoors, providerSessionId: string, deviceId?: string | null): Promise<ContinueVerdict> {
  const id = nativeSessionId(providerSessionId);
  const chosen = await pick(doors, deviceId);
  const found = await firstComputerWith<ContinueTarget>(doors, chosen, async (client, computer) => {
    const target = await locateChat(client, computer, id);
    return target.state === "ready" ? { value: target } : { notHere: target.sentence };
  });
  if (found.found) {
    const notice = found.computer.deviceId === chosen.computer?.deviceId ? chosen.notice : `Runs on ${found.computer.name}, which holds this chat.`;
    return { via: "matrx2", computer: found.computer, notice, target: found.value };
  }
  if (found.answered && chosen.computer) {
    return { via: "matrx2", computer: chosen.computer, notice: chosen.notice, target: { state: "blocked", sentence: notHereSentence(found.notHere) } };
  }
  try {
    const verdict = await doors.local.resumable(providerSessionId);
    return { via: "matrx-local", verdict, notice: `${fallbackNotice(found.reasons)} Through Matrx Local.` };
  } catch (error) {
    return { via: "none", sentence: [...found.reasons, error instanceof Error ? error.message : String(error)].join(" ") };
  }
}

export type ContinueOutcome =
  | { via: "matrx2"; computer: Matrx2Computer; sessionId: string; queued: boolean; sentence: string }
  | { via: "matrx-local"; run: LocalRuntimeRun };

/** Continue the chat with a new message: take it over (when not already driven there), then send. */
export async function continueCodingRun(
  doors: CodingDoors,
  verdict: ContinueVerdict,
  input: { providerSessionId: string; prompt: string; confirmElsewhere?: boolean },
): Promise<ContinueOutcome> {
  if (verdict.via === "matrx2") {
    const { computer, target } = verdict;
    if (target.state !== "ready") throw new Error(target.sentence);
    if (target.elsewhere && !input.confirmElsewhere) throw new Error(target.elsewhere.message);
    try {
      return await doors.reach.withClient(computer, async (client) => {
        const transport = transportFor(client, computer.name);
        try {
          const sessionId =
            target.ownSessionId ??
            (
              await transport.call("takeover", {
                provider: "claude",
                providerSessionId: nativeSessionId(input.providerSessionId),
                cwd: target.cwd,
                confirmElsewhere: Boolean(input.confirmElsewhere),
              })
            ).id;
          const sent = await transport.call("send", sessionId, input.prompt);
          return { via: "matrx2" as const, computer, sessionId, queued: sent.queued, sentence: `Running on ${computer.name}. New turns appear here once ${computer.name} delivers them.` };
        } finally {
          transport.dispose();
        }
      });
    } catch (error) {
      throw new Error(computerReason(computer.name, error));
    }
  }
  if (verdict.via === "matrx-local") {
    const v = verdict.verdict;
    if (!v.resumable || !v.workspace) throw new Error("Native resume is not available.");
    return { via: "matrx-local", run: await doors.local.start({ workspace: v.workspace, prompt: input.prompt, resume_session_id: v.session_id ?? input.providerSessionId }) };
  }
  throw new Error(verdict.sentence);
}

/** The confirm copy names the true scope: Matrx 2 delivers every chat that computer has and AI Matrx lacks. */
export function reconcileScopeSentence(pickResult: ComputerPick): string {
  return pickResult.computer
    ? `${pickResult.computer.name} delivers every chat on it that AI Matrx lacks or is behind on, this one included. Running it again changes nothing.`
    : `${fallbackNotice(pickResult.reasons)} Matrx Local delivers what never arrived for this chat and re-projects what failed.`;
}

export type ReconcileOutcome =
  | { via: "matrx2"; computer: Matrx2Computer; state: "done" | "blocked" | "nothing_to_do"; summary: string }
  | { via: "matrx-local"; result: LocalReconcileResult; notice: string }
  | { via: "none"; sentence: string };

/** Reconcile on the computer the confirm named; Matrx Local only when no Matrx 2 computer answers. */
export async function reconcileCodingSession(
  doors: CodingDoors,
  chosen: ComputerPick,
  input: { providerSessionId: string; provider: string },
): Promise<ReconcileOutcome> {
  const provider = input.provider === "codex" ? "codex" : "claude";
  const answer = await onComputer(doors, chosen, async (client) =>
    (await client.request("coding.reconcile", { provider, provider_session_id: nativeSessionId(input.providerSessionId) }, { timeoutMs: 180_000 })) as {
      state: "done" | "blocked" | "nothing_to_do";
      summary: string;
    },
  );
  if ("value" in answer && chosen.computer) return { via: "matrx2", computer: chosen.computer, ...answer.value };
  const reasons = "reasons" in answer ? answer.reasons : [];
  try {
    const capability = await doors.local.capability();
    if (capability.state === "unreachable") return { via: "none", sentence: [...reasons, ...(capability.reasons.length ? capability.reasons : ["Matrx Local did not answer."])].join(" ") };
    return { via: "matrx-local", result: await doors.local.reconcile(input.providerSessionId), notice: `${fallbackNotice(reasons)} Through Matrx Local.` };
  } catch (error) {
    return { via: "none", sentence: [...reasons, error instanceof Error ? error.message : String(error)].join(" ") };
  }
}
