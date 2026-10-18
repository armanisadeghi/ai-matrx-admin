"use client";

/**
 * Claude accounts — the person's connected claude.ai accounts, any number.
 *
 * Each one is Claude Code's own sign-in, held in its own home inside the
 * person's Matrx Sandbox (`features/ai-work/lib/ownPlan.ts`, the same flow the
 * own-plan billing step uses), and listed from `users.integration_connections`
 * (provider `claude_ai`), which the server writes from the sandbox's answer.
 * The server's cloud courier uses these accounts to deliver agent mail into the
 * person's Claude cloud sessions, so connecting is the only step.
 *
 * The pasted code is component-local state only: never Redux, never storage,
 * never logged, and cleared the moment it is submitted.
 *
 * Behind "Use in Claude": how to add AI Matrx to Claude itself (claude.ai's own
 * connector settings, OAuth, once per Claude account) so cloud sessions can
 * send and read mail.
 */

import { Fact } from "@/features/ai-work/components/connections/Fact";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ExternalLink, Info, KeyRound, Loader2, LogOut, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Input } from "@ai-matrx/design-system/controls";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { CloudSetupDialog } from "@/features/ai-work/components/connections/CloudSetupDialog";
import { toast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { getUserMessage } from "@ai-matrx/api";
import { resolveBaseUrl } from "@/lib/python-client";
import { formatDurationMs } from "@ai-matrx/kit/format";
import { createClient } from "@/utils/supabase/client";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { operationFailed } from "@/utils/errors";
import { isJsonObject } from "@/types/json";
import {
  abortableSleep,
  connectClaudeAccount,
  redeemClaudeCode,
} from "@/features/ai-work/lib/connectClaudeAccount";
import {
  claudeAnswerAt,
  parsePendingConnect,
  PENDING_CONNECT_KEY,
  resumeStep,
  type PendingConnect,
} from "@/features/ai-work/lib/claudeConnectFlow";
import { SandboxCapacityList } from "@/features/ai-work/components/SandboxCapacityList";
import {
  cancelOwnPlanSignIn,
  capacityRefusalOf,
  readHostedCapacity,
  newClaudeAccountSlot,
  readOwnPlanStatus,
  signOutOwnPlan,
  type OwnPlanStatus,
  type SandboxCapacityRefusal,
  type SandboxOccupant,
} from "@/features/ai-work/lib/ownPlan";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

const PROVIDER = "claude_code" as const;


const SLOT_WAIT_MS = 90_000;

/** After a Stop: wait until the cap no longer refuses (the box has really stopped). */
async function waitForFreeSlot(signal: AbortSignal): Promise<void> {
  const deadline = Date.now() + SLOT_WAIT_MS;
  while (!signal.aborted && Date.now() < deadline) {
    try {
      if ((await readHostedCapacity()) === null) return;
    } catch {
      return; // not a verdict; let Connect itself give the honest answer
    }
    await abortableSleep(2_000, signal);
  }
}
const PRIMARY = "primary";
const CLAUDE_CONNECTORS_URL = "https://claude.ai/settings/connectors";

interface ClaudeAccountRow {
  id: string;
  label: string;
  status: string;
  slot: string | null;
}

async function readClaudeAccounts(): Promise<ClaudeAccountRow[]> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await getClaimsUser(supabase);
  if (authError) throw operationFailed("load your Claude accounts", authError);
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
  if (error) throw operationFailed("load your Claude accounts", error);
  return data.map((row) => {
    const slot = isJsonObject(row.metadata) ? row.metadata.account_slot : null;
    return {
      id: row.id,
      label: row.account_name ?? row.account_email ?? "Claude account",
      status: row.status,
      slot: typeof slot === "string" ? slot : null,
    };
  });
}

type Busy = "starting" | "code" | "cancel" | `out:${string}` | null;

/**
 * The sign-in in progress, remembered across a reload: only the account slot
 * and the start time (never the code). The sign-in itself lives on the server.
 */
function rememberConnect(pending: PendingConnect | null): void {
  try {
    if (pending) window.localStorage.setItem(PENDING_CONNECT_KEY, JSON.stringify(pending));
    else window.localStorage.removeItem(PENDING_CONNECT_KEY);
  } catch (cause) {
    console.error("[claude-accounts] could not remember the sign-in in progress", cause);
  }
}

