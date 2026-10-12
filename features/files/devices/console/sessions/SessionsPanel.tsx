/**
 * The device console's Sessions: this computer's Claude Code and Codex sessions, live, from
 * anywhere (protocol 1.38 `coding.*`). The rows are the computer's own recent list (its sidebar's
 * Code › Recent, with the Mac's dots), the open chat is the coding-sessions package's own view (the
 * same header, run state, Stop, model, agent and chat column the Mac's hosted screen draws), and
 * New session is the package's own form. Phone: the list, then the chat (iOS Mail / Messages
 * bones); wide: the list beside the chat. The open chat lives in the URL (?s=<target>).
 *
 * Everything goes to the computer through the device protocol client (`createDesktopProtocolTransport`);
 * the agent catalogue is read here as the same person, so the picker is the Mac's picker.
 */

"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { ListFilter, Plus, RefreshCw } from "lucide-react";
import {
  createDesktopProtocolTransport,
  type DesktopCodingTransport,
  type DesktopProtocolLikeClient,
  type RecentChatRow,
  type TransportStatus,
} from "@ai-matrx/coding-sessions";
import {
  CodingDiscoveredView,
  CodingNewSessionDialog,
  CodingScreenPrefsReady,
  CodingSessionView,
  CodingSessionsProvider,
  CodingToastContext,
  ProviderMark,
  relativeTime,
} from "@ai-matrx/coding-sessions/react";
import "@ai-matrx/coding-sessions/react/styles.css";
import type { DesktopClient } from "@ai-matrx/desktop-protocol/client";
import { Button, StatusDot } from "@ai-matrx/design-system";
import { Select } from "@ai-matrx/design-system/controls";
import { useMediaQuery } from "@ai-matrx/kit/media-query";

import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useAppStore } from "@/lib/redux/hooks";

import { useNow } from "../../useNow";
import type { ConsoleStatus } from "../connection";
import { webAgentCatalog } from "./agent-source";
import { SCOPES, inScope, rowFacts, sessionsState, wholeViewRefusal, type SessionsScope } from "./model";

export interface SessionsPanelProps {
  client: DesktopClient;
  console: ConsoleStatus;
  deviceName: string;
  visible: boolean;
  /** The open chat's target (`#s/<id>` or `#d/<provider>/<id>`), from the URL. */
  selected: string | null;
  onSelect: (target: string | null) => void;
}

/** The status object changes identity on every read; compare by what it says. */
function statusKey(status: TransportStatus): string {
  return status.state === "closed" ? `closed:${status.reason}` : status.state;
}

const CONNECTING: TransportStatus = { state: "connecting" };

/** The transport's honest state, one stable object per state (useSyncExternalStore needs that). */
function useTransportStatus(transport: DesktopCodingTransport): TransportStatus {
  const cache = useRef<TransportStatus | null>(null);
  const read = () => {
    const next = transport.status();
    const kept = cache.current;
    if (kept && statusKey(kept) === statusKey(next)) return kept;
    cache.current = next;
    return next;
  };
  return useSyncExternalStore((listener) => transport.onStatus(() => listener()), read, () => CONNECTING);
}

export function SessionsPanel(props: SessionsPanelProps) {
  const store = useAppStore();
  const transport = useMemo(
    () =>
      createDesktopProtocolTransport({
        client: props.client as unknown as DesktopProtocolLikeClient,
        deviceName: props.deviceName,
        agents: webAgentCatalog(store.getState),
      }),
    [props.client, props.deviceName, store],
  );
  useEffect(() => () => transport.dispose(), [transport]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", !props.visible && "hidden")} data-testid="device-sessions">
      {props.visible ? (
        <CodingSessionsProvider transport={transport} chatProvided>
          <CodingScreenPrefsReady value>
            <CodingToastContext.Provider value={(text: string) => toast.info(text)}>
              <SessionsBody {...props} transport={transport} />
            </CodingToastContext.Provider>
          </CodingScreenPrefsReady>
        </CodingSessionsProvider>
      ) : null}
    </div>
  );
}

