"use client";

/**
 * "Coding apps" on /work/connections — the same two tables as Matrx 2's Code › Desktop apps:
 * INSTANCES (one copy of a coding app with its own data folder, the main instance first) and
 * ACCOUNTS (one sign-in at the provider). The rows are the computer's own answer, read over the
 * relay with the device console's client (`apps.instances.list`, `apps.accounts.list`,
 * `apps.chats.list`); the row actions are the same ops Matrx 2 runs (`apps.windows.*`). Every rule
 * (status words, Next order, resets) is the desktop's, mirrored in `lib/codingApps.ts`.
 *
 * Table rules (owner, 2026-10-15): one fact per column, every column sorts and filters, row
 * actions are icons that are always there and dimmed when they can't act, and everything else
 * about a row is in its details panel.
 */

import { Fact } from "@/features/ai-work/components/connections/Fact";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Gauge, Info, Monitor, RotateCw } from "lucide-react";
import { getClaimsUser } from "@ai-matrx/auth";
import { isDesktopProtocolError, type AppAccount, type AppInstance } from "@ai-matrx/desktop-protocol";
import type { DesktopClient } from "@ai-matrx/desktop-protocol/client";
import { useDesktopAction, useDesktopRequest, type DesktopActionState } from "@ai-matrx/desktop-protocol/react";
import { ErrorNotice, Progress, StatusDot } from "@ai-matrx/design-system";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, Select, Tabs } from "@ai-matrx/design-system/controls";
import { MatrxDataTable, type MatrxColumnDef, type MatrxTableIconAction } from "@ai-matrx/design-system/data-table";

import { supabase } from "@/utils/supabase/client";
import { useNow } from "@/hooks/useNow";
import { getAccessTokenOrNull } from "@/lib/python-client";
import { useDeviceClient } from "@/features/files/devices/console/useDeviceClient";
import { listChooserComputers, type ChooserComputer } from "@/features/ai-work/lib/computerChooser";
import {
  APP_KEYS,
  ASKS_USAGE,
  READS_ACCOUNTS,
  READS_CHATS,
  accountName,
  acctKey,
  appLabel,
  appOrder,
  availability,
  awayCount,
  chatCount,
  compareNext,
  instKey,
  instanceAccount,
  nextRanks,
  nextWord,
  pct,
  statusWords,
  untilWords,
  updatedWords,
  type AppChats,
} from "@/features/ai-work/lib/codingApps";

/** How often the open page asks the computer again (the computer answers from its last reading). */
const POLL_MS = 30_000;
/** A fresh reading of every list can take a minute on a busy computer. */
// internal-bound: how long Refresh waits for every list to be read again before it gives up
const FRESH_TIMEOUT_MS = 180_000;
/** A reading older than this is drawn secondary in Read (Matrx 2's default knob value). */
const STALE_MIN = 30;

type AppFilter = "all" | (typeof APP_KEYS)[number];

type ComputersRead =
  | { state: "loading" }
  | { state: "ready"; computers: ChooserComputer[] }
  | { state: "failed"; reason: string };

