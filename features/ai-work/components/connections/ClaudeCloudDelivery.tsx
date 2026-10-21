"use client";

/**
 * Claude cloud delivery — drawn ON the person's Claude account rows (Coding apps › Accounts), never
 * as a second list. `useClaudeCloudDelivery` owns the state: which claude.ai accounts the server's
 * cloud courier can deliver through (`users.integration_connections`, provider `claude_ai`, written
 * by the server from the sandbox's own answer) and the one sign-in that may be running.
 * `ClaudeCloudSignIn` is that sign-in's panel, always naming the account it is for, the step it is
 * on, how long it has run, what to expect, and a real end (link, failure, timeout or Cancel).
 *
 * The sign-in is Claude Code's own (`claude auth login`) inside the person's Matrx Sandbox
 * (`features/ai-work/lib/ownPlan.ts`); the pasted code is component-local state only: never
 * Redux, never storage, never logged, and cleared the moment it is submitted.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ExternalLink, KeyRound, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Input } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { formatDurationMs } from "@ai-matrx/kit/format";
import { getUserMessage } from "@ai-matrx/api";
import { toast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { createClient } from "@/utils/supabase/client";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { operationFailed } from "@/utils/errors";
import { isJsonObject } from "@/types/json";
import { abortableSleep, connectClaudeAccount, redeemClaudeCode } from "@/features/ai-work/lib/connectClaudeAccount";
import {
  claudeAnswerAt,
  COLD_START_EXPECTATION,
  parsePendingConnect,
  PENDING_CONNECT_KEY,
  phaseWords,
  resumeStep,
  type ConnectPhase,
  type PendingConnect,
} from "@/features/ai-work/lib/claudeConnectFlow";
import {
  cancelOwnPlanSignIn,
  capacityRefusalOf,
  newClaudeAccountSlot,
  readHostedCapacity,
  readOwnPlanStatus,
  signOutOwnPlan,
  type OwnPlanStatus,
  type SandboxCapacityRefusal,
} from "@/features/ai-work/lib/ownPlan";
import {
  cloudRowFor,
  macCourierEmails,
  normalEmail,
  signedInAsSomeoneElse,
  type CloudAccountRow,
  type CloudSignInRunning,
} from "@/features/ai-work/lib/claudeCloudDelivery";
import { SandboxCapacityList } from "@/features/ai-work/components/SandboxCapacityList";

const PROVIDER = "claude_code" as const;
const PRIMARY = "primary";
const SLOT_WAIT_MS = 90_000;

async function readCloudAccounts(): Promise<CloudAccountRow[]> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await getClaimsUser(supabase);
  if (authError) throw operationFailed("load your Claude cloud accounts", authError);
  if (!user?.id) return [];
  const { data, error } = await supabase
    .schema("users")
    .from("integration_connections")
    .select("id, account_name, account_email, status, metadata")
    .eq("provider", "claude_ai")
    .eq("owner_type", "user")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw operationFailed("load your Claude cloud accounts", error);
  return data.map((row) => {
    const slot = isJsonObject(row.metadata) ? row.metadata.account_slot : null;
    return {
      id: row.id,
      label: row.account_name ?? row.account_email ?? "Claude account",
      email: row.account_email ?? null,
      status: row.status,
      slot: typeof slot === "string" ? slot : null,
    };
  });
}

/** The person's computers' agent-mail desktop couriers (`app_instances.metadata`), as emails a live Mac delivers through. */
async function readMacCouriers(): Promise<Set<string>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await getClaimsUser(supabase);
  if (authError) throw operationFailed("load which Macs deliver to your cloud sessions", authError);
  if (!user?.id) return new Set();
  const { data, error } = await supabase.from("app_instances").select("metadata").eq("user_id", user.id).is("deleted_at", null);
  if (error) throw operationFailed("load which Macs deliver to your cloud sessions", error);
  return macCourierEmails(data.map((r) => r.metadata), Date.now());
}

/** After a Stop: wait until the cap no longer refuses (the box has really stopped). */
async function waitForFreeSlot(signal: AbortSignal): Promise<void> {
  const deadline = Date.now() + SLOT_WAIT_MS;
  while (!signal.aborted && Date.now() < deadline) {
    try {
      if ((await readHostedCapacity()) === null) return;
    } catch {
      return;
    }
    await abortableSleep(2_000, signal);
  }
}