function SessionsBody(props: SessionsPanelProps & { transport: DesktopCodingTransport }) {
  const { transport } = props;
  const status = useTransportStatus(transport);
  const rows = useSyncExternalStore(transport.onRecent, transport.recent, transport.recent);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [scope, setScope] = useState<SessionsScope>("all");
  const [newOpen, setNewOpen] = useState(false);
  const now = useNow();
  const wide = useMediaQuery("(min-width: 1024px)");
  const chatRef = useRef<HTMLDivElement>(null);
  useComposerClearsAssists(chatRef, Boolean(props.selected) && props.visible);

  // The list (and the computer's recent rows) once the computer answers; a refusal by the
  // person's own switch stops the whole view with its sentence.
  useEffect(() => {
    if (status.state !== "open") return;
    let gone = false;
    transport.call("listSessions").then(
      () => {
        if (gone) return;
        setRefusal(null);
        setLoaded(true);
      },
      (error: unknown) => {
        if (gone) return;
        setRefusal(wholeViewRefusal(error));
        setLoaded(true);
      },
    );
    return () => {
      gone = true;
    };
  }, [transport, status]);

  // Opening a chat here clears its "New output" dot on every screen (the Mac's too), and so does a
  // run that ends while the chat is open here (the person is looking at it).
  const openRowState = rows.find((r) => r.target === props.selected)?.state ?? null;
  const unseenHere = openRowState === "new_output" || openRowState === "needs_attention";
  useEffect(() => {
    if (props.selected && status.state === "open") void transport.markSeen(props.selected).catch(() => undefined);
  }, [props.selected, transport, status, unseenHere]);

  const state = sessionsState({ console: props.console, transport: status, deviceName: props.deviceName, refusal });
  if (state.kind === "blocked") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center" role="status">
        <p className="text-[15px] font-semibold text-foreground">{state.title}</p>
        <p className="max-w-sm text-[13px] text-muted-foreground">{state.body}</p>
      </div>
    );
  }

  const shown = rows.filter((r) => inScope(r, scope));
  const open = props.selected;
  // A phone shows the list OR the chat: the chat's own header carries Back (one bar, iOS Mail).
  const back = wide ? undefined : () => props.onSelect(null);
  const discovered = open ? /^#d\/(claude|codex)\/(.+)$/.exec(open) : null;
  const sessionId = open ? /^#s\/(.+)$/.exec(open)?.[1] ?? null : null;

  const list = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2">
        {/* iOS Mail's filter: one pop-up naming what shows, never a segmented bar clipped in a narrow column. */}
        <div className="min-w-0 flex-1">
          <Select aria-label="Show" icon={<ListFilter className="h-4 w-4" />} value={scope} onValueChange={(v) => setScope(v)} options={SCOPES} />
        </div>
        <Button size="sm" variant="ghost" aria-label="Refresh" onClick={() => void transport.call("listSessions")}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Sessions">
        {shown.map((row) => (
          <SessionRow key={row.target} row={row} now={now} selected={row.target === open} onOpen={() => props.onSelect(row.target)} />
        ))}
        {loaded && shown.length === 0 ? (
          <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">{scope === "all" ? "No coding sessions on this computer yet." : "Nothing here right now."}</li>
        ) : null}
        {!loaded ? <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">Reading this computer's sessions…</li> : null}
      </ul>
    </div>
  );

  const chat = open ? (
    <div ref={chatRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {sessionId ? (
        <CodingSessionView sessionId={sessionId} onBack={back} />
      ) : discovered ? (
        <CodingDiscoveredView provider={discovered[1] as "claude" | "codex"} providerSessionId={discovered[2] ?? ""} onTakenOver={(id) => props.onSelect(`#s/${id}`)} onBack={back} />
      ) : null}
    </div>
  ) : (
    <div className="hidden flex-1 items-center justify-center text-[13px] text-muted-foreground lg:flex">Choose a session, or start a new one.</div>
  );

  return (
    <div className="flex min-h-0 flex-1">
      {/* Phone: the list, or the chat. Wide: both. */}
      <div className={cn("flex min-h-0 w-full flex-col border-border lg:w-[340px] lg:shrink-0 lg:border-r", open && "hidden lg:flex")}>{list}</div>
      <div className={cn("min-h-0 min-w-0 flex-1 flex-col", open ? "flex" : "hidden lg:flex")}>{chat}</div>
      <CodingNewSessionDialog open={newOpen} onOpenChange={setNewOpen} onStarted={(id) => props.onSelect(`#s/${id}`)} />
    </div>
  );
}

