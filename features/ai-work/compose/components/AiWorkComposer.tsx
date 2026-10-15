"use client";

/**
 * `/work/new` — compose and launch work.
 *
 * Answers one question in seven plain-language steps: *what do I want done, by
 * whom, with what knowledge, and where should the result live?*
 *
 * THE INVENTORY LAW — this surface builds no execution, no picker, and no
 * store of its own. It composes, in order:
 *   1. Destination   → `destinationAvailability` over the live capability
 *                      reads (the bridge verdict for the hosted sandbox, the
 *                      Matrx Local engine for the user's own Mac)
 *   2. Request       → the run's user input; above its textarea sits the ONE
 *                      composer row — `SmartAgentResourcePickerButton`
 *                      (a stored file becomes a durable file→conversation edge
 *                      the backend injects at call time), `ActiveContextLensChip`
 *                      for the active scopes, and `ConversationContextRail`
 *                      (`withAttachments`: attachments LEFT, the value chip
 *                      pinned RIGHT, its full view owned by the rail)
 *   3. Expert system → `AgentListDropdown` (the canonical agent picker)
 *   4. Skills        → `RunSkillPicker` (the canonical per-run skill picker)
 *   5. Home          → `UniversalAssociationPicker`, applied as canonical
 *                      `conversation → project|task|war_room` edges at launch
 *   6. Timing        → run now, save as a reusable request, or hand off to the
 *                      EXISTING schedule engine at `/schedules/new`
 *   7. Review        → the exact facts, then Run
 *
 * Execution is `useAiWorkRun`: the managed `useAgentLauncher` instance from
 * mount (so every picker above has its slots) and `smartExecute` on Run — the
 * same path every SmartAgentInput host sends through — so the run leaves a
 * canonical conversation with all the normal doors. The run streams in the floating `LiveRunWindow` (never a
 * spinner, never a block at the top of the page that shifts what the user is
 * reading), and the conversation stays reachable at `/chat/<id>`.
 */

import { InfoHint } from "@/components/official/InfoHint";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookmarkPlus,
  CalendarClock,
  CircleAlert,
  Loader2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { Input, Select } from "@ai-matrx/design-system/controls";
import { recordToast, toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useAiWorkRun } from "../useAiWorkRun";
import { ConversationContextRail } from "@ai-matrx/chat/agents/components/inputs/smart-input/ConversationContextRail";
import {
  CONTEXT_PREVIEW_KIND,
  useOpenContextPreview,
} from "@/features/canvas/host/conversation/contextPreviewKind";
import { useCanvasHoldsKind } from "@/features/canvas/host/toolCanvas";
import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import { RunSkillPicker } from "@ai-matrx/chat/agents/components/inputs/smart-input/RunSkillPicker";
import { SmartAgentResourcePickerButton } from "@ai-matrx/chat/agents/components/inputs/resources/SmartAgentResourcePickerButton";
import { ActiveContextLensChip } from "@/features/scopes/components/active-context/ActiveContextLensChip";
import { selectBuilderAdvancedSettings } from "@ai-matrx/chat/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import {
  setBuilderAdvancedSettings,
  setSubmitOnEnter,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { selectUserInputText } from "@ai-matrx/chat/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { setUserInputText } from "@ai-matrx/chat/agents/redux/execution-system/instance-user-input/instance-user-input.slice";
import { AgentTextarea } from "@ai-matrx/chat/agents/components/inputs/smart-input/AgentTextarea";
import { useOpenLiveRunWindow } from "@/features/overlays/openers/liveRunWindow";
import { associationsService } from "@/features/scopes/service/associationsService";
import { readTypedRefusal } from "@/features/access-gate/service/serverRefusal";
import { decideHomeAttachRetry } from "../homeAttach";
import { createClient } from "@/utils/supabase/client";
import { createAssignment } from "@/features/war-room/service/associations";
import { roomRef } from "@/features/war-room/types";
import { useUser } from "@/lib/hooks/useUser";
import {
  INITIAL_BRIDGE_CAPABILITY,
  readBridgeCapability,
  type CodingBridgeCapability,
} from "@/features/ai-work/lib/codingBridgeCapability";
import { startHostedRun } from "@/features/ai-work/lib/hostedSandboxRun";
import {
  addHomesToFiling,
  deliverFromComputer,
  fileMatrx2Run,
  filingPendingSentence,
  readCodingCapability,
  resumePendingFilings,
  startCodingRun,
  type DoorCapability,
} from "@/features/ai-work/lib/matrx2Coding";
import type { PendingFiling } from "@ai-matrx/coding-sessions";
import { browserCodingDoors } from "@/features/ai-work/lib/matrx2Computers";
import { destinationAvailability, type WorkDestinationId } from "../destinations";
import {
  createSavedRequest,
  readSavedRequest,
  updateSavedRequest,
  type SavedRequest,
  type SavedRequestHome,
} from "../savedRequests";
import { ComposerSection } from "./ComposerSection";
import { HostedRunControls } from "./HostedRunControls";
import { HostedBillingStep } from "./HostedBillingStep";
import type { HostedBilling, OwnPlanStatus } from "@/features/ai-work/lib/ownPlan";
import { DestinationStep } from "./DestinationStep";
import { ComputerConnection, RunsOnStep, type ComputerConnectionState, type ComputerPlan } from "./RunsOnStep";
import { ErrorNotice } from "@ai-matrx/design-system";
import { computerScheduleParams, computerSessionLink, runOnChosenComputer } from "@/features/ai-work/lib/computerChooser";
import { OpenOnComputerLink, PendingLinkLabel } from "./OpenOnComputerLink";
import { HomeStep } from "./HomeStep";