/** The section: which computer, then its two tables. */
export function CodingAppsSection() {
  const [list, setList] = useState<ComputersRead>({ state: "loading" });
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const token = await getAccessTokenOrNull();
      const {
        data: { user },
      } = await getClaimsUser(supabase);
      if (!token || !user?.id) {
        if (alive) setList({ state: "failed", reason: "Sign in to see your computers" });
        return;
      }
      try {
        const computers = await listChooserComputers(supabase, user.id, token);
        if (alive) setList({ state: "ready", computers });
      } catch (error) {
        if (alive) setList({ state: "failed", reason: `Couldn't read your computers: ${error instanceof Error ? error.message : String(error)}` });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const computers = list.state === "ready" ? list.computers : [];
  const online = computers.filter((c) => c.selectable);
  const current = online.find((c) => c.device.id === chosen) ?? online[0] ?? null;

  const picker =
    online.length > 1 && current ? (
      <Select
        aria-label="Computer"
        icon={<Monitor />}
        value={current.device.id}
        options={online.map((c) => ({ value: c.device.id, label: c.name }))}
        onValueChange={setChosen}
      />
    ) : null;

  if (current) return <ConnectedApps key={current.device.id} computer={current} picker={picker} />;

  const why =
    list.state === "loading"
      ? null
      : list.state === "failed"
        ? list.reason
        : computers.length === 0
          ? "No Matrx 2 computer is linked to your account"
          : computers.length === 1
            ? `${computers[0]!.name}: ${computers[0]!.reason ?? "not reachable"}`
            : `None of your ${computers.length} computers is online`;
  return (
    <AppsTables
      computerName={null}
      instances={[]}
      accounts={[]}
      chats={new Map()}
      reading={list.state === "loading"}
      readError={null}
      where={why}
      problem={null}
      asOfMs={null}
      refreshing={false}
      client={null}
      action={null}
      onRefresh={null}
      onDone={() => undefined}
      picker={
        computers.length ? (
          <Button asChild variant="quiet">
            <Link href="/devices">Your computers</Link>
          </Button>
        ) : null
      }
    />
  );
}

/** One app's three reads over the open connection; off for an app the computer doesn't read. */
function useAppReads(client: DesktopClient, live: boolean, app: string) {
  const instances = useDesktopRequest("apps.instances.list", { app_key: app }, { client, enabled: live, refreshMs: POLL_MS });
  const accounts = useDesktopRequest("apps.accounts.list", { app_key: app }, { client, enabled: live && READS_ACCOUNTS.has(app), refreshMs: POLL_MS });
  const chats = useDesktopRequest("apps.chats.list", { app_key: app }, { client, enabled: live && READS_CHATS.has(app) });
  return { app, instances, accounts, chats };
}

function ConnectedApps({ computer, picker }: { computer: ChooserComputer; picker: React.ReactNode }) {
  const { client, state, status } = useDeviceClient(computer.device.id);
  const nowMs = useNow();
  const live = state.status === "open";
  const reads = [
    useAppReads(client, live, "claude"),
    useAppReads(client, live, "codex"),
    useAppReads(client, live, "cursor"),
    useAppReads(client, live, "vscode"),
    useAppReads(client, live, "antigravity"),
  ];
  const instances = reads.flatMap((r) => r.instances.data?.instances ?? []);
  const accounts = reads.flatMap((r) => r.accounts.data?.accounts ?? []);
  const chats = new Map<string, AppChats>();
  for (const r of reads) if (r.chats.data) chats.set(r.app, r.chats.data);
  const results = reads.flatMap((r) => [r.instances.data, READS_ACCOUNTS.has(r.app) ? r.accounts.data : undefined]).filter((d): d is NonNullable<typeof d> => d !== undefined);
  const asOfMs = results.length ? Math.min(...results.map((d) => d.as_of_ms ?? nowMs)) : null;
  const refreshing = results.some((d) => d.refreshing === true);
  const firstError = reads.map((r) => r.instances.error ?? (READS_ACCOUNTS.has(r.app) ? r.accounts.error : undefined)).find(Boolean);
  const readsDone = reads.every((r) => r.instances.data !== undefined || r.instances.error !== undefined);
  const problems = [...new Set(reads.flatMap((r) => [r.instances.data?.problem, r.accounts.data?.problem]).filter((p): p is string => Boolean(p)))];

  const action = useDesktopAction({ client, onDone: () => refetch() });
  const refetch = () => {
    for (const r of reads) {
      void r.instances.refetch();
      if (READS_ACCOUNTS.has(r.app)) void r.accounts.refetch();
    }
  };
  const refreshAll = () =>
    Promise.all(
      reads.flatMap((r) => [
        client.request("apps.instances.list", { app_key: r.app, fresh: true }, { timeoutMs: FRESH_TIMEOUT_MS }),
        ...(READS_ACCOUNTS.has(r.app) ? [client.request("apps.accounts.list", { app_key: r.app, fresh: true }, { timeoutMs: FRESH_TIMEOUT_MS })] : []),
        ...(READS_CHATS.has(r.app) ? [r.chats.refetch()] : []),
      ]),
    ).then(refetch);

  const where = live || status.pill === "live" ? null : `${computer.name}: ${status.detail ?? status.label}`;
  const problem = !live
    ? null
    : firstError && !instances.length
      ? `${computer.name} answered: ${firstError.message}`
      : problems.length
        ? `Some figures may be out of date: ${problems.join(" · ")}`
        : null;

  return (
    <AppsTables
      computerName={computer.name}
      instances={instances}
      accounts={accounts}
      chats={chats}
      reading={!live ? status.pill === "reconnecting" : !readsDone}
      readError={live && firstError && !instances.length ? firstError.message : null}
      where={where}
      problem={problem}
      asOfMs={asOfMs}
      refreshing={refreshing}
      client={live ? client : null}
      action={action}
      onRefresh={refreshAll}
      onDone={refetch}
      picker={picker}
    />
  );
}

export interface AppsTablesProps {
  computerName: string | null;
  instances: AppInstance[];
  accounts: AppAccount[];
  chats: Map<string, AppChats>;
  reading: boolean;
  /** The instances read itself failed (the tables say so instead of "nothing found"). */
  readError: string | null;
  /** Why no computer answers, said plainly (not an error: the computer is off or asleep). */
  where: string | null;
  problem: string | null;
  asOfMs: number | null;
  refreshing: boolean;
  /** The open connection; null when no computer answers (every action is dimmed). */
  client: DesktopClient | null;
  /** The connection's one action runner (busy flag and last error); null with no connection. */
  action: DesktopActionState | null;
  onRefresh: (() => Promise<unknown>) | null;
  onDone: () => void;
  picker: React.ReactNode;
}

function ToneWord({ tone, word, label }: { tone: "success" | "neutral" | "danger" | "warning"; word: string; label?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <StatusDot tone={tone} label={label ?? word} />
      <span className="truncate">{word}</span>
    </span>
  );
}

/** A use figure: a fixed bar and the percent; a 0 only inferred from a reset is drawn secondary and says so. */
function Usage({ v, label, resetSince = false }: { v: number | null; label: string; resetSince?: boolean }) {
  if (v === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={resetSince ? `${label}: it has reset since the newest reading` : undefined}>
      <Progress value={Math.max(0, Math.min(100, v))} aria-label={label} className="h-1.5 w-8 shrink-0" />
      <span className={resetSince ? "text-muted-foreground" : undefined}>{pct(v)}</span>
    </span>
  );
}

const time = (ms: number | null) => (ms ? new Date(ms).toLocaleString() : null);
const ago = (ms: number | null, now: number) => (ms ? updatedWords(ms, now).replace(/^Updated /, "") : "—");
const count = (n: number) => (n < 0 ? "—" : String(n));

/** Exported for the render test (`__tests__/coding-apps-tables.test.tsx`). */
export function AppsTables(p: AppsTablesProps) {
  const [app, setApp] = useState<AppFilter>("all");
  const [note, setNote] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<AppInstance | null>(null);
  const action = p.action;
  const [refreshBusy, setRefreshBusy] = useState(false);
  const now = useNow();
  const busy = (action?.busy ?? false) || refreshBusy;
  const off = p.client === null || action === null;

  const byId = new Map(p.accounts.map((a) => [acctKey(a), a]));
  const accountOf = (i: AppInstance) => (i.account_id ? byId.get(`${i.app_key}:${i.account_id}`) : undefined);
  const ranks = nextRanks(p.accounts);
  const nextOrder = new Map([...p.accounts].sort(compareNext).map((a, n) => [acctKey(a), n]));
  const stale = (a: AppAccount) => a.read_at_ms !== null && now - a.read_at_ms > STALE_MIN * 60_000;
  const chatsOf = (i: AppInstance) => (READS_CHATS.has(i.app_key) ? chatCount(p.chats.get(i.app_key), i.key) : -1);
  const awayOf = (i: AppInstance) => (READS_CHATS.has(i.app_key) ? awayCount(p.chats.get(i.app_key), i.key) : -1);
  const openOf = (i: AppInstance) => (READS_CHATS.has(i.app_key) ? i.open_chats : -1);

  const say = (r: Promise<{ message: string }>) => r.then((x) => setNote(x.message));
  const open = (i: AppInstance) => void action?.run((c) => say(c.request("apps.windows.open", { app_key: i.app_key, window: i.key })));
  const restart = (i: AppInstance, force: boolean) =>
    void action?.run(async (c) => {
      try {
        await say(c.request("apps.windows.restart", { app_key: i.app_key, window: i.key, force }));
      } catch (error) {
        if (!force && isDesktopProtocolError(error) && error.code === "CONFLICT") setRestarting(i);
        else throw error;
      }
    });
  const askRestart = (i: AppInstance) => (i.open_chats ? setRestarting(i) : restart(i, false));
  const refreshUsage = (i: AppInstance) => void action?.run((c) => say(c.request("apps.windows.refresh_usage", { app_key: i.app_key, window: i.key })));

  const readerOf = (a: AppAccount): AppInstance | null => {
    const mine = p.instances.filter((i) => i.app_key === a.app_key && i.account_id === a.account_id && i.folder_exists);
    return mine.find((i) => i.running && !i.main) ?? mine.find((i) => !i.main) ?? mine[0] ?? null;
  };
  const canOpen = (i: AppInstance) => (i.folder_exists || (i.app_key === "claude" && i.first_launch_ms === null)) && (READS_CHATS.has(i.app_key) || i.main);
  const restartWhy = (i: AppInstance) => (i.app_key !== "claude" ? "Restart is Claude's for now" : !i.running ? "Only while it is open" : null);
  const usageWhy = (appKey: string, i: AppInstance | null) => (!ASKS_USAGE.has(appKey) ? "this app records usage only while a chat runs" : !i ? "no instance is signed into it" : !i.folder_exists ? "its folder is missing" : null);
  const offWhy = "No computer is connected";

  const instActions = (i: AppInstance, openDetail: () => void): MatrxTableIconAction[] => [
    { id: "open", icon: Monitor, label: off ? `Open (${offWhy})` : i.running ? `Bring ${i.key} to the front` : `Open ${i.key}`, onClick: () => open(i), disabled: off || busy || !canOpen(i) },
    { id: "restart", icon: RotateCw, label: off ? `Restart (${offWhy})` : restartWhy(i) ? `Restart (${restartWhy(i)})` : `Restart ${i.key}…`, onClick: () => askRestart(i), disabled: off || busy || restartWhy(i) !== null },
    { id: "usage", icon: Gauge, label: off ? `Read usage (${offWhy})` : usageWhy(i.app_key, i) ? `Read usage (${usageWhy(i.app_key, i)})` : `Read ${i.key}'s usage now`, onClick: () => refreshUsage(i), disabled: off || busy || usageWhy(i.app_key, i) !== null },
    { id: "info", icon: Info, label: `Everything about ${i.key}`, onClick: openDetail },
  ];
  const acctActions = (a: AppAccount, openDetail: () => void): MatrxTableIconAction[] => {
    const r = readerOf(a);
    const why = usageWhy(a.app_key, r);
    return [
      { id: "open", icon: Monitor, label: off ? `Open (${offWhy})` : r ? (r.running ? `Bring ${r.key} to the front` : `Open ${r.key}, where it is signed in`) : "Open (no instance is signed into it)", onClick: () => r && open(r), disabled: off || busy || !r || !canOpen(r) },
      { id: "usage", icon: Gauge, label: off ? `Read usage (${offWhy})` : why ? `Read usage (${why})` : `Read its usage now in ${r?.key ?? ""}`, onClick: () => r && refreshUsage(r), disabled: off || busy || why !== null },
      { id: "info", icon: Info, label: `Everything about ${accountName(a)}`, onClick: openDetail },
    ];
  };

  const appOk = (k: string) => app === "all" || k === app;
  const shownInstances = p.instances.filter((i) => appOk(i.app_key));
  const shownAccounts = p.accounts.filter((a) => appOk(a.app_key));
  const multi = app === "all";
  // A column no app shown can fill is left out (an app that keeps no usage shows no usage columns).
  const usageShown = multi ? p.accounts.some((a) => a.read_at_ms !== null) || p.instances.some((i) => READS_ACCOUNTS.has(i.app_key)) : READS_ACCOUNTS.has(app);
  const chatsShown = multi || READS_CHATS.has(app);
  const accountsShown = multi || READS_ACCOUNTS.has(app);
  const extraShown = multi || app === "claude";
  const creditsShown = multi || app === "codex";

  const appColumn = <T extends { app_key: string }>(): MatrxColumnDef<T> => ({
    id: "app",
    header: "App",
    accessorFn: (r) => appLabel(r.app_key),
    sortValue: (r) => appOrder(r.app_key),
    filter: "select",
    width: 110,
  });

  const instColumns: MatrxColumnDef<AppInstance>[] = [
    ...(multi ? [appColumn<AppInstance>()] : []),
    { id: "instance", header: "Instance", accessorFn: (i) => (i.main ? `${i.key} (main)` : i.key), sortValue: (i) => `${i.main ? 0 : 1}${i.key.toLowerCase()}`, filter: "text", width: 170, cell: (i) => <span className="truncate font-medium">{i.key}</span> },
    { id: "status", header: "Status", accessorFn: (i) => statusWords(i).word, sortValue: (i) => statusWords(i).order, filter: "select", width: 140, cell: (i) => <ToneWord {...statusWords(i)} /> },
    { id: "account", header: "Account", accessorFn: (i) => instanceAccount(i) ?? "", filter: "text", width: 220, cell: (i) => <span className={`truncate ${i.account ? "" : "text-muted-foreground"}`} title={instanceAccount(i) ?? undefined}>{instanceAccount(i) ?? "—"}</span> },
    { id: "meant_for", header: "Kept for", accessorFn: (i) => i.meant_for ?? "", filter: "text", width: 200, hidden: true },
    { id: "version", header: "Version", accessorFn: (i) => i.version ?? "", filter: "text", width: 120, cell: (i) => <span className={i.version && i.version !== i.installed_version ? "text-muted-foreground" : undefined} title={i.version && i.version !== i.installed_version ? `Installed: ${i.installed_version ?? "—"}` : undefined}>{i.version ?? "—"}</span> },
    ...(usageShown ? ([{ id: "weekly", header: "Weekly", accessorFn: (i) => accountOf(i)?.weekly ?? null, filter: "number", width: 100, cell: (i) => <Usage v={accountOf(i)?.weekly ?? null} resetSince={accountOf(i)?.weekly_reset_since ?? false} label="Weekly use" /> }] satisfies MatrxColumnDef<AppInstance>[]) : []),
    ...(chatsShown
      ? ([
          { id: "chats", header: "Chats", accessorFn: (i) => chatsOf(i), filter: "number", width: 80, align: "right", cell: (i) => count(chatsOf(i)) },
          { id: "open_chats", header: "Open", accessorFn: (i) => openOf(i), filter: "number", width: 76, align: "right", cell: (i) => count(openOf(i)) },
          { id: "away", header: "Away", accessorFn: (i) => awayOf(i), filter: "number", width: 76, align: "right", cell: (i) => count(awayOf(i)) },
        ] satisfies MatrxColumnDef<AppInstance>[])
      : []),
    { id: "launched", header: "Launched", accessorFn: (i) => (i.launched_ms ? new Date(i.launched_ms).toISOString() : null), sortValue: (i) => i.launched_ms ?? -1, filter: "date", width: 120, cell: (i) => <span className="text-muted-foreground">{ago(i.launched_ms, now)}</span> },
  ];

  const acctColumns: MatrxColumnDef<AppAccount>[] = [
    { id: "next", header: "Next", accessorFn: (a) => nextWord(a, ranks).word, sortValue: (a) => nextOrder.get(acctKey(a)) ?? 0, filter: "select", width: 84, cell: (a) => <ToneWord {...nextWord(a, ranks)} /> },
    ...(multi ? [appColumn<AppAccount>()] : []),
    { id: "account", header: "Account", accessorFn: (a) => accountName(a), filter: "text", width: 240, cell: (a) => <span className={`truncate ${a.email ? "" : "text-muted-foreground"}`} title={accountName(a)}>{accountName(a)}</span> },
    { id: "weekly", header: "Weekly", accessorFn: (a) => a.weekly, filter: "number", width: 100, cell: (a) => <Usage v={a.weekly} resetSince={a.weekly_reset_since} label="Weekly use" /> },
    {
      id: "weekly_resets",
      header: "Week resets",
      accessorFn: (a) => (a.weekly_resets_at_ms ? new Date(a.weekly_resets_at_ms).toISOString() : null),
      sortValue: (a) => a.weekly_resets_at_ms ?? Number.POSITIVE_INFINITY,
      filter: "date",
      width: 120,
      cell: (a) =>
        a.weekly_resets_at_ms ? (
          <span className={a.weekly_reset_source === "your_list" ? "text-muted-foreground" : undefined} title={`${time(a.weekly_resets_at_ms)}${a.weekly_reset_source === "your_list" ? " · from your list, not confirmed by the app yet" : ""}`}>
            {untilWords(a.weekly_resets_at_ms, now)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { id: "five_hour", header: "5-hour", accessorFn: (a) => a.five_hour, filter: "number", width: 100, cell: (a) => <Usage v={a.five_hour} resetSince={a.five_hour_reset_since} label="5-hour use" /> },
    {
      id: "five_resets",
      header: "5-hour resets",
      accessorFn: (a) => (a.five_hour_resets_at_ms ? new Date(a.five_hour_resets_at_ms).toISOString() : null),
      sortValue: (a) => a.five_hour_resets_at_ms ?? Number.POSITIVE_INFINITY,
      filter: "date",
      width: 120,
      cell: (a) => <span className="text-muted-foreground">{a.five_hour_resets_at_ms ? new Date(a.five_hour_resets_at_ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</span>,
    },
    ...(extraShown ? ([{ id: "extra", header: "Extra", accessorFn: (a) => a.extra_usage, filter: "number", width: 80, align: "right", cell: (a) => (a.extra_usage === null ? "—" : `${Math.round(a.extra_usage)}%`) }] satisfies MatrxColumnDef<AppAccount>[]) : []),
    ...(creditsShown ? ([{ id: "credits", header: "Credits", accessorFn: (a) => a.credits, filter: "number", width: 84, align: "right", cell: (a) => (a.credits === null ? "—" : a.credits.toFixed(2)) }] satisfies MatrxColumnDef<AppAccount>[]) : []),
    {
      id: "read",
      header: "Read",
      accessorFn: (a) => (a.read_at_ms ? new Date(a.read_at_ms).toISOString() : null),
      sortValue: (a) => -(a.read_at_ms ?? -1),
      filter: "date",
      width: 110,
      cell: (a) => (
        <span className={a.read_at_ms === null || stale(a) ? "text-muted-foreground" : undefined} title={a.read_at_ms ? `Read ${time(a.read_at_ms)} in ${a.read_in ?? "an instance"}${stale(a) ? ` · older than ${STALE_MIN} minutes` : ""}` : "Never read"}>
          {a.read_at_ms ? ago(a.read_at_ms, now) : "Never"}
        </span>
      ),
    },
    { id: "instances", header: "Instances", accessorFn: (a) => a.instances.length, filter: "number", width: 96, align: "right" },
  ];

  const tabCount = (k: string) => p.instances.filter((i) => i.app_key === k).length;
  const updated = p.client ? (p.refreshing || refreshBusy ? "Reading…" : updatedWords(p.asOfMs, now)) : null;

  return (
    <section aria-label="Coding apps" className="space-y-3" data-coding-apps>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Coding apps</h2>
          {p.computerName ? <span className="truncate text-xs text-muted-foreground">on {p.computerName}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {p.picker}
          {updated ? <span className="text-xs text-muted-foreground" data-coding-apps-updated>{updated}</span> : null}
          <Button
            variant="quiet"
            icon={<RotateCw className={refreshBusy ? "animate-spin" : undefined} />}
            aria-label={p.onRefresh ? "Read every app again now" : "Read again (no computer is connected)"}
            title={p.onRefresh ? "Read every app again now" : "No computer is connected"}
            disabled={!p.onRefresh || busy}
            onClick={() => {
              if (!p.onRefresh) return;
              setRefreshBusy(true);
              void p.onRefresh().finally(() => setRefreshBusy(false));
            }}
          />
        </div>
      </div>

      <Tabs
        variant="capsule"
        aria-label="App"
        value={app}
        onValueChange={setApp}
        data={[{ value: "all" as AppFilter, label: "All apps", count: p.instances.length }, ...APP_KEYS.map((k) => ({ value: k as AppFilter, label: appLabel(k), count: tabCount(k) }))]}
      />

      {p.where ? <p className="text-xs text-muted-foreground" role="status" data-coding-apps-offline>{p.where}</p> : null}
      {p.problem ? <ErrorNotice message={p.problem} size="inline" /> : null}
      {action?.error ? <ErrorNotice message={action.error.message} size="inline" /> : null}
      {note ? <p className="text-xs text-muted-foreground" role="status">{note}</p> : null}

      <MatrxDataTable<AppInstance>
        tableId="work/connections/instances"
        data={shownInstances}
        columns={instColumns}
        getRowId={instKey}
        pageSize={0}
        density="condensed"
        viewTabs={false}
        selection={false}
        defaultSort={{ id: multi ? "app" : "instance", direction: "asc" }}
        toolbar={{ title: "Instances", searchPlaceholder: "Search instances" }}
        rowActions={(i, controls) => instActions(i, controls.openDetail)}
        detail={{ title: (i) => i.key, description: (i) => `${appLabel(i.app_key)} · ${i.main ? "the main instance: the app's own folder" : "an instance: the same install, started with its own folder"}`, render: (i) => <InstanceDetail i={i} account={accountOf(i) ?? null} chats={chatsOf(i)} away={awayOf(i)} now={now} /> }}
        isLoading={p.reading && !p.instances.length}
        read={{ status: p.readError ? "error" : p.reading && !p.instances.length ? "loading" : "ready", error: p.readError ?? undefined, onRetry: p.onDone, what: "this computer's instances" }}
        emptyState={{ title: p.client ? (p.instances.length ? "No instances match" : "No coding apps found on this computer") : "No computer connected", description: p.client ? undefined : "Open Matrx 2 on your computer to see its coding apps here" }}
      />

      {accountsShown ? (
        <MatrxDataTable<AppAccount>
          tableId="work/connections/accounts"
          data={shownAccounts}
          columns={acctColumns}
          getRowId={acctKey}
          pageSize={0}
          density="condensed"
          viewTabs={false}
          selection={false}
          defaultSort={{ id: "next", direction: "asc" }}
          toolbar={{ title: "Accounts", searchPlaceholder: "Search accounts" }}
          rowActions={(a, controls) => acctActions(a, controls.openDetail)}
          detail={{ title: (a) => accountName(a), description: (a) => `${appLabel(a.app_key)} · ${availability(a) === "available" ? `available, use ${ranks.get(acctKey(a)) === 1 ? "first" : `#${ranks.get(acctKey(a)) ?? ""}`}` : availability(a) === "unknown" ? "no usage reading yet" : "at its limit"}`, render: (a) => <AccountDetail a={a} stale={stale(a)} now={now} /> }}
          isLoading={p.reading && !p.accounts.length}
          read={{ status: p.readError ? "error" : p.reading && !p.accounts.length ? "loading" : "ready", error: p.readError ?? undefined, onRetry: p.onDone, what: "this computer's accounts" }}
          emptyState={{ title: p.client ? (p.accounts.length ? "No accounts match" : "No accounts seen yet") : "No computer connected" }}
        />
      ) : null}

      <ConfirmDialog
        open={restarting !== null}
        onOpenChange={(o) => (o ? undefined : setRestarting(null))}
        title={`Restart ${restarting?.key ?? ""}?`}
        description={restarting ? `${restarting.open_chats || "Some"} chat${restarting.open_chats === 1 ? " is" : "s are"} open in it. Restarting stops them; the conversations are safe.` : undefined}
        confirmLabel="Restart anyway"
        variant="destructive"
        onConfirm={() => {
          if (restarting) restart(restarting, true);
          setRestarting(null);
        }}
      />
    </section>
  );
}

/** Every fact about one instance (nothing kept from the person). */
function InstanceDetail({ i, account, chats, away, now }: { i: AppInstance; account: AppAccount | null; chats: number; away: number; now: number }) {
  const at = (ms: number | null) => (ms ? `${time(ms)} (${ago(ms, now)})` : null);
  return (
    <div className="space-y-3 p-1">
      <Fact label="Status" value={statusWords(i).word} />
      <Fact label="Signed in as" value={instanceAccount(i)} empty="Not recorded" />
      <Fact label="Account id" value={i.account_id} mono empty="—" />
      <Fact label="Kept for" value={i.meant_for ?? (i.main ? "Any account" : null)} empty="—" />
      <Fact label="Weekly (its account)" value={account?.weekly === null || account?.weekly === undefined ? null : pct(account.weekly)} empty="—" />
      <Fact label="Version running" value={i.version} empty="Not recorded by this app" />
      <Fact label="Version installed" value={i.installed_version} empty="—" />
      <Fact label="Process" value={i.pid ? String(i.pid) : "Not running"} />
      <Fact label="Launched" value={at(i.launched_ms)} empty="—" />
      <Fact label="Last quit" value={at(i.quit_ms)} empty="—" />
      <Fact label="First launched" value={at(i.first_launch_ms)} empty="—" />
      <Fact label="Folder" value={i.folder} mono empty="—" />
      <Fact label="Folder exists" value={i.folder_exists ? "Yes" : "No"} />
      {READS_CHATS.has(i.app_key) ? (
        <>
          <Fact label="Chats" value={chats < 0 ? "Still being read" : String(chats)} />
          <Fact label="Open now" value={String(i.open_chats)} />
          <Fact label="Moved away" value={away < 0 ? null : String(away)} empty="—" />
        </>
      ) : null}
    </div>
  );
}

/** Every fact about one account: who it is, its newest reading, where and when it was read, what is missing. */
function AccountDetail({ a, stale, now }: { a: AppAccount; stale: boolean; now: number }) {
  const at = (ms: number | null) => (ms ? `${time(ms)} (${ago(ms, now)})` : null);
  const source = a.weekly_reset_source === "app" ? "the app itself" : a.weekly_reset_source === "usage_history" ? "a reset seen in its usage history" : a.weekly_reset_source ? "your list (not confirmed yet)" : null;
  return (
    <div className="space-y-3 p-1">
      <Fact label="Email" value={a.email} empty="Not known yet: fills in at its next sign-in" />
      <Fact label="Account id" value={a.account_id} mono />
      <Fact label="Plan" value={a.plan} empty="Not recorded" />
      <Fact label="Organizations" value={a.orgs.length ? a.orgs.join(", ") : null} empty="—" />
      <Fact label="Signed in at" value={a.instances.length ? a.instances.join(", ") : "No instance now"} />
      <Fact label="Weekly" value={a.weekly === null ? null : `${pct(a.weekly)}${a.weekly_reset_since ? " (the week has reset since this reading)" : ""}`} empty="—" />
      <Fact label="Week resets" value={a.weekly_resets_at_ms ? `${at(a.weekly_resets_at_ms)}${source ? `, from ${source}` : ""}` : null} empty="—" />
      <Fact label="5-hour" value={a.five_hour === null ? null : `${pct(a.five_hour)}${a.five_hour_reset_since ? " (the 5-hour window has passed since this reading)" : ""}`} empty="—" />
      <Fact label="5-hour resets by" value={at(a.five_hour_resets_at_ms)} empty="—" />
      <Fact label="Extra usage" value={a.extra_usage === null ? null : `${Math.round(a.extra_usage)}% of its cap`} empty="—" />
      <Fact label="Credits" value={a.credits === null ? null : a.credits.toFixed(2)} empty="—" />
      <Fact label="Newest reading" value={at(a.read_at_ms)} empty="Never read" help={stale ? `Older than ${STALE_MIN} minutes: the app reads usage only while an instance signed into it is open` : undefined} />
      <Fact label="Read in" value={a.read_in} empty="—" />
      <Fact label="First seen" value={at(a.first_seen_ms)} empty="—" />
      <Fact label="Last seen" value={at(a.last_seen_ms)} empty="—" />
      <Fact label="Still missing" value={a.missing.length ? a.missing.join(", ") : "Nothing"} />
    </div>
  );
}