function remember(pending: PendingConnect | null): void {
  try {
    if (pending) window.localStorage.setItem(PENDING_CONNECT_KEY, JSON.stringify(pending));
    else window.localStorage.removeItem(PENDING_CONNECT_KEY);
  } catch (cause) {
    console.error("[claude-cloud] could not remember the sign-in in progress", cause);
  }
}
function remembered(): PendingConnect | null {
  try {
    return parsePendingConnect(window.localStorage.getItem(PENDING_CONNECT_KEY));
  } catch {
    return null;
  }
}
const noSubscription = () => () => {};
function rememberedRaw(): string | null {
  try {
    return window.localStorage.getItem(PENDING_CONNECT_KEY);
  } catch {
    return null;
  }
}

interface Running {
  forEmail: string | null;
  slot: string;
  startedAt: number;
  step: CloudSignInRunning["step"];
  phase: ConnectPhase;
  phaseDetail: string | null;
  link: OwnPlanStatus | null;
}

export interface ClaudeCloudDelivery {
  rows: CloudAccountRow[] | null;
  /** Emails of the accounts a live Mac (Matrx 2's desktop courier) delivers through right now. */
  macEmails: ReadonlySet<string>;
  loadError: string | null;
  reload: () => void;
  running: Running | null;
  /** True while a remembered sign-in (from before a reload) is being checked. */
  resuming: boolean;
  failure: { forEmail: string | null; message: string } | null;
  capacity: SandboxCapacityRefusal | null;
  note: string | null;
  signingOut: string | null;
  start: (forEmail: string | null) => void;
  finish: (code: string) => void;
  cancel: () => void;
  signOut: (row: CloudAccountRow) => void;
  dismiss: () => void;
  /** Free capacity was made by stopping a box: run the interrupted sign-in again. */
  retryAfterStop: () => void;
}