/** Reasonable ceiling for the "did the conversation row land yet?" retry. */
const HOME_ATTACH_ATTEMPTS = 4;
const HOME_ATTACH_DELAY_MS = 600;

/**
 * Is the run's conversation row readable by this caller YET?
 *
 * THE TRANSIENT CAUSE, OBSERVED. `assoc_add` answers every access refusal with
 * the same code and the same sentence whether the row is a moment away or
 * belongs to somebody else (measured on production — see `../homeAttach`), so
 * the retry decision cannot come from the error. It comes from here.
 *
 * A read that itself fails answers `false`: not knowing is not evidence that
 * the refusal was final, and the attempt budget bounds the loop anyway.
 */
async function conversationIsReadable(conversationId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .schema("chat")
      .from("conversation")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export interface AiWorkComposerProps {
  /** SSR-resolved default agent (the `chat.default_new_chat` slot). */
  defaultAgentId: string | null;
  defaultAgentName: string | null;
  /** `?request=<id>` — reopen a saved request into the form. */
  savedRequestId?: string;
}

export function AiWorkComposer(props: AiWorkComposerProps) {
  const [agentId, setAgentId] = useState<string | null>(props.defaultAgentId);

  if (!agentId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-6 text-center">
          <CircleAlert className="mx-auto h-6 w-6 text-amber-600 dark:text-amber-400" />
          <p className="mt-2 text-sm font-medium text-foreground">
            No expert system could be resolved.
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            The default agent for new work did not resolve. Pick one to
            continue.
          </p>
          <div className="mt-3 flex justify-center">
            <AgentListDropdown
              label="Choose an expert system"
              onSelect={setAgentId}
              consumerId="ai-work-composer"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ComposerBody
      {...props}
      agentId={agentId}
      onAgentChange={setAgentId}
      key={agentId}
    />
  );
}

function ComposerBody({
  agentId,
  defaultAgentName,
  savedRequestId,
  onAgentChange,
}: AiWorkComposerProps & {
  agentId: string;
  onAgentChange: (id: string) => void;
}) {
  const dispatch = useAppDispatch();
  const { userId } = useUser();
  const openLiveRun = useOpenLiveRunWindow();

  // ── The run's identity. Managed mode mints ONE stable conversation id for
  //    this composer + agent pair, which is what every canonical per-run picker
  //    below binds to. The row itself is created server-side on the first turn.
  //    The instance exists from mount (see useAiWorkRun) so everything the
  //    person attaches before Run is still there when the run executes.
  const { conversationId, send } = useAiWorkRun(agentId);
  const openContextPreview = useOpenContextPreview();
  const contextPreviewOpen = useCanvasHoldsKind(CONTEXT_PREVIEW_KIND);

  const organizationId = useAppSelector(selectOrganizationId);
  const [destination, setDestination] = useState<WorkDestinationId>("ai-matrx");
  const [bridgeCapability, setBridgeCapability] =
    useState<CodingBridgeCapability>(INITIAL_BRIDGE_CAPABILITY);
  // Read only once "Claude Code on my Mac" is picked: no relay socket on every open of this page.
  const [localCapability, setLocalCapability] = useState<DoorCapability | null>(null);
  /** Starts on a Matrx 2 computer not yet filed under their homes (kept until filed). */
  const [waitingFilings, setWaitingFilings] = useState<PendingFiling[]>([]);
  const filingAbort = useRef<AbortController | null>(null);
  /** What Run is doing right now, in words (a start can take tens of seconds). */
  const [runStatus, setRunStatus] = useState<string | null>(null);
  /** The pending filing being delivered right now (its row says so). */
  const [delivering, setDelivering] = useState<string | null>(null);
  /** The run just started on a Matrx 2 computer: where it ran, and where to open it. */
  const [startedRun, setStartedRun] = useState<{ computerName: string; link: string | null } | null>(null);
  const [filingNote, setFilingNote] = useState<string | null>(null);
  const [localFolder, setLocalFolder] = useState<string>("");
  // ── "Runs on": null = the AI Matrx cloud (every destination below); a device id = one of the
  //    person's Matrx 2 computers, where Claude Code or Codex starts through the relay.
  const [runsOnDevice, setRunsOnDevice] = useState<string | null>(null);
  const [runsOnName, setRunsOnName] = useState<string | null>(null);
  const [computerPlan, setComputerPlanState] = useState<ComputerPlan | null>(null);
  const [computerRefusal, setComputerRefusal] = useState<string | null>(null);
  const [computerConnection, setComputerConnection] = useState<ComputerConnectionState | null>(null);
  const setComputerPlan = useCallback((plan: ComputerPlan | null) => {
    setComputerPlanState(plan);
    setComputerRefusal(null);
  }, []);
  // ── The request text lives where every package composer keeps it: the run
  //    instance's input slot. Before the instance exists (a saved request
  //    opened on arrival) it is held here, and carried over the moment the
  //    instance appears — or changes with the expert system.
  const [pendingText, setPendingText] = useState("");
  const sliceText = useAppSelector((state) =>
    conversationId ? selectUserInputText(conversationId)(state) : "",
  );
  const requestText = conversationId ? sliceText : pendingText;
  const lastText = useRef("");
  // Kept current from an effect (never written during render); declared before the
  // carry-over effect below, so that effect reads this render's text, as before.
  useEffect(() => {
    lastText.current = requestText;
  });
  const setRequestText = (text: string) => {
    if (conversationId) dispatch(setUserInputText({ conversationId, text }));
    else setPendingText(text);
  };
  useEffect(() => {
    if (!conversationId) return;
    // Enter in this box is a line break: Run is the deliberate, reviewed step.
    dispatch(setSubmitOnEnter({ conversationId, value: false }));
    if (lastText.current) {
      dispatch(setUserInputText({ conversationId, text: lastText.current }));
    }
  }, [conversationId, dispatch]);
  const [homes, setHomes] = useState<SavedRequestHome[]>([]);
  const [openStep, setOpenStep] = useState<number>(2);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedRequest | null>(null);
  const [savedLabel, setSavedLabel] = useState("");
  const [saving, setSaving] = useState(false);
  // ── The hosted (Matrx Sandbox) run in flight, if any. `hostedRuntimeId` is
  //    whatever the run's own stream reported — Cancel has no other source.
  const [hostedRunning, setHostedRunning] = useState(false);
  const [hostedRuntimeId, setHostedRuntimeId] = useState<string | null>(null);
  const hostedConversationId = useRef<string | null>(null);
  // ── Who pays for a hosted run. AI Matrx credits unless the person picks
  //    their own Claude plan AND the server reports them signed in to it.
  const [hostedBilling, setHostedBilling] = useState<HostedBilling>("platform");
  const [ownPlanStatus, setOwnPlanStatus] = useState<OwnPlanStatus | null>(
    null,
  );
  const ownPlanReady =
    hostedBilling === "platform" || ownPlanStatus?.state === "signed_in";

  const skillSettings = useAppSelector(
    selectBuilderAdvancedSettings(conversationId ?? ""),
  );
  const skillIds = skillSettings?.addedSkills ?? [];

  // ── Live destination capability. ONE reader per runtime, both shared with
  //    /work/connections. Keyed on the active organization because the bridge
  //    verdict is per user AND per organization.
  useEffect(() => {
    let cancelled = false;
    void readBridgeCapability("claude_code", "matrx_sandbox").then((next) => {
      if (!cancelled) setBridgeCapability(next);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // ── The person's own computer, read lazily: Matrx 2 first (relay status, then
  //    one socket to the computer that runs it), Matrx Local announced after.
  useEffect(() => {
    if (destination !== "claude-code" || runsOnDevice !== null || localCapability) return;
    let cancelled = false;
    void readCodingCapability(browserCodingDoors).then((next) => {
      if (cancelled) return;
      setLocalCapability(next);
      setLocalFolder((current) => current || (next.approvedFolders[0] ?? ""));
    });
    return () => {
      cancelled = true;
    };
  }, [destination, runsOnDevice, localCapability]);


  // ── Reopen a saved request into the form.
  useEffect(() => {
    if (!savedRequestId) return;
    let cancelled = false;
    void readSavedRequest(savedRequestId)
      .then((request) => {
        if (cancelled || !request) {
          if (!cancelled && !request) {
            toast.error("That saved request could not be opened.");
          }
          return;
        }
        setSaved(request);
        setSavedLabel(request.label);
        setRequestText(request.requestText);
        setDestination(request.destination);
        setHomes(request.homes);
        if (request.agentId && request.agentId !== agentId) {
          onAgentChange(request.agentId);
          return;
        }
        if (conversationId && request.skillIds.length > 0) {
          dispatch(
            setBuilderAdvancedSettings({
              conversationId,
              changes: { addedSkills: request.skillIds },
            }),
          );
        }
      })
      .catch((error: unknown) => {
        console.error("[ai-work/new] saved request read failed", error);
        toast.error("That saved request could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [savedRequestId, conversationId, agentId, dispatch, onAgentChange]);

  const hostedAvailability = destinationAvailability(
    "claude-code-hosted",
    bridgeCapability,
  );

  const canRun =
    requestText.trim().length > 0 &&
    (runsOnDevice !== null
      ? computerPlan !== null
      : destination === "ai-matrx"
      ? Boolean(conversationId)
      : destination === "claude-code"
        ? Boolean(localCapability?.available) && Boolean(localFolder)
        : destination === "claude-code-hosted"
          ? hostedAvailability.selectable && !hostedRunning && ownPlanReady
          : false);

  /**
   * Applies the Home picks as REAL canonical edges once the conversation row
   * exists. `assoc_add` authorizes against the conversation, and turn 1 creates
   * it, so the FIRST attempt can legitimately be too early — that one failure
   * mode, and only that one, is worth retrying. Anything else (an unregistered
   * pair, a revoked permission) is permanent: retrying it four times would just
   * be four identical errors in the console before the same honest report.
   */
  const attachHomes = async (runConversationId: string, onto: SavedRequestHome[] = homes) => {
    for (const home of onto) {
      let attached = false;
      /** The server's own refusal, in its own words. Never re-worded here. */
      let refusal: ReturnType<typeof readTypedRefusal> = null;
      let lastError = "";
      for (let attempt = 0; attempt < HOME_ATTACH_ATTEMPTS; attempt += 1) {
        try {
          if (home.token === "war_room") {
            await createAssignment({
              ref: roomRef(home.id),
              entityType: "conversation",
              entityId: runConversationId,
            });
            attached = true;
            break;
          }
          const result = await associationsService.add({
            sourceType: "conversation",
            sourceId: runConversationId,
            targetType: home.token,
            targetId: home.id,
          });
          if (result.ok) {
            attached = true;
            break;
          }
          refusal = readTypedRefusal(result.error);
          lastError = result.error.message;
        } catch (error) {
          refusal = readTypedRefusal(error);
          lastError = error instanceof Error ? error.message : String(error);
        }
        // RETRY ONLY THE RACE, and only while it is still a race. The refusal
        // is identical for "the row is a moment away" and "that is not yours",
        // so the cause is observed instead of guessed at.
        const decision = decideHomeAttachRetry(
          refusal,
          await conversationIsReadable(runConversationId),
        );
        if (decision === "stop") break;
        await new Promise((resolve) =>
          setTimeout(resolve, HOME_ATTACH_DELAY_MS),
        );
      }
      if (!attached) {
        console.error(
          `[ai-work/new] could not file the run under ${home.token} ${home.id}: ${lastError}`,
          refusal?.code ?? "",
        );
        // The server's sentence, verbatim, plus the code that makes it
        // reportable — and a next step that does not promise a retry.
        toast.error(
          refusal
            ? `The run started, but it could not be filed under "${home.label}": ${refusal.message}${refusal.code ? ` (${refusal.code})` : ""}. Open the conversation and add it there.`
            : `The run started, but it could not be filed under "${home.label}". Open the conversation and add it there.`,
        );
      }
    }
  };

  const refreshFilings = async () => {
    try {
      const waiting = await resumePendingFilings(browserCodingDoors, async (conversationId, filing) => {
        await attachHomes(conversationId, filing.homes as SavedRequestHome[]);
        toast.success(`The chat from ${filing.computerName} is filed under its homes.`);
      });
      if (!filingAbort.current?.signal.aborted) setWaitingFilings(waiting);
    } catch (error) {
      console.error("[ai-work/new] pending filings", error);
      toast.error(error instanceof Error ? error.message : "Pending filings could not be read.");
    }
  };

  /** Stop waiting for this chat: its pending filing is removed (the chat itself stays on the computer). */
  const dismissFiling = async (filing: PendingFiling) => {
    try {
      if (!browserCodingDoors.filings) throw new Error("Pending chats are not kept here.");
      await browserCodingDoors.filings.remove(filing);
      setWaitingFilings((list) => list.filter((f) => f.sessionId !== filing.sessionId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That pending chat could not be dismissed.");
    }
  };

  const deliverFiling = async (filing: PendingFiling) => {
    const ok = await confirm({
      title: `Deliver ${filing.computerName}'s chats to AI Matrx?`,
      description: `${filing.computerName} delivers every chat on it that AI Matrx lacks, this one included.`,
      confirmLabel: "Deliver",
    });
    if (!ok) return;
    setDelivering(filing.sessionId);
    try {
      toast.info(await deliverFromComputer(browserCodingDoors, filing));
      await refreshFilings();
    } finally {
      setDelivering(null);
    }
  };

  // ── Starts on a Matrx 2 computer that were not filed yet: filed now if their
  //    chat has reached AI Matrx, otherwise shown below. Aborted on leaving.
  useEffect(() => {
    const controller = new AbortController();
    filingAbort.current = controller;
    const first = setTimeout(() => void refreshFilings(), 0);
    return () => {
      clearTimeout(first);
      controller.abort();
    };
  }, []);

  const handleRunOnMyMac = async () => {
    if (!canRun || destination !== "claude-code" || !localCapability) return;
    setLaunching(true);
    try {
      setRunStatus(localCapability.computer ? `Starting on ${localCapability.computer.name} through Matrx 2…` : "Starting through Matrx Local…");
      const started = await startCodingRun(browserCodingDoors, localCapability, {
        cwd: localFolder,
        prompt: requestText.trim(),
      });
      if (started.via === "matrx2") {
        // No per-turn cloud mirror on Matrx 2: the chat is filed once it reaches AI Matrx.
        setStartedRun({ computerName: started.computer.name, link: computerSessionLink(started.computer.deviceId, started.sessionId) });
        toast.success(`Started on ${started.computer.name} through Matrx 2.`);
        void fileMatrx2Run(browserCodingDoors, started.computer, started.sessionId, { homes, signal: filingAbort.current?.signal }).then(async (filed) => {
          if ("pending" in filed) {
            setFilingNote(filed.pending);
            await refreshFilings();
            return;
          }
          setFilingNote(null);
          setLaunched(filed.conversationId);
          await attachHomes(filed.conversationId);
        });
        return;
      }
      const run = started.run;
      if (!run.conversation_id) {
        toast.success(
          "Claude Code is starting through Matrx Local. The conversation appears in Conversations as soon as the first turn lands.",
        );
        return;
      }
      setLaunched(run.conversation_id);
      toast.success(
        "Claude Code is running through Matrx Local. The session mirrors into this conversation at each turn.",
      );
      await attachHomes(run.conversation_id);
    } catch (error) {
      setRunStatus(null);
      console.error("[ai-work/new] local launch failed", error);
      toast.error(
        error instanceof Error
          ? `Claude Code could not start — ${error.message}`
          : "Claude Code could not start.",
      );
    } finally {
      setLaunching(false);
    }
  };

  /**
   * Run in a Matrx Sandbox we start for the user.
   *
   * The conversation id is minted here so the floating live-run window and the
   * "Open the conversation" door both exist from the first instant — the user
   * never gets a spinner and never gets a link that resolves to nothing. The
   * NDJSON stream is ADOPTED (`startHostedRun` → `adoptForeignStream`), so it
   * renders through the ONE canonical pipeline; nothing here parses content.
   */
  const handleRunHosted = async () => {
    if (!canRun) return;
    const runConversationId = crypto.randomUUID();
    hostedConversationId.current = runConversationId;
    setLaunching(true);
    setHostedRunning(true);
    setHostedRuntimeId(null);
    const handle = openLiveRun({
      conversationId: runConversationId,
      label: savedLabel.trim() || "Your request",
      pending: true,
      instanceId: `ai-work-hosted:${runConversationId}`,
    });
    // The door exists the moment the run is launched: a hosted run that the
    // user cannot open while it runs is the dead end LiveRunWindow exists for.
    setLaunched(runConversationId);
    try {
      const result = await dispatch(
        startHostedRun(
          {
            conversationId: runConversationId,
            prompt: requestText.trim(),
            agentId,
            billing: hostedBilling,
          },
          {
            onAdopted: (ids) =>
              handle.update({ requestId: ids.requestId, pending: false }),
            onRuntimeId: setHostedRuntimeId,
          },
        ),
      );
      if (result.error) {
        handle.close();
        setLaunched(null);
        // The server's own sentence, verbatim. The composer stays usable.
        toast.error(`The hosted session could not start — ${result.error}`);
        return;
      }
      await attachHomes(runConversationId);
    } catch (error) {
      handle.close();
      setLaunched(null);
      console.error("[ai-work/new] hosted launch failed", error);
      toast.error(
        error instanceof Error
          ? `The hosted session could not start — ${error.message}`
          : "The hosted session could not start.",
      );
    } finally {
      setHostedRunning(false);
      setLaunching(false);
    }
  };

  /**
   * Run on the chosen computer: `coding.start` through the relay (run once by its request id),
   * then its Sessions view, open on the new session. A refusal shows the computer's own words.
   */
  const handleRunOnComputer = async () => {
    const plan = computerPlan;
    if (!plan || !requestText.trim()) return;
    setLaunching(true);
    setComputerRefusal(null);
    try {
      // THE coding door: one start path for every /work surface, then filed under the homes.
      setRunStatus(`Starting on ${plan.name} through Matrx 2…`);
      const run = await runOnChosenComputer(browserCodingDoors, plan, requestText.trim());
      setRunStatus(null);
      setStartedRun({ computerName: plan.name, link: run.link });
      toast.success(`Started on ${plan.name} through Matrx 2.`);
      // The result stays here (where it ran, and its filing), with a link to the computer's view.
      void run.filing.then(async (filed) => {
        if ("conversationId" in filed) {
          setLaunched(filed.conversationId);
          await attachHomes(filed.conversationId);
        } else {
          await addHomesToFiling(browserCodingDoors, run.sessionId, homes);
          setFilingNote(filed.pending);
          await refreshFilings();
        }
      });
      setLaunching(false);
    } catch (error) {
      const said = error instanceof Error ? error.message : String(error);
      setComputerRefusal(`${plan.name} said: ${said}`);
      toast.error(`${plan.name} did not start it`, { description: said });
      setLaunching(false);
    }
  };

  const handleRun = async () => {
    if (runsOnDevice !== null) {
      await handleRunOnComputer();
      return;
    }
    if (destination === "claude-code") {
      await handleRunOnMyMac();
      return;
    }
    if (destination === "claude-code-hosted") {
      await handleRunHosted();
      return;
    }
    if (!canRun || !conversationId) return;
    setLaunching(true);
    const handle = openLiveRun({
      conversationId,
      label: savedLabel.trim() || "Your request",
      pending: true,
      instanceId: `ai-work-composer:${conversationId}`,
    });
    try {
      const started = await send(requestText.trim());
      if (!started) {
        // A send gate (organization, scope) stopped it and said why.
        handle.close();
        return;
      }
      handle.update({ conversationId, pending: false });
      setLaunched(conversationId);
      await attachHomes(conversationId);
    } catch (error) {
      handle.close();
      console.error("[ai-work/new] launch failed", error);
      toast.error(
        error instanceof Error
          ? `The run could not start — ${error.message}`
          : "The run could not start.",
      );
    } finally {
      setLaunching(false);
    }
  };

  const handleSave = async () => {
    const label = savedLabel.trim();
    if (!label) {
      toast.error("Give the request a name so you can find it again.");
      return;
    }
    if (!requestText.trim()) {
      toast.error("Write what you want done before saving the request.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        label,
        description: null,
        requestText: requestText.trim(),
        agentId,
        destination,
        skillIds,
        homes,
      };
      if (saved) {
        const result = await updateSavedRequest(saved.id, saved.version, input);
        if (result.status === "saved") {
          setSaved(result.request);
          recordToast.success(
            {
              type: "saved_request",
              id: result.request.id,
              title: result.request.label,
            },
            `Saved "${result.request.label}".`,
          );
        } else if (result.status === "conflict") {
          setSaved(result.current);
          toast.error(
            "Someone else changed this saved request while you were editing. It has been reloaded — apply your change again.",
          );
        } else {
          toast.error("That saved request no longer exists.");
        }
      } else {
        const created = await createSavedRequest(input);
        setSaved(created);
        recordToast.success(
          { type: "saved_request", id: created.id, title: created.label },
          `Saved "${created.label}". Find it in Saved requests.`,
        );
      }
    } catch (error) {
      console.error("[ai-work/new] save failed", error);
      toast.error(
        error instanceof Error
          ? `The request could not be saved — ${error.message}`
          : "The request could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = (step: number) =>
    setOpenStep((current) => (current === step ? -1 : step));

  const scheduleHref = `/schedules/new?agentId=${encodeURIComponent(
    agentId,
  )}&prompt=${encodeURIComponent(requestText.trim())}${
    // Runs on a chosen computer: the schedule is aimed at it (ScheduleForm's Runs on).
    runsOnDevice !== null ? `&runs_on=${encodeURIComponent(runsOnDevice)}${computerScheduleParams(computerPlan)}` : ""
  }`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pt-4">
      {runsOnDevice !== null && (
        <ComputerConnection key={runsOnDevice} deviceId={runsOnDevice} onConnection={setComputerConnection} />
      )}
      <header>
        <div className="flex items-center gap-1.5"><h1 className="text-lg font-semibold text-foreground">Start work</h1><InfoHint text="Say what you want done, choose who does it and what they should know, then run it now or save it." label="About starting work" /></div>
      </header>

      <ComposerSection
        step={1}
        title="Who does the work"
        question="Choose where this work runs."
        answer={
          runsOnDevice !== null
            ? `${computerPlan?.provider === "codex" ? "Codex" : "Claude Code"} on ${runsOnName ?? "your computer"}`
            : destination === "ai-matrx"
            ? "AI Matrx"
            : destination === "claude-code"
              ? "Claude Code on my Mac"
              : destination === "claude-code-hosted"
                ? "Claude Code (hosted)"
                : undefined
        }
        complete
        open={openStep === 1}
        onToggle={() => toggle(1)}
      >
        <RunsOnStep
          deviceId={runsOnDevice}
          connection={computerConnection}
          plan={computerPlan}
          onChange={(deviceId, name) => {
            setRunsOnDevice(deviceId);
            setRunsOnName(name);
          }}
          onPlan={setComputerPlan}
        />
        {runsOnDevice === null && (
          <div className="mt-3">
            <DestinationStep
              value={destination}
              bridgeCapability={bridgeCapability}
              localCapability={localCapability ?? undefined}
              onChange={setDestination}
            />
          </div>
        )}
        {runsOnDevice === null && destination === "claude-code" && localCapability?.available && (
          <div className="mt-3 flex flex-col gap-1.5">
            <label
              htmlFor="ai-work-local-folder"
              className="text-xs font-medium text-foreground"
            >
              Folder on your computer
            </label>
            <Select
              aria-label="Folder on your computer"
              value={localFolder}
              onValueChange={setLocalFolder}
              options={localCapability.approvedFolders.map((folder) => ({
                value: folder,
                label: folder,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              {localCapability.via === "matrx2"
                ? "Folders recently used on that computer are offered."
                : "Only folders you approved in Matrx Local are offered."}{" "}
              The session runs with your own Claude Code login
              {localCapability.claudeAccountLabel
                ? ` (${localCapability.claudeAccountLabel})`
                : ""}
              .
            </p>
          </div>
        )}
        {runsOnDevice === null && destination === "claude-code-hosted" &&
          hostedAvailability.selectable && (
            <HostedBillingStep
              billing={hostedBilling}
              onBillingChange={setHostedBilling}
              status={ownPlanStatus}
              onStatusChange={setOwnPlanStatus}
            />
          )}
      </ComposerSection>

      <ComposerSection
        step={2}
        title="Your request"
        question="Describe the job in your own words."
        answer={requestText.trim() ? requestText.trim().slice(0, 90) : undefined}
        complete={requestText.trim().length > 0}
        open={openStep === 2}
        onToggle={() => toggle(2)}
      >
        {conversationId ? (
          <div className="mb-2 flex min-w-0 items-center gap-1.5">
            <SmartAgentResourcePickerButton
              conversationId={conversationId}
              triggerSize="default"
            />
            <ActiveContextLensChip
              conversationId={conversationId}
              previewOpen={contextPreviewOpen}
              onOpenPreview={() =>
                openContextPreview({ conversationId, agentId })
              }
            />
            <div className="min-w-0 flex-1">
              <ConversationContextRail
                conversationId={conversationId}
                withAttachments
                className="pb-0"
              />
            </div>
          </div>
        ) : null}
        {conversationId ? (
          <AgentTextarea
            conversationId={conversationId}
            surfaceKey="ai-work-composer"
            disableSend
            initiallyExpanded
            placeholder="For example: Read the three attached contracts and list every deadline, who owns it, and what happens if we miss it."
          />
        ) : null}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Plain language is enough. You never have to write a system prompt.
        </p>
      </ComposerSection>

      <ComposerSection
        step={3}
        title="Expert system"
        question="Who should do it?"
        answer={defaultAgentName ?? undefined}
        complete
        open={openStep === 3}
        onToggle={() => toggle(3)}
      >
        <AgentListDropdown
          label="Change the expert system"
          activeAgentId={agentId}
          onSelect={onAgentChange}
          consumerId="ai-work-composer"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          An expert system is a configured AI Matrx agent — its instructions,
          tools, and models are already set up for a kind of work.
        </p>
      </ComposerSection>

      <ComposerSection
        step={4}
        title="Skills"
        question="Add extra expertise for this run."
        answer={skillIds.length > 0 ? `${skillIds.length} added` : undefined}
        complete={skillIds.length > 0}
        open={openStep === 4}
        onToggle={() => toggle(4)}
      >
        {conversationId ? (
          <div className="h-72 overflow-hidden rounded-lg border border-border">
            <RunSkillPicker conversationId={conversationId} />
          </div>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          A skill is reusable know-how. Anything you add here is included in
          this run on top of what the expert system already knows.
        </p>
      </ComposerSection>

      <ComposerSection
        step={5}
        title="Home"
        question="Where should the result live?"
        answer={homes.length > 0 ? `${homes.length} linked` : undefined}
        complete={homes.length > 0}
        open={openStep === 5}
        onToggle={() => toggle(5)}
      >
        <HomeStep homes={homes} onChange={setHomes} />
      </ComposerSection>

      <ComposerSection
        step={6}
        title="Timing"
        question="Run it now, save it, or schedule it."
        open={openStep === 6}
        onToggle={() => toggle(6)}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ai-work-saved-label"
              className="text-xs font-medium text-foreground"
            >
              Save this as a reusable request
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="ai-work-saved-label"
                value={savedLabel}
                onChange={(event) => setSavedLabel(event.target.value)}
                placeholder="Name this request"
              />
              <Button
                icon={saving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <BookmarkPlus />
                )}
                type="button"
                variant="outline"
                onClick={handleSave}
                disabled={saving}
              >
                {saved ? "Update" : "Save"}
              </Button>
            </div>
            {saved && (
              <p className="text-xs text-muted-foreground">
                Saved. Update replaces it.{" "}
                <Link
                  href="/work/requests"
                  className="text-primary hover:underline"
                >
                  Open Saved requests
                </Link>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Button asChild variant="outline">
              <Link href={scheduleHref}>
                <PendingLinkLabel idle="Schedule it instead" pending="Opening the schedule builder…" icon={<CalendarClock className="h-3.5 w-3.5" />} />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              Opens the schedule builder with this expert system and request
              filled in.
            </span>
          </div>
        </div>
      </ComposerSection>

      <ComposerSection
        step={7}
        title="Review and run"
        question="Check what will happen."
        open={openStep === 7}
        onToggle={() => toggle(7)}
      >
        <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">Destination</dt>
          <dd className="text-foreground">
            {runsOnDevice !== null
              ? `${computerPlan?.provider === "codex" ? "Codex" : "Claude Code"} on ${runsOnName ?? "your computer"} — ${computerPlan?.folder || "no folder chosen"}`
              : destination === "claude-code"
              ? `Claude Code on my Mac — ${localFolder || "no folder chosen"}`
              : destination === "claude-code-hosted"
                ? "Claude Code in a Matrx Sandbox we start for you"
                : "AI Matrx"}
          </dd>
          {destination === "claude-code-hosted" && (
            <>
              <dt className="text-muted-foreground">Paid by</dt>
              <dd className="text-foreground">
                {hostedBilling === "own_plan"
                  ? "Your Claude plan"
                  : "AI Matrx credits"}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Expert system</dt>
          <dd className="text-foreground">
            {runsOnDevice !== null
              ? "The coding app itself (that computer's own configuration)"
              : destination === "claude-code"
              ? "Claude Code itself (your Mac's own configuration)"
              : (defaultAgentName ?? "The selected agent")}
          </dd>
          <dt className="text-muted-foreground">Added skills</dt>
          <dd className="text-foreground">
            {/* read-gate-exempt: skills the person added in this composer, not a fetched list */}
            {skillIds.length > 0 ? `${skillIds.length}` : "None"}
          </dd>
          <dt className="text-muted-foreground">Filed under</dt>
          <dd className="text-foreground">
            {homes.length > 0
              ? homes.map((home) => home.label).join(", ")
              : // read-gate-exempt: homes are the person's own picks in this composer (a failed saved-request restore toasts)
                "Nothing yet"}
          </dd>
          <dt className="text-muted-foreground">Where it goes</dt>
          <dd className="text-foreground">
            A conversation in your account. Open it and new turns and tool
            activity appear there every few seconds while the run is going.
          </dd>
        </dl>
      </ComposerSection>

      {/* ── The result, where Run is: which computer runs it (or why Matrx Local
           is tried), progress, where it ran, and any start not in AI Matrx yet. */}
      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground" aria-live="polite">
        {runsOnDevice === null && destination === "claude-code" ? (
          <span>{localCapability ? localCapability.notice : "Checking your computer…"}</span>
        ) : null}
        {launching && runStatus ? <span className="text-foreground">{runStatus}</span> : null}
        {startedRun ? (
          <span className="text-foreground">
            Started on {startedRun.computerName} through Matrx 2.{" "}
            {startedRun.link ? (
              <OpenOnComputerLink href={startedRun.link} name={startedRun.computerName} />
            ) : null}
          </span>
        ) : null}
        {waitingFilings.map((filing) => (
          <div key={filing.sessionId} className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              {delivering === filing.sessionId ? `Delivering on ${filing.computerName}… ` : null}
              Not in AI Matrx yet: {filingNote && startedRun?.computerName === filing.computerName ? filingNote : filingPendingSentence(filing.computerName)}
            </span>
            <Button variant="outline" disabled={delivering === filing.sessionId} onClick={() => void deliverFiling(filing)}>
              Deliver
            </Button>
            <Button variant="quiet" disabled={delivering === filing.sessionId} onClick={() => void dismissFiling(filing)}>
              Dismiss
            </Button>
          </div>
        ))}
      </div>

      {/* No bottom padding of its own: the page end below it is already the page's (measured 28px = 12 + 16, walk2). */}
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-background/95 pt-3 backdrop-blur">
        <Button icon={launching ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Play />
          )} variant="primary" onClick={handleRun} disabled={!canRun || launching}>
          Run it now
        </Button>
        {!requestText.trim() && (
          <span className="text-xs text-muted-foreground">
            Write your request first.
          </span>
        )}
        {runsOnDevice !== null && requestText.trim() && !computerPlan && !computerRefusal && (
          <span className="text-xs text-muted-foreground">
            Choose a coding app and a folder on {runsOnName ?? "the computer"}.
          </span>
        )}
        {computerRefusal && (
          <span data-testid="runs-on-refusal">
            <ErrorNotice size="inline" className="text-xs" message={computerRefusal} />
          </span>
        )}
        {destination === "claude-code-hosted" && !ownPlanReady && (
          <span className="text-xs text-muted-foreground">
            {ownPlanStatus?.state === "signed_in_not_plan"
              ? "Sign in with a Claude plan, or use AI Matrx credits."
              : "Connect your Claude account first."}
          </span>
        )}
        <HostedRunControls
          running={hostedRunning}
          runtimeId={hostedRuntimeId}
          onCancelled={() => setHostedRunning(false)}
        />
        {launched && (
          <Link
            // A local OR hosted Claude Code run mirrors into an AGENTLESS
            // provider conversation; /chat/[id] redirects those to /chat/new,
            // so the user loses the run they just started. Route mirrors to
            // the provider detail view, agent-backed runs to chat.
            href={
              destination === "claude-code" ||
              destination === "claude-code-hosted"
                ? `/work/conversations/${launched}`
                : `/chat/${launched}`
            }
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open the conversation
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