function rememberedConnect(): PendingConnect | null {
  try {
    return parsePendingConnect(window.localStorage.getItem(PENDING_CONNECT_KEY));
  } catch {
    return null;
  }
}

const noSubscription = () => () => {};
function rememberedConnectRaw(): string | null {
  try {
    return window.localStorage.getItem(PENDING_CONNECT_KEY);
  } catch {
    return null;
  }
}

/** The sandbox wait, counted every second while it runs. */
function useElapsed(since: number | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, [since]);
  return since === null ? null : formatDurationMs(now - since);
}

export function ClaudeAccountsPanel() {
  const [rows, setRows] = useState<ClaudeAccountRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ slot: string; status: OwnPlanStatus } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [connectFailure, setConnectFailure] = useState<string | null>(null);
  const connectAbort = useRef<AbortController | null>(null);
  /** The account slot the running Connect is signing in, so Cancel can end it. */
  const connectSlot = useRef<string | null>(null);
  const [capacity, setCapacity] = useState<SandboxCapacityRefusal | null>(null);
  /** When the running Connect started (survives a reload through rememberConnect). */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const elapsed = useElapsed(busy === "starting" ? startedAt : null);
  // A remembered sign-in (read after hydration; the server render has none)
  // is being checked with the server until `resumeChecked`.
  const rememberedRaw = useSyncExternalStore(noSubscription, rememberedConnectRaw, () => null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const resuming = rememberedRaw !== null && !resumeChecked && busy === null && pending === null;
  const connectorUrl = `${resolveBaseUrl().replace(/\/$/, "")}/api/matrx-mcp`;

  const load = () =>
    readClaudeAccounts().then(
      (next) => {
        setLoadError(null);
        setRows(next);
      },
      (cause: unknown) => {
        setRows([]);
        setLoadError(getUserMessage(cause));
      },
    );
  const reload = () => {
    void load();
  };
  useEffect(() => {
    void load();
  }, []);
  // A Connect never outlives the panel: leaving the page ends its polling.
  useEffect(() => () => connectAbort.current?.abort(), []);

  const connect = async (opts: { afterStop?: boolean; resume?: PendingConnect } = {}) => {
    const taken = new Set((rows ?? []).filter((r) => r.status === "connected").map((r) => r.slot));
    const slot = opts.resume?.slot ?? (taken.has(PRIMARY) ? newClaudeAccountSlot() : PRIMARY);
    const since = opts.resume?.startedAt ?? Date.now();
    rememberConnect({ slot, startedAt: since });
    setStartedAt(since);
    setBusy("starting");
    setCapacity(null);
    setConnectFailure(null);
    const controller = new AbortController();
    connectAbort.current = controller;
    connectSlot.current = slot;
    try {
      if (opts.afterStop) await waitForFreeSlot(controller.signal);
      if (controller.signal.aborted) return;
      const outcome = await connectClaudeAccount(slot, controller.signal);
      if (outcome.kind === "signed_in") {
        rememberConnect(null);
        toast.success("Claude account connected");
        reload();
      } else if (outcome.kind === "awaiting") {
        setPending({ slot, status: outcome.status });
      } else if (
        outcome.kind === "failed" ||
        outcome.kind === "timeout" ||
        outcome.kind === "offline"
      ) {
        rememberConnect(null);
        setConnectFailure(outcome.message);
      }
    } catch (cause) {
      rememberConnect(null);
      const full = capacityRefusalOf(cause);
      if (full) setCapacity(full);
      else setConnectFailure(getUserMessage(cause));
    } finally {
      // Cancel took over (it owns `busy` now) when it detached this controller.
      if (connectAbort.current === controller) {
        connectAbort.current = null;
        connectSlot.current = null;
        setBusy(null);
      }
    }
  };

  // A reload (or a dev-server refresh) must not lose a sign-in in progress:
  // ask the server where the remembered one stands and resume that step.
  useEffect(() => {
    const remembered = rememberedConnect();
    if (!remembered) return;
    let current = true;
    readOwnPlanStatus(PROVIDER, remembered.slot)
      .then((status) => {
        if (!current) return;
        setResumeChecked(true);
        const step = resumeStep(remembered, status, Date.now());
        if (step.kind === "awaiting") {
          setStartedAt(remembered.startedAt);
          setPending({ slot: remembered.slot, status: step.status });
        } else if (step.kind === "signed_in") {
          rememberConnect(null);
          reload();
        } else if (step.kind === "keep_starting") {
          void connect({ resume: remembered });
        } else {
          rememberConnect(null);
        }
      })
      .catch((cause: unknown) => {
        if (!current) return;
        setResumeChecked(true);
        setConnectFailure(`Could not check the sign-in in progress: ${getUserMessage(cause)}`);
        rememberConnect(null);
      });
    return () => {
      current = false;
    };
  }, []);

  const finish = async () => {
    if (!pending || !code.trim()) return;
    const typed = code;
    const { slot, status: before } = pending;
    setCode("");
    setBusy("code");
    const controller = new AbortController();
    connectAbort.current = controller;
    try {
      const outcome = await redeemClaudeCode(typed, slot, controller.signal);
      if (outcome.kind === "settled" && outcome.status.signed_in) {
        rememberConnect(null);
        toast.success("Claude account connected");
        setPending(null);
        reload();
      } else if (outcome.kind === "settled") {
        setPending({ slot, status: outcome.status });
      } else if (outcome.kind !== "cancelled") {
        setPending({ slot, status: { ...before, detail: outcome.message } });
      }
    } finally {
      if (connectAbort.current === controller) {
        connectAbort.current = null;
        setBusy(null);
      }
    }
  };

  /**
   * Every wait is cancellable, and Cancel answers at once: the local wait
   * (starting, or a code Claude is checking) ends immediately and the panel
   * clears; ending the sign-in in the sandbox then runs behind "Cancelling…".
   */
  const cancel = async () => {
    const slot = pending?.slot ?? connectSlot.current;
    const running = connectAbort.current;
    connectAbort.current = null;
    connectSlot.current = null;
    running?.abort();
    rememberConnect(null);
    setPending(null);
    setCode("");
    if (!slot) {
      setBusy(null);
      return;
    }
    setBusy("cancel");
    try {
      await cancelOwnPlanSignIn(PROVIDER, slot);
    } catch (cause) {
      toast.error(getUserMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  const signOut = async (row: ClaudeAccountRow) => {
    if (!row.slot) return;
    const ok = await confirm({
      title: `Sign ${row.label} out?`,
      description: "Its Claude cloud sessions stop receiving messages until you connect it again.",
      confirmLabel: "Sign out",
      variant: "destructive",
    });
    if (!ok) return;
    setBusy(`out:${row.id}`);
    try {
      await signOutOwnPlan(PROVIDER, row.slot);
      reload();
    } catch (cause) {
      toast.error(getUserMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section id="claude-accounts" className="space-y-2">
      {busy === "starting" && (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
          role="status"
        >
          <span className="flex min-w-0 items-center gap-2 text-xs text-foreground">
            <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate">
                Starting your sandbox…{elapsed ? ` ${elapsed}` : ""}
              </span>
              <span className="block truncate text-muted-foreground">
                This can take a couple of minutes.
              </span>
            </span>
          </span>
          <Button variant="quiet" onClick={() => void cancel()}>
            Cancel
          </Button>
        </div>
      )}

      {resuming && (
        <div
          className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs text-foreground"
          role="status"
        >
          <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          <span className="truncate">Checking your sign-in in progress…</span>
        </div>
      )}

      {busy === "cancel" && (
        <div
          className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs text-foreground"
          role="status"
        >
          <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          <span className="truncate">Cancelling…</span>
        </div>
      )}

      {connectFailure && busy !== "starting" && (
        <div className="space-y-2 rounded-lg border border-border p-3" role="alert">
          <ErrorNotice message={connectFailure} size="inline" />
          <Button variant="outline" onClick={() => void connect()}>
            Try again
          </Button>
        </div>
      )}

      {capacity && busy !== "starting" && (
        <SandboxCapacityList
          capacity={capacity}
          disabled={busy !== null}
          onStopped={(o) => {
            setCapacity((current) =>
              current
                ? { ...current, occupants: current.occupants.filter((x) => x.row_id !== o.row_id) }
                : current,
            );
            return connect({ afterStop: true });
          }}
        />
      )}

      {pending && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {pending.status.sign_in_url ? (
            <Button asChild variant="outline">
              <OutboundLink href={pending.status.sign_in_url}>
                <ExternalLink className="size-3.5" />
                Sign in on Claude
              </OutboundLink>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{pending.status.detail}</p>
          )}
          <div className="flex items-center gap-2">
            {/* ui-exception: Claude's authorization code is a raw provider value */}
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste the code Claude shows"
              autoComplete="off"
              aria-label="Code from Claude"
            />
            <Button
              variant="primary"
              icon={busy === "code" ? <Loader2 className="animate-spin" /> : <KeyRound />}
              onClick={() => void finish()}
              disabled={busy !== null || !code.trim()}
            >
              Finish
            </Button>
            <Button
              variant="quiet"
              aria-label="Cancel sign-in"
              onClick={() => void cancel()}
              disabled={busy !== null && busy !== "code"}
              icon={<X />}
            />
          </div>
          {pending.status.detail && pending.status.sign_in_url && (
            <p className="text-xs text-muted-foreground">
              {pending.status.detail}
              {claudeAnswerAt(pending.status) && (
                <>
                  {" "}
                  <span className="whitespace-nowrap">
                    (Claude said this at{" "}
                    {new Date(claudeAnswerAt(pending.status) as string).toLocaleTimeString()})
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      )}

      <MatrxDataTable<ClaudeAccountRow>
        tableId="work/connections/claude-cloud"
        data={rows ?? []}
        columns={CLAUDE_COLUMNS}
        getRowId={(row) => row.id}
        pageSize={0}
        density="condensed"
        viewTabs={false}
        selection={false}
        defaultSort={{ id: "account", direction: "asc" }}
        toolbar={{
          title: "Claude cloud accounts",
          searchPlaceholder: "Search Claude accounts",
          refresh: { onRefresh: reload, label: "Read Claude accounts again" },
          actions: (
            <>
              <Button variant="quiet" onClick={() => setSetupOpen(true)}>
                Use in Claude
              </Button>
              <Button
                variant="outline"
                icon={<Plus />}
                onClick={() => void connect()}
                disabled={busy !== null || pending !== null || resuming}
                title="Sign in to a Claude account so messages reach your Claude cloud sessions"
              >
                Connect
              </Button>
            </>
          ),
        }}
        rowActions={(row, controls) => [
          {
            id: "sign-out",
            icon: LogOut,
            label: row.status !== "connected" ? "Sign out (already signed out)" : !row.slot ? "Sign out (this account has no sandbox sign-in)" : `Sign ${row.label} out`,
            onClick: () => void signOut(row),
            disabled: busy !== null || row.status !== "connected" || !row.slot,
            loading: busy === `out:${row.id}`,
          },
          { id: "info", icon: Info, label: `Everything about ${row.label}`, onClick: controls.openDetail },
        ]}
        detail={{
          title: (row) => row.label,
          description: () => "Claude cloud account",
          render: (row) => (
            <div className="space-y-3 p-1">
              <Fact label="Account" value={row.label} />
              <Fact label="Status" value={row.status === "connected" ? "Connected" : "Signed out"} />
              <Fact label="Sandbox sign-in" value={row.slot} mono empty="None" />
              <Fact label="Connection id" value={row.id} mono />
              <Fact label="Used for" value="Delivering messages to your Claude cloud sessions" />
            </div>
          ),
        }}
        isLoading={rows === null}
        read={{ status: rows === null ? "loading" : loadError ? "error" : "ready", error: loadError ?? undefined, onRetry: reload, what: "your Claude accounts" }}
        emptyState={{ title: "No Claude account connected" }}
      />

      <CloudSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        title="Use AI Matrx in Claude cloud sessions"
        description="Once per Claude account, so its cloud sessions can send and read mail."
        steps={["Open Claude connectors, signed in to each Claude account.", "Add custom connector, paste the address below, then Connect."]}
        url={connectorUrl}
        what="connector URL"
        link={{ href: CLAUDE_CONNECTORS_URL, label: "Open Claude connectors" }}
      />
    </section>
  );
}

const CLAUDE_COLUMNS: MatrxColumnDef<ClaudeAccountRow>[] = [
  { id: "account", header: "Account", accessorFn: (row) => row.label, filter: "text", width: 280 },
  { id: "status", header: "Status", accessorFn: (row) => (row.status === "connected" ? "Connected" : "Signed out"), filter: "select", width: 140 },
];