export function useClaudeCloudDelivery(): ClaudeCloudDelivery {
  const [rows, setRows] = useState<CloudAccountRow[] | null>(null);
  const [macEmails, setMacEmails] = useState<ReadonlySet<string>>(() => new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState<Running | null>(null);
  const [failure, setFailure] = useState<{ forEmail: string | null; message: string } | null>(null);
  const [capacity, setCapacity] = useState<SandboxCapacityRefusal | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const rowsRef = useRef<CloudAccountRow[]>([]);
  const lastFor = useRef<string | null>(null);
  const raw = useSyncExternalStore(noSubscription, rememberedRaw, () => null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const resuming = raw !== null && !resumeChecked && running === null;

  const load = useCallback(
    () =>
      // The Mac couriers are a second, independent fact: a failed read leaves them as they were, said in the load error.
      Promise.all([
        readMacCouriers().then(setMacEmails, (cause: unknown) => setLoadError(getUserMessage(cause))),
        readCloudAccounts().then(
        (next) => {
          rowsRef.current = next;
          setLoadError(null);
          setRows(next);
        },
        (cause: unknown) => {
          setRows((kept) => kept ?? []);
          setLoadError(getUserMessage(cause));
        },
      ),
      ]).then(() => undefined),
    [],
  );
  const reload = useCallback(() => void load(), [load]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => () => abort.current?.abort(), []);

  const signedIn = (forEmail: string | null, status: OwnPlanStatus) => {
    remember(null);
    setRunning(null);
    const as = (status as { account_label?: unknown }).account_label;
    const other = signedInAsSomeoneElse(forEmail, typeof as === "string" ? as : null);
    setNote(other);
    toast.success(other ? "Claude account connected (a different one)" : "Messages now reach this account's cloud sessions");
    void load();
  };

  const run = async (forEmail: string | null, opts: { afterStop?: boolean; resume?: PendingConnect } = {}) => {
    const key = normalEmail(forEmail);
    const own = key ? cloudRowFor(key, rowsRef.current) : null;
    const taken = new Set(rowsRef.current.filter((r) => r.status === "connected").map((r) => r.slot));
    const slot = opts.resume?.slot ?? own?.slot ?? (taken.has(PRIMARY) ? newClaudeAccountSlot() : PRIMARY);
    const startedAt = opts.resume?.startedAt ?? Date.now();
    lastFor.current = forEmail;
    remember({ slot, startedAt, forEmail });
    setFailure(null);
    setCapacity(null);
    setNote(null);
    setRunning({ forEmail, slot, startedAt, step: "starting", phase: "sandbox", phaseDetail: null, link: null });
    const controller = new AbortController();
    abort.current = controller;
    try {
      if (opts.afterStop) await waitForFreeSlot(controller.signal);
      if (controller.signal.aborted) return;
      const outcome = await connectClaudeAccount(slot, controller.signal, (phase, detail) =>
        setRunning((r) => (r && r.slot === slot ? { ...r, phase, phaseDetail: detail } : r)),
      );
      if (abort.current !== controller) return;
      if (outcome.kind === "signed_in") signedIn(forEmail, outcome.status);
      else if (outcome.kind === "awaiting") {
        setRunning((r) => (r ? { ...r, step: "awaiting_code", phase: "link", link: outcome.status } : r));
      } else if (outcome.kind !== "cancelled") {
        remember(null);
        setRunning(null);
        setFailure({ forEmail, message: outcome.message });
      }
    } catch (cause) {
      if (abort.current !== controller) return;
      remember(null);
      setRunning(null);
      const full = capacityRefusalOf(cause);
      if (full) setCapacity(full);
      else setFailure({ forEmail, message: getUserMessage(cause) });
    } finally {
      if (abort.current === controller) abort.current = null;
    }
  };

  // A reload must not lose a sign-in in progress: ask the server where it stands.
  useEffect(() => {
    const kept = remembered();
    if (!kept) return;
    let current = true;
    readOwnPlanStatus(PROVIDER, kept.slot)
      .then((status) => {
        if (!current) return;
        setResumeChecked(true);
        const step = resumeStep(kept, status, Date.now());
        const forEmail = kept.forEmail ?? null;
        if (step.kind === "awaiting") {
          setRunning({ forEmail, slot: kept.slot, startedAt: kept.startedAt, step: "awaiting_code", phase: "link", phaseDetail: null, link: step.status });
        } else if (step.kind === "signed_in") {
          remember(null);
          void load();
        } else if (step.kind === "keep_starting") {
          void run(forEmail, { resume: kept });
        } else remember(null);
      })
      .catch((cause: unknown) => {
        if (!current) return;
        setResumeChecked(true);
        remember(null);
        setFailure({ forEmail: kept.forEmail ?? null, message: `Could not check the sign-in in progress: ${getUserMessage(cause)}` });
      });
    return () => {
      current = false;
    };
  }, []);

  const finish = async (code: string) => {
    const r = running;
    if (!r || !r.link || !code.trim()) return;
    setRunning({ ...r, step: "checking_code" });
    const controller = new AbortController();
    abort.current = controller;
    try {
      const outcome = await redeemClaudeCode(code, r.slot, controller.signal);
      if (abort.current !== controller) return;
      if (outcome.kind === "settled" && outcome.status.signed_in) signedIn(r.forEmail, outcome.status);
      else if (outcome.kind === "settled") setRunning({ ...r, step: "awaiting_code", link: outcome.status });
      else if (outcome.kind !== "cancelled") setRunning({ ...r, step: "awaiting_code", link: { ...r.link, detail: outcome.message } });
    } finally {
      if (abort.current === controller) abort.current = null;
    }
  };

  const cancel = async () => {
    const r = running;
    abort.current?.abort();
    abort.current = null;
    remember(null);
    if (!r) return;
    setRunning({ ...r, step: "cancelling" });
    try {
      await cancelOwnPlanSignIn(PROVIDER, r.slot);
    } catch (cause) {
      toast.error(getUserMessage(cause));
    } finally {
      setRunning(null);
    }
  };

  const signOut = async (row: CloudAccountRow) => {
    if (!row.slot) return;
    const ok = await confirm({
      title: `Stop delivering to ${row.label}?`,
      description: "Its Claude cloud sessions stop receiving messages until you sign it in again.",
      confirmLabel: "Stop delivering",
      variant: "destructive",
    });
    if (!ok) return;
    setSigningOut(row.id);
    try {
      await signOutOwnPlan(PROVIDER, row.slot);
      void load();
    } catch (cause) {
      toast.error(getUserMessage(cause));
    } finally {
      setSigningOut(null);
    }
  };

  return {
    rows,
    macEmails,
    loadError,
    reload,
    running,
    resuming,
    failure,
    capacity,
    note,
    signingOut,
    start: (forEmail) => void run(forEmail),
    finish: (code) => void finish(code),
    cancel: () => void cancel(),
    signOut: (row) => void signOut(row),
    dismiss: () => {
      setFailure(null);
      setNote(null);
      setCapacity(null);
    },
    retryAfterStop: () => void run(lastFor.current, { afterStop: true }),
  };
}

/** The sign-in counted every second while it runs. */
function useElapsed(since: number | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, [since]);
  return since === null ? null : formatDurationMs(Math.max(0, now - since));
}

const who = (email: string | null) => email ?? "a Claude account";

/** The one sign-in's panel: account, step, time, expectation, and a real end. */
export function ClaudeCloudSignIn({ cloud }: { cloud: ClaudeCloudDelivery }) {
  const [code, setCode] = useState("");
  const r = cloud.running;
  const elapsed = useElapsed(r && r.step === "starting" ? r.startedAt : null);

  if (cloud.resuming) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs" role="status">
        <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        <span className="truncate">Checking the Claude sign-in you started earlier…</span>
      </div>
    );
  }

  if (r?.step === "starting" || r?.step === "cancelling") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3" role="status" data-cloud-sign-in="starting">
        <span className="flex min-w-0 items-start gap-2 text-xs">
          <Loader2 aria-hidden className="mt-0.5 size-3.5 shrink-0 animate-spin text-muted-foreground" />
          <span className="min-w-0 space-y-0.5">
            <span className="block font-medium text-foreground">
              {r.step === "cancelling" ? `Canceling the sign-in for ${who(r.forEmail)}…` : `Connecting ${who(r.forEmail)} for cloud sessions`}
            </span>
            {r.step === "starting" ? (
              <>
                <span className="block text-foreground">
                  {phaseWords(r.phase)}
                  {elapsed ? ` · ${elapsed}` : ""}
                </span>
                <span className="block text-muted-foreground">
                  Claude&apos;s own sign-in runs in your cloud sandbox, so delivery works while your computer is off. {COLD_START_EXPECTATION}
                </span>
              </>
            ) : null}
          </span>
        </span>
        {r.step === "starting" ? (
          <Button variant="quiet" onClick={cloud.cancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    );
  }

  if (r && r.link) {
    const link = r.link;
    const at = claudeAnswerAt(link);
    return (
      <div className="space-y-2 rounded-lg border border-border p-3" data-cloud-sign-in="code">
        <p className="text-xs font-medium text-foreground">
          Sign in to Claude as {who(r.forEmail)}, then paste the code Claude shows
        </p>
        {link.sign_in_url ? (
          <Button asChild variant="outline">
            <OutboundLink href={link.sign_in_url}>
              <ExternalLink className="size-3.5" />
              Open Claude sign-in
            </OutboundLink>
          </Button>
        ) : null}
        <div className="flex items-center gap-2">
          {/* ui-exception: Claude's authorization code is a raw provider value */}
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste the code Claude shows" autoComplete="off" aria-label="Code from Claude" />
          <Button
            variant="primary"
            icon={r.step === "checking_code" ? <Loader2 className="animate-spin" /> : <KeyRound />}
            onClick={() => {
              const typed = code;
              setCode("");
              cloud.finish(typed);
            }}
            disabled={r.step !== "awaiting_code" || !code.trim()}
          >
            Finish
          </Button>
          <Button variant="quiet" aria-label="Cancel sign-in" onClick={cloud.cancel} icon={<X />} />
        </div>
        {link.detail ? (
          <p className="text-xs text-muted-foreground">
            {link.detail}
            {at ? <span className="whitespace-nowrap"> (Claude said this at {new Date(at).toLocaleTimeString()})</span> : null}
          </p>
        ) : null}
      </div>
    );
  }

  if (cloud.capacity) {
    return <SandboxCapacityList capacity={cloud.capacity} onStopped={() => cloud.retryAfterStop()} />;
  }

  if (cloud.failure) {
    const f = cloud.failure;
    return (
      <div className="space-y-2 rounded-lg border border-border p-3" role="alert" data-cloud-sign-in="failed">
        <ErrorNotice message={`Could not connect ${who(f.forEmail)}: ${f.message}`} size="inline" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => cloud.start(f.forEmail)}>
            Try again
          </Button>
          <Button variant="quiet" onClick={cloud.dismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  if (cloud.note) {
    return (
      <div className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 text-xs" role="status">
        <span>{cloud.note}</span>
        <Button variant="quiet" aria-label="Dismiss" onClick={cloud.dismiss} icon={<X />} />
      </div>
    );
  }
  return null;
}
