"use client";

/**
 * ComputerView — the "Computer" tab of the chat side panel: the person's one
 * cloud machine, shared by all their agents. Stopped -> Wake; waking -> an
 * honest wait; ready -> the live screen (thumbnail, click to enlarge) with the
 * Watching / Take control pill. Watching and driving are ONE open stream: Take
 * control turns input on in the same frame. The stream and take-control flow
 * are the existing Cloud Browser ones — nothing here re-implements them.
 *
 * This is the person's CLOUD machine, not their own computer (Local servers).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Hand, Keyboard, Maximize2, Minimize2, Monitor, Power, RotateCw, Square } from "lucide-react";
import { BackendApiError } from "@ai-matrx/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { toast, toastErrorAlreadyCaptured } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { selectInstanceAgentId } from "@ai-matrx/chat/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useCloudBrowser } from "@/features/cloud-browser/hooks/useCloudBrowser";
import { useScreenshotSession } from "@/features/cloud-browser/hooks/useScreenshotSession";
import { useCloudBrowserTakeover } from "@/features/cloud-browser/hooks/useCloudBrowserTakeover";
import { useRunViewerSeat } from "@/features/cloud-browser/hooks/useRunViewerSeat";
import { useCloudBrowserProfileContextSync } from "@/features/cloud-browser/hooks/useCloudBrowserProfileContextSync";
import {
  browserActionBlockedReason,
  isStreamGone,
  isViewStreamUnavailable,
  mintStreamTicket,
  renewStreamTicket,
  streamFrameAddress,
} from "@/features/cloud-browser/service";
import type { StreamTicketEnvelope } from "@/features/cloud-browser/types";
import { useCloudComputer } from "./useCloudComputer";
import { ScaledFrame, type ScaledFrameHandle } from "./ScaledFrame";
import { liveStream, type HeldStream } from "./liveStream";

const WAITING = "animate-ssr-shimmer-opacity";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      {children}
    </div>
  );
}

/**
 * Self-contained: needs nothing from the chat canvas, so the agent dashboard
 * can mount it as-is. `conversationId` only binds Take control to that chat's
 * running agent (steer instead of yank).
 */
export function ComputerView({ conversationId }: { conversationId?: string }) {
  // Opening the Computer IS asking for it: an off machine wakes itself.
  const { machine, error, waking, wake, retry } = useCloudComputer({ autoWake: true });

  if (!machine) {
    return error ? (
      <Centered>
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
        <p role="alert" className="text-sm font-medium">
          {error} <ErrorAlchemyMenu error={error} />
        </p>
        <div className="flex items-center gap-2">
          <Button icon={<RotateCw />} variant="outline" onClick={() => void retry()}>
            Try again
          </Button>
        </div>
      </Centered>
    ) : (
      <Centered>
        <Monitor className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p role="status" className={cn("text-sm font-medium", WAITING)}>Checking…</p>
      </Centered>
    );
  }

  if (machine.ready) return <ComputerScreen conversationId={conversationId} />;

  if (waking || machine.status === "creating" || machine.status === "starting") {
    return (
      <Centered>
        <Monitor className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p role="status" aria-live="polite" className={cn("text-sm font-medium", WAITING)}>
          Waking up…
        </p>
      </Centered>
    );
  }

  if (machine.status === "shutting_down") {
    return (
      <Centered>
        <Monitor className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p role="status" className={cn("text-sm font-medium", WAITING)}>Saving…</p>
      </Centered>
    );
  }

  const failed = !!error || machine.status === "failed" || machine.status === "expired";
  return (
    <Centered>
      {failed ? (
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
      ) : (
        <Monitor className="h-8 w-8 text-muted-foreground" aria-hidden />
      )}
      <p className="text-sm font-medium" role={failed ? "alert" : undefined}>
        {failed ? (error ?? "The computer could not start.") : "Computer is off"}
        {failed ? <ErrorAlchemyMenu error={error ?? "The computer could not start."} /> : null}
      </p>
      <div className="flex items-center gap-2">
        <Button icon={<Power />} variant="primary" onClick={() => void wake()}>
          {failed ? "Try again" : "Wake"}
        </Button>
      </div>
    </Centered>
  );
}

