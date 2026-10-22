"use client";

/**
 * /work Live — every coding session, agent room and manager agent the person
 * has, in one place, live. Linear-inbox shape: a dense list on the left
 * (Slack-style presence dots, Activity-Monitor-style live status), the
 * selected item on the right; on a narrow container (phone) the list and the
 * detail are one pane each with Back, like /messages.
 *
 * Selection lives in the URL (?session=<address> | ?room=<id>) so every view
 * is a link.
 */
import { FrameSidebarColumn } from "@/features/shell/frame-host/frameSidebarSlot";
import { useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { agentRoomKind, roomCountText, splitRooms } from "../presence";
import { useLiveHub } from "../useLiveHub";
import { LiveSidebar, type LiveSelection } from "./LiveSidebar";
import { SessionDetail } from "./SessionDetail";
import { RoomDetail } from "./RoomDetail";
import { NewRoomDialog } from "./NewRoomDialog";
import { AiWorkHeader } from "../../components/AiWorkHeader";

/**
 * What the hub's own width allows. The shell header is portaled OUT of the
 * `@container/live` box, so header content cannot use container queries —
 * it reads these measured flags instead.
 */
export interface LiveLayout {
  /** The list sits beside the detail (container ≥ 42rem): no Back. */
  listBeside: boolean;
  /** Room for secondary header text (container ≥ 64rem). */
  roomy: boolean;
}

function useLiveLayout() {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LiveLayout>({ listBeside: true, roomy: true });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const w = el.clientWidth;
      setLayout((cur) => {
        const next = { listBeside: w >= 42 * rem, roomy: w >= 64 * rem };
        return cur.listBeside === next.listBeside && cur.roomy === next.roomy ? cur : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, layout };
}

function readSelection(params: URLSearchParams): LiveSelection {
  const session = params.get("session");
  if (session) return { kind: "session", address: session };
  const room = params.get("room");
  if (room) return { kind: "room", id: room };
  return null;
}

export function LiveHub() {
  const pathname = usePathname();
  const params = useSearchParams();
  const selection = readSelection(new URLSearchParams(params.toString()));
  const { sessions, members, agentInfo, rooms, roomsComplete, loaded, loading, error, nowMs, refresh, adoptRoom } =
    useLiveHub();
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [createdDirect, setCreatedDirect] = useState<Record<string, string>>({});
  /** A room just created whose own read is still in flight (or failed). */
  const [opening, setOpening] = useState<{ id: string; error: string | null } | null>(null);
  const { ref: rootRef, layout } = useLiveLayout();


  const select = (next: LiveSelection) => {
    const q =
      next?.kind === "session"
        ? `?session=${next.address}`
        : next?.kind === "room"
          ? `?room=${next.id}`
          : "";
    replaceAddressWithoutNavigating(`${pathname}${q}`);
  };

  const session =
    selection?.kind === "session"
      ? (sessions.find((s) => s.address === selection.address) ?? null)
      : null;
  const room =
    selection?.kind === "room"
      ? (rooms.find((r) => r.conversation.id === selection.id) ?? null)
      : null;
  // The direct line is the agent_direct room this session is a member of
  // (member rows are the truth; the inbox projection may not carry metadata.session_id).
  const directRoomId = session
    ? (rooms.find(
        (r) =>
          agentRoomKind(r.conversation.metadata) === "agent_direct" &&
          members.some(
            (m) =>
              m.conversation_id === r.conversation.id &&
              session.bindingIds.includes(m.member_id),
          ),
      )?.conversation.id ??
      createdDirect[session.address] ??
      null)
    : null;

  /** Open the room the person just made: read it directly, then list it. */
  const openCreated = async (id: string) => {
    setOpening({ id, error: null });
    select({ kind: "room", id });
    try {
      await adoptRoom(id);
      setOpening((cur) => (cur?.id === id ? null : cur));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The new room could not be read.";
      setOpening((cur) => (cur?.id === id ? { id, error: `The room was created, but reading it failed: ${message}` } : cur));
    }
  };

  const busy = sessions.filter((s) => s.presence === "busy").length;
  const idle = sessions.filter((s) => s.presence === "idle").length;

  return (
    <div ref={rootRef} className="@container/live flex h-full min-h-0 overflow-hidden bg-background pt-[var(--shell-header-h)]">
      {/* A selected session or room renders the header with its own title. */}
      {!session && !room && <AiWorkHeader />}
      <FrameSidebarColumn
        aria-label="Sessions and rooms"
        className={cn(
          "min-h-0 w-full flex-col border-border @2xl/live:flex @2xl/live:w-80 @2xl/live:shrink-0 @2xl/live:border-r",
          selection ? "hidden" : "flex",
        )}
      >
        <LiveSidebar
          sessions={sessions}
          members={members}
          agentInfo={agentInfo}
          rooms={rooms}
          selection={selection}
          nowMs={nowMs}
          loaded={loaded}
          roomsComplete={roomsComplete}
          error={error}
          onRetry={refresh}
          onSelect={select}
          onNewRoom={() => setNewRoomOpen(true)}
        />
      </FrameSidebarColumn>

      <main
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col",
          selection ? "flex" : "hidden @2xl/live:flex",
        )}
      >
        {session ? (
          <SessionDetail
            key={session.address}
            session={session}
            members={members.filter((m) => session.bindingIds.includes(m.member_id))}
            directRoomId={directRoomId}
            directMembers={members.filter(
              (m) => m.conversation_id === directRoomId && session.bindingIds.includes(m.member_id),
            )}
            nowMs={nowMs}
            layout={layout}
            onBack={() => select(null)}
            onDirectRoomCreated={(id) => {
              setCreatedDirect((cur) => ({ ...cur, [session.address]: id }));
              refresh();
            }}
          />
        ) : room ? (
          <RoomDetail
            key={room.conversation.id}
            room={room}
            members={members}
            agentInfo={agentInfo}
            sessions={sessions}
            nowMs={nowMs}
            layout={layout}
            onBack={() => select(null)}
            onOpenSession={(address) => select({ kind: "session", address })}
            onChanged={refresh}
          />
        ) : selection?.kind === "room" && opening?.id === selection.id ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground" role="status">
            {opening.error ? (
              <>
                <ErrorNotice message={opening.error} size="compact" />
                <Button variant="quiet" onClick={() => void openCreated(selection.id)}>
                  Retry
                </Button>
              </>
            ) : (
              "Opening the new room…"
            )}
          </div>
        ) : selection ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            {loading || !loaded ? "Loading" : selection.kind === "session" ? "This session is not in your recent sessions." : "This room is not in your inbox."}
            <Button variant="quiet" onClick={() => select(null)}>
              Back to Live
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <Radio className="size-8 text-muted-foreground" />
            {loaded ? (
              <p className="text-sm font-medium">
                {busy} busy · {idle} idle · {roomCountText(splitRooms(rooms), roomsComplete)}
              </p>
            ) : (
              <div className="h-5 w-48 animate-pulse rounded bg-muted/60" />
            )}
            <p className="max-w-xs text-xs text-muted-foreground">
              Open a session to read its transcript and message it.
            </p>
          </div>
        )}
      </main>

      {newRoomOpen && (
      <NewRoomDialog
        open={newRoomOpen}
        onOpenChange={setNewRoomOpen}
        sessions={sessions}
        loaded={loaded}
        onCreated={(id) => {
          setNewRoomOpen(false);
          void openCreated(id);
        }}
      />
      )}
    </div>
  );
}