/**
 * The open chat's composer is this page's bottom dock: its height (with the notes above it) is
 * published as --page-bottom-dock-h, the shell's contract, so the floating assists control rests
 * above it instead of over the composer and its warnings (TerminalPanel does the same for its keys).
 */
/** The chat's bottom bar: its composer (with the notes above it), or a preview's Take over line. */
const BOTTOM_BAR = "[data-cs-composer], [data-cs-bottom-bar]";

function useComposerClearsAssists(chatRef: RefObject<HTMLDivElement | null>, active: boolean): void {
  useEffect(() => {
    const chat = chatRef.current;
    if (!active || !chat) return undefined;
    const root = document.documentElement;
    const publish = () => {
      const composer = chat.querySelector(BOTTOM_BAR);
      if (!composer) {
        root.style.removeProperty("--page-bottom-dock-h");
        return;
      }
      const top = composer.getBoundingClientRect().top;
      const height = Math.max(0, Math.round(window.innerHeight - top));
      root.style.setProperty("--page-bottom-dock-h", `${height + 8}px`);
    };
    // Coalesced: a streaming answer changes the transcript many times a second; one measure per 150 ms.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer === null) {
        timer = setTimeout(() => {
          timer = null;
          const composer = chat.querySelector(BOTTOM_BAR);
          if (composer) observer.observe(composer);
          publish();
        }, 150);
      }
    };
    const observer = new ResizeObserver(soon);
    observer.observe(chat);
    const mutations = new MutationObserver(soon);
    mutations.observe(chat, { childList: true, subtree: true });
    window.addEventListener("resize", soon);
    soon();
    return () => {
      if (timer !== null) clearTimeout(timer);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", soon);
      root.style.removeProperty("--page-bottom-dock-h");
    };
  }, [chatRef, active]);
}

function SessionRow({ row, now, selected, onOpen }: { row: RecentChatRow; now: number; selected: boolean; onOpen: () => void }) {
  const facts = rowFacts(row);
  return (
    <li>
      <Button
        type="button"
        variant="ghost"
        onClick={onOpen}
        aria-current={selected ? "true" : undefined}
        className={cn("h-auto w-full items-start justify-start gap-2.5 rounded-none border-b border-border/60 px-4 py-2.5 text-left font-normal", selected && "bg-muted")}
      >
        {/* The Mac's Recent row: the app's mark, or a live or unread chat's dot in its place. */}
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden={facts.tone ? undefined : true}>
          {facts.tone ? <StatusDot tone={facts.tone} label={facts.toneLabel ?? undefined} /> : <ProviderMark provider={row.provider} size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{facts.title}</span>
            <span className="shrink-0 text-[12px] text-muted-foreground" suppressHydrationWarning>
              {relativeTime(row.updatedAt, now)}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className="min-w-0 truncate">{facts.where}</span>
            {facts.toneLabel ? <span className="shrink-0">· {facts.toneLabel}</span> : null}
            {facts.from ? <span className="shrink-0 rounded-full border border-border px-1.5 text-[11px] leading-4">{facts.from}</span> : null}
          </span>
        </span>
      </Button>
    </li>
  );
}
