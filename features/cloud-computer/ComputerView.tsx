"use client";

/**
 * ComputerView — the "Computer" tab of the chat side panel: the person's one
 * cloud machine, shared by all their agents. Stopped -> Wake; waking -> an
 * honest wait; ready -> the live screen (thumbnail, click to enlarge) with the
 * Watching / Take control pill. The screen is the existing Cloud Browser stream
 * and take-control flow — nothing here re-implements them.
 *
 * This is the person's CLOUD machine, not their own computer (Local servers).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Hand, Maximize2, Minimize2, Monitor, Power, RotateCw, Square } from "lucide-react";
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
  mintStreamTicket,
  renewStreamTicket,
} from "@/features/cloud-browser/service";
import type { StreamTicketEnvelope } from "@/features/cloud-browser/types";
import { useCloudComputer } from "./useCloudComputer";
import { ScaledFrame } from "./ScaledFrame";

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
  const cb = useCloudBrowser(undefined, null, "sandbox");
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
  const [held, setTicket] = useState<{ ticket: StreamTicketEnvelope; revision: number } | null>(null);
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

  // Watching = the bounded screenshot session (the server mints a live stream
  // only to the person who holds control). Control = the Selkies stream.
  // No stills while ANY person holds the wheel (the server refuses them,
  // `controlled_by_other`), and none while a refusal is backing off.
  const shots = useScreenshotSession(run?.id ?? null, false);
  const frame = shots.frames[0] ?? null;
  const wantsStills = runReady && controller?.kind !== "human";
  useEffect(() => {
    if (wantsStills && !shots.active && !shots.paused) shots.start();
    else if (!wantsStills && shots.active) shots.stop();
  }, [wantsStills, shots.active, shots.paused]);

  const revision = controller?.controlRevision ?? 0;
  // A stream belongs to one control revision: once control ends or moves it is
  // simply not the live one (no reset-in-effect needed).
  const ticket =
    inControl && !lost && held?.revision === revision ? held.ticket : null;
  // Another viewer took the seat: drop the stream at once (its claim is about
  // to be superseded server-side anyway).
  const seatTaken = !!ticket && seat.elsewhere;
  useEffect(() => {
    if (seatTaken) setLost(true);
  }, [seatTaken]);

  const open = useCallback(
    async (takeover: boolean) => {
      if (!run) return;
      // This is the visible view of the run, so it takes the seat.
      seat.hold(true);
      setOpening(true);
      setOpenError(null);
      setLost(false);
      try {
        setTicket({
          ticket: await mintStreamTicket(run.id, "control", takeover),
          revision,
        });
      } catch (e) {
        setTicket(null);
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

  // Open the control stream once per control revision, so a refusal never loops.
  const attempted = useRef<string | null>(null);
  useEffect(() => {
    if (!inControl || !runReady || !run || opening || ticket || lost) return;
    const key = `${run.id}:${controller?.controlRevision ?? 0}`;
    if (attempted.current === key) return;
    attempted.current = key;
    void open(false);
  }, [inControl, runReady, run, opening, ticket, lost, controller?.controlRevision, open]);

  // Renew the claim; the first refusal ends the loop (a superseded ticket
  // answers 404 on every tick) and the view offers to take control again.
  useEffect(() => {
    if (!ticket?.control) return;
    const timer = window.setInterval(() => {
      void renewStreamTicket(ticket).catch((e: unknown) => {
        window.clearInterval(timer);
        if (isStreamGone(e)) setLost(true);
        else setOpenError("The screen connection expired.");
        setTicket(null);
      });
    }, ticket.control.renewIntervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [ticket]);

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
      setTicket(null);
      setLost(false);
    } catch (e) {
      toastErrorAlreadyCaptured(
        e instanceof Error ? e.message : "Could not hand the screen back.",
      );
    } finally {
      setBusy(false);
    }
  }, [cb]);

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

  const viewport = ticket?.viewport ?? { width: 1280, height: 720 };
  const claiming = busy || takeover.phase === "claiming";

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
          {inControl && ticket ? (
            <ScaledFrame
              src={ticket.endpoint}
              width={viewport.width}
              height={viewport.height}
              title={label}
              interactive={large}
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
              {inControl && lost ? (
                <>
                  <p className="text-xs">Opened somewhere else</p>
                  <Button variant="outline" icon={<Hand />} onClick={() => void open(true)}>
                    Take control again
                  </Button>
                </>
              ) : openError ? (
                <>
                  <p className="text-xs">
                    {openError} <ErrorAlchemyMenu error={openError} />
                  </p>
                  <Button variant="outline" onClick={() => void open(true)}>
                    Show it here
                  </Button>
                </>
              ) : someoneElseInControl ? (
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
          {!large && (frame || ticket) ? (
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
            disabled={!frame && !ticket}
            onClick={() => setLarge(true)}
          >
            {label}
          </Button>
        ) : (
          <span className="text-xs font-medium text-foreground">{label}</span>
        )}
        {inControl ? (
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
            <span className="font-medium text-foreground">You&apos;re in control</span>
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
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
            <span className={cn("font-medium", WAITING)}>Telling your agent…</span>
            <Button variant="outline" onClick={takeover.takeOverImmediately}>
              Now
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
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