/** The machine is up: its screen as the agent's browser stream. */
function ComputerScreen({ conversationId }: { conversationId?: string }) {
  // Only a run ON the machine: never adopt or start a cold fleet browser here.
  // The tab shows the screen, never the written step list: no progress poll.
  const cb = useCloudBrowser(undefined, null, "sandbox", { followProgress: false });
  // ONE chip: the composer's browser pill already stands for this computer, so
  // a "Cloud Browser" profile value chip left by an earlier pane is cleared.
  useCloudBrowserProfileContextSync(conversationId, null);
  const agentId = useAppSelector((s) =>
    conversationId ? selectInstanceAgentId(conversationId)(s) : undefined,
  );
  const agentName = useAppSelector((s) =>
    agentId ? selectAgentById(s, agentId)?.name : undefined,
  );
  const label = agentName ? `${agentName}'s screen` : "Agent's screen";

  const [large, setLarge] = useState(false);
  const frameControl = useRef<ScaledFrameHandle>(null);
  const [held, setHeld] = useState<HeldStream | null>(null);
  // Whether the server streams a live picture to a person who is only
  // watching. "no" = an older server (409 `not_controller`): watching falls
  // back to stills until the next open of this tab.
  const [viewSupport, setViewSupport] = useState<"unknown" | "yes" | "no">("unknown");
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  // The claim this view held is gone (superseded by another viewer or tab, or
  // expired): a plain recoverable state, never a frozen picture.
  const [lost, setLost] = useState(false);
  const [busy, setBusy] = useState(false);

  const controller = cb.controller;
  const inControl = controller?.kind === "human" && controller.isMe;
  const someoneElseInControl = controller?.kind === "human" && !controller.isMe;
  const run = cb.run;
  // THE ONE-VIEWER RULE (`cloud-browser/runViewer`): this view holds the run's
  // one viewer seat while it shows the live stream.
  const seat = useRunViewerSeat(run?.id ?? null);
  const runReady =
    !!run &&
    !["provisioning", "stopping", "stopped", "failed", "failed_persistence"].includes(run.state);
  const runFailed = run?.state === "failed" || run?.state === "failed_persistence";
  const revision = controller?.controlRevision ?? 0;

  // THE ONE CONNECTION: watching and driving are the same open stream; taking
  // control only turns input on (no new ticket, no reconnect).
  const stream = liveStream({
    held,
    runId: run?.id ?? null,
    lost,
    viewSupport,
    inControl,
    revision,
  });

  // Stills only when this server cannot stream to a watcher, and none while
  // ANY person holds the wheel (the server refuses them, `controlled_by_other`)
  // or while a refusal is backing off.
  const shots = useScreenshotSession(run?.id ?? null, false);
  const frame = shots.frames[0] ?? null;
  const wantsStills =
    runReady && viewSupport === "no" && !stream && controller?.kind !== "human";
  useEffect(() => {
    if (wantsStills && !shots.active && !shots.paused) shots.start();
    else if (!wantsStills && shots.active) shots.stop();
  }, [wantsStills, shots.active, shots.paused]);

  // Another viewer took the seat: drop the stream at once (its claim is about
  // to be superseded server-side anyway).
  // Set while rendering (React's "adjust state on a change" pattern), not in an
  // effect: one render, no cascade.
  const seatTaken = !!stream && seat.elsewhere;
  if (seatTaken && !lost) setLost(true);

  const open = useCallback(
    async (mode: "view" | "control", takeover: boolean) => {
      if (!run) return;
      // This is the visible view of the run, so it takes the seat.
      seat.hold(true);
      setOpening(true);
      setOpenError(null);
      setLost(false);
      try {
        const ticket = await mintStreamTicket(run.id, mode, takeover);
        setHeld({ ticket, kind: mode, revision, runId: run.id });
        if (mode === "view") setViewSupport("yes");
      } catch (e) {
        if (mode === "view" && isViewStreamUnavailable(e)) {
          setViewSupport("no");
          return;
        }
        setHeld(null);
        setOpenError(
          e instanceof BackendApiError
            ? e.userMessage
            : e instanceof Error
              ? e.message
              : "The screen could not open.",
        );
      } finally {
        setOpening(false);
      }
    },
    [run, revision, seat],
  );

  // Open ONE stream as soon as the run is live: a watch stream, or a control
  // stream when this person already drives (a reload mid-control). Once per
  // key, so a refusal never loops.
  const attempted = useRef<string | null>(null);
  const wantMode: "view" | "control" | null = !runReady || stream || lost || opening
    ? null
    : inControl
      ? "control"
      : viewSupport === "no"
        ? null
        : "view";
  useEffect(() => {
    if (!wantMode || !run) return;
    const key = `${run.id}:${wantMode === "control" ? `control:${revision}` : "view"}`;
    if (attempted.current === key) return;
    attempted.current = key;
    void open(wantMode, false);
  }, [wantMode, run, revision, open]);

  // Renew the control lease while this person drives. The first refusal ends
  // the loop (a superseded claim answers on every tick); a gone stream offers
  // to open again, a watch stream simply keeps watching.
  useEffect(() => {
    if (!stream || !inControl) return;
    const every = (stream.ticket.control?.renewIntervalSeconds ?? 20) * 1000;
    const timer = window.setInterval(() => {
      void renewStreamTicket(stream.ticket).catch((e: unknown) => {
        window.clearInterval(timer);
        if (isStreamGone(e)) {
          setLost(true);
        } else if (stream.kind === "control") {
          setOpenError("The screen connection expired.");
          setHeld(null);
        }
      });
    }, every);
    return () => window.clearInterval(timer);
  }, [stream, inControl]);

  const claim = useCallback(
    async (opts?: { immediate?: boolean }) => {
      const blocked = browserActionBlockedReason();
      if (blocked) {
        toast.warning(blocked);
        return;
      }
      setBusy(true);
      try {
        await cb.takeControl(opts);
        setLarge(true);
      } catch (e) {
        toastErrorAlreadyCaptured(
          e instanceof Error ? e.message : "Could not take control.",
        );
      } finally {
        setBusy(false);
      }
    },
    [cb],
  );
  const takeover = useCloudBrowserTakeover({
    conversationId,
    agentAwaitingHuman: cb.handoff?.state === "requested",
    claim,
  });

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      await cb.returnControl();
      // A server with the watch stream keeps this same connection as the
      // live picture; an older one ends it with control.
      if (viewSupport !== "yes") setHeld(null);
      setLost(false);
    } catch (e) {
      toastErrorAlreadyCaptured(
        e instanceof Error ? e.message : "Could not hand the screen back.",
      );
    } finally {
      setBusy(false);
    }
  }, [cb, viewSupport]);

  if (runFailed || (cb.error && !run)) {
    const message = cb.error?.message ?? run?.errorDetailSafe ?? "The screen could not open.";
    return (
      <Centered>
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
        <p role="alert" className="text-sm font-medium">
          {message} <ErrorAlchemyMenu error={message} />
        </p>
        <div className="flex items-center gap-2">
          <Button icon={<RotateCw />} variant="outline" onClick={() => void cb.retry()}>
            Try again
          </Button>
        </div>
      </Centered>
    );
  }

  const viewport = stream?.ticket.viewport ?? { width: 1280, height: 720 };
  const claiming = busy || takeover.phase === "claiming";
  const reopenMode = inControl ? "control" : "view";

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className={cn("min-h-0", large ? "flex-1" : "")}>
        <div
          className={cn(
            "relative overflow-hidden rounded-md border border-border bg-muted",
            large ? "h-full w-full" : "w-64",
          )}
          style={large ? undefined : { aspectRatio: "16 / 9" }}
        >
          {stream ? (
            // Keyed by the connection, never by watching/driving: taking
            // control must not remount (reconnect) the live picture.
            <ScaledFrame
              key={stream.ticket.streamSessionId}
              src={streamFrameAddress(stream.ticket)}
              width={viewport.width}
              height={viewport.height}
              title={label}
              interactive={inControl && large}
              controlRef={frameControl}
            />
          ) : !inControl && frame ? (
            <img
              src={frame.previewUrl}
              alt={label}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div
              role={openError ? "alert" : "status"}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-muted-foreground"
            >
              {lost ? (
                <>
                  <p className="text-xs">Opened somewhere else</p>
                  <Button
                    variant="outline"
                    icon={inControl ? <Hand /> : undefined}
                    onClick={() => void open(reopenMode, true)}
                  >
                    {inControl ? "Take control again" : "Show it here"}
                  </Button>
                </>
              ) : openError ? (
                <>
                  <p className="text-xs">
                    {openError} <ErrorAlchemyMenu error={openError} />
                  </p>
                  <Button variant="outline" onClick={() => void open(reopenMode, true)}>
                    Show it here
                  </Button>
                </>
              ) : someoneElseInControl && viewSupport === "no" ? (
                <p className="text-xs">
                  {controller?.displayName
                    ? `${controller.displayName} is in control`
                    : "Someone is in control"}
                </p>
              ) : (
                <p className={cn("text-xs", WAITING)}>
                  {inControl ? "Opening…" : "Loading screen…"}
                </p>
              )}
            </div>
          )}
          {!large && (frame || stream) ? (
            <button
              type="button"
              aria-label={`Enlarge ${label}`}
              onClick={() => setLarge(true)}
              className="absolute inset-0 cursor-zoom-in"
            />
          ) : null}
          {large ? (
            <Button
              variant="outline"
              icon={<Minimize2 />}
              aria-label="Shrink"
              className="absolute right-2 top-2"
              onClick={() => setLarge(false)}
            />
          ) : null}
        </div>
      </div>

      {/* Wraps in a narrow canvas so the pill never runs off the edge. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!large ? (
          <Button
            variant="quiet"
            icon={<Maximize2 />}
            disabled={!frame && !stream}
            onClick={() => setLarge(true)}
          >
            {label}
          </Button>
        ) : (
          <span className="text-xs font-medium text-foreground">{label}</span>
        )}
        {/* A plain row, never a hand-drawn bordered capsule around tap
            buttons (the tap-target guard flagged it off-centre, 2026-10-17):
            the buttons carry their own spacing and skin. */}
        {inControl ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">You&apos;re in control</span>
            <Button
              variant="outline"
              icon={<Keyboard />}
              aria-label="Reconnect keyboard"
              title="Reconnect keyboard"
              disabled={!stream}
              onClick={() => frameControl.current?.reconnectKeyboard()}
            />
            <Button
              variant="outline"
              icon={<Square />}
              disabled={claiming}
              onClick={() => void stop()}
            >
              Stop
            </Button>
          </div>
        ) : takeover.waiting ? (
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("font-medium", WAITING)}>Telling your agent…</span>
            <Button variant="outline" onClick={takeover.takeOverImmediately}>
              Now
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">Watching</span>
            <Button
              variant="primary"
              icon={<Hand />}
              disabled={!runReady || claiming}
              onClick={takeover.begin}
            >
              Take control
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComputerView;
