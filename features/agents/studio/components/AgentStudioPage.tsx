"use client";

/**
 * Agent Studio (`/agents/new/studio`) — ONE agent: LEFT the assistant (a full chat), CENTER the
 * agent being built (a fresh conversation per run), RIGHT plain-word controls. Design + build plan:
 * common-docs/systems/masterwork/agent-creation-studio/DESIGN.md §11; owner's words: VISION.md.
 *
 * Everything the page holds lives in its URL (`studio-state.ts`), so a reload resumes.
 *
 * Mode "Just do it with me" — "Make this an agent":
 *   1. capture: the doer is asked, on its own conversation, what made the result work;
 *   2. inputs:  the from-chat door (`door: "studio"`, `stage: "inputs"`) reads the whole chat and
 *               sends back the inputs the person gave across it, for a confirm card;
 *   3. build:   the confirmed inputs + the approved answer + the capture → an Agent Factory build
 *               (always the factory; its own blind proof review);
 *   4. flip:    the left keeps the same conversation; the center runs a fresh instance of the new
 *               agent on the confirmed inputs, beside the approved answer (a compare INSIDE the
 *               center pane, `StudioCompare`), which is also saved as the agent's first test case.
 *
 * Mode "Improve an agent I have": the picked agent's recent real runs become its test cases, the
 * latest run opens in the center (`?run=`), and the right pane opens on Debrief. Feedback to the
 * assistant revises it through the same builder write targets as "Describe it".
 *
 * Mode "From examples I already have": a factory build whose proof cases are the person's own
 * examples; the center runs the new agent on one example's input beside that example.
 *
 * The page is a focused surface: the shell's own chat stands aside here (`@ai-matrx/chat`
 * `shellChatHostedElsewhere`), so the three panes are the whole width.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlaskConical, ListChecks, RotateCcw } from "lucide-react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { Button, EmptyState, SegmentedControl, Tabs } from "@ai-matrx/design-system/controls";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { useMandate } from "@ai-matrx/chat/mandates/useMandate";
import { useCanvasWorkspaceConversation } from "@ai-matrx/chat/canvas/workspace/useCanvasWorkspaceConversation";
import { smartExecute } from "@ai-matrx/chat/agents/redux/execution-system/thunks/smart-execute.thunk";
import { setUserInputText } from "@ai-matrx/chat/agents/redux/execution-system/instance-user-input/instance-user-input.slice";
import { useMeasure } from "@ai-matrx/kit/hooks";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import { selectInstanceStatus } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversations.selectors";
import {
  extractFlatText,
  selectLatestAnswerText,
  selectLatestAssistantMessageId,
  selectConversationMessages,
  selectMessageById,
  selectOrderedMessageIds,
} from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { runAgainSeed } from "../run-again";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { AGENT_BUILDER_CONTEXT_MENU_PROPS } from "@ai-matrx/chat/agents/agent-context/buildAgentBuilderContextData";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { useDeclaredSurfaceMandates } from "@ai-matrx/chat/surfaces/runtime/surface-mandates";
import { studioLayoutFor, type StudioLayout, type StudioSavedSizes } from "../studio-layout";
import { StudioPanes } from "./StudioPanes";
import { studioStage } from "../studio-stage";
import { useStudioUnsavedEdits } from "../unsaved-edits";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { studioScope } from "@/features/surfaces/manifests/agent-studio.manifest";
import { BuildProgress } from "@/features/agents/factory/components/BuildProgress";
import { getFactoryBuild } from "@/features/agents/factory/service";
import { KEPT_OUTCOMES, type FactoryBuildState } from "@/features/agents/factory/types";
import { fetchAgentContractHead, fetchCandidateRuns, sampleInputText } from "@/features/agents/samples/service";
import { createTestCase, fetchTestCaseRows, saveRunAsTestCase, type TestCaseRow } from "@/features/agent-tests/cases";
import { fetchFullAgent } from "@/features/agents/redux/fetch-full-agent.thunk";
import { useAgentBuilderPageScope } from "@/features/agents/hooks/useAgentBuilderSurfaceScope";
import { AgentBuilderClientTools } from "@/features/agents/hooks/useAgentBuilderClientTools";
import { useAgentBuilderWriteHandlers } from "@/features/agents/hooks/useAgentBuilderWriteHandlers";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { studioMode, studioPageHref, studioStartStep } from "../modes";
import { planImprove, runToSave } from "../improve";
import {
  CHAT_CASE_SOURCE,
  EXAMPLES_CASE_SOURCE,
  approvedAnswerFrom,
  readStudioState,
  studioJobParam,
  studioCaseFromBuild,
  studioCasesFromBuild,
  sampleInputsError,
  studioHref,
  type StudioCase,
  type StudioMessageRecord,
  type StudioState,
} from "../studio-state";
import { STUDIO_ASSISTANT_MANDATE, STUDIO_SURFACE_NAME, buildFromWorkspace, checkMissedInputs } from "../workspace-api";
import { approvalText, codeApprove, type WorkspaceInput } from "../workspace";
import { StudioWorkspacePane, useStudioWorkspace } from "./StudioWorkspacePane";
import { useStudioBuilderFeed } from "../studio-builder-feed";
import { useMandateHostValues } from "@ai-matrx/chat/mandates/host-values/useMandateHostValues";
import { StudioStart, keepStudioDraft } from "./StudioStart";
import { StudioRun } from "./StudioRun";
import { StudioControls, type ControlsTab } from "./StudioControls";
import { StudioTurnModel } from "./StudioTurnModel";
import { PaneBar, PaneLabel } from "./PaneBar";
import { StudioAgentPending } from "./StudioEmpty";
import { StudioCompare } from "./StudioCompare";
import { PlanBackLink, writeAgentToPlanStep } from "./PlanBackLink";

const ASSISTANT_SURFACE = "agent-studio:assistant";
/** The center's runs are the builder page's OWN conversations: they never receive the builder. */
const tryKey = (agentId: string) => `agent-builder:${agentId}`;
/** The assistant is a MANDATE (the server resolves its holder); the page never names an agent for it. */
const ASSISTANT_MANDATE = storedMandateKey(STUDIO_ASSISTANT_MANDATE);
const ASSISTANT_DOES = "does the job with you, then turns it into an agent";
/** The Studio's fixed job, in the top Agents menu (never on the page). */
const STUDIO_DISCLOSURE = [{ mandateKey: ASSISTANT_MANDATE, does: ASSISTANT_DOES }] as const;

type MakePhase =
  | { kind: "idle" }
  | { kind: "approving" }
  | { kind: "checking" }
  | { kind: "suggest"; suggestions: WorkspaceInput[] }
  | { kind: "building" };

/** `savedPaneSizes`: the pane sizes the person last dragged, read from their cookies by the route. */
export function AgentStudioPage({ savedPaneSizes }: { savedPaneSizes?: StudioSavedSizes } = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const state = readStudioState(new URLSearchParams(params.toString()));
  // Patches the URL as it stands NOW: the assistant's and the agent's conversations both report
  // their ids asynchronously, and a patch built on a render's stale state dropped the other's.
  // Patches made before the last replace has landed stack on it (`pendingUrl`): the build's end
  // patches the agent while a conversation id is still settling, and reading `window.location`
  // between the two dropped the agent — Describe stayed on "Build" until a reload (2026-10-18).
  const pendingUrl = useRef<StudioState | null>(null);
  const paramsKey = params.toString();
  useEffect(() => {
    pendingUrl.current = null;
  }, [paramsKey]);
  const go = (patch: Partial<StudioState>) => {
    const next = { ...(pendingUrl.current ?? readStudioState(new URLSearchParams(window.location.search))), ...patch };
    pendingUrl.current = next;
    router.replace(studioHref(next));
  };
  const mode = studioMode(state.mode);
  const planPatch = { planId: state.planId, planStep: state.planStep };
  // A way in that is its own page (Import from Claude, Use Claude Code): its link goes there.
  const pageHref = studioPageHref(state.mode);
  useEffect(() => {
    if (pageHref) router.replace(pageHref);
  }, [pageHref, router]);
  // `?mode=` opens the mode it names: a way in with its own first step (Describe it's box, Improve's
  // agent picker, From my examples' fields) opens on that step until it has started something.
  const startStep = studioStartStep(state);
  if (!mode || startStep) {
    return (
      <StudioStart
        onStart={(patch) => router.push(studioHref({ ...planPatch, ...patch }))}
        onBack={() => router.back()}
        initialJob={studioJobParam(new URLSearchParams(params.toString()))}
        initialMode={startStep ?? undefined}
        planLink={<PlanBackLink state={state} />}
      />
    );
  }
  // No key: a mode, an agent arriving or a resize never remounts the workspace (its hooks restart in place).
  return <StudioWorkspace state={state} go={go} savedPaneSizes={savedPaneSizes} />;
}

function StudioWorkspace({
  state,
  go,
  savedPaneSizes,
}: {
  state: StudioState;
  go: (p: Partial<StudioState>) => void;
  savedPaneSizes?: StudioSavedSizes;
}) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const router = useRouter();
  const isMobile = useIsMobile();
  // The layout follows the workspace's OWN width, not the window's: Watch AI or the Builder panel
  // opening beside the Studio takes half a 1440 screen, and three panes must never squeeze into it.
  const [bodyRef, { width: bodyWidth }] = useMeasure<HTMLDivElement>();
  // Before the first measure the layout is the device's guess; a correction only re-styles the slots.
  const layout: StudioLayout = bodyWidth === null ? (isMobile ? "tabs" : "three") : studioLayoutFor(bodyWidth);
  const mode = studioMode(state.mode)!;
  const { mandate, error: doerError } = useMandate(ASSISTANT_MANDATE);
  useDeclaredSurfaceMandates(STUDIO_DISCLOSURE);
  const assistantReady = Boolean(mandate);

  const [build, setBuild] = useState<FactoryBuildState | null>(null);
  /** "Run again" / a picked case: the inputs the NEXT fresh run launches with (null = the first run's own seed). */
  const [rerunSeed, setRerunSeed] = useState<{ variables: Record<string, string>; userInput: string; autoRun?: boolean } | null>(null);
  const [phase, setPhase] = useState<MakePhase>({ kind: "idle" });
  /** Phone tabs open on the most useful pane: the agent and its run once there is an agent, else the assistant. */
  const [paneTab, setPaneTab] = useState<"assistant" | "agent" | "controls">(
    mode.id === "improve" || state.agentId ? "agent" : "assistant",
  );
  /** Two-pane layout: which one the side column shows beside the agent. */
  const [side, setSide] = useState<"assistant" | "controls">("assistant");
  /** The controls' tab, held here so a layout change (which re-parents the panes) keeps it. */
  const [controlsTab, setControlsTab] = useState<ControlsTab>(mode.id === "improve" ? "debrief" : "settings");
  /** Show the agent's pane where the layout hides it (tabs only; two and three always show it). */
  const showAgent = () => {
    if (layout === "tabs") setPaneTab("agent");
  };
  const hasAnswer = useAppSelector((s) => (state.chatId ? selectLatestAnswerText(state.chatId)(s).trim().length > 0 : false));
  const agentName = useAppSelector((s) => (state.agentId ? selectAgentById(s, state.agentId)?.name : undefined));

  // The agent the build kept: load it into the builder record (settings, save path, write targets).
  const [agentRefused, setAgentRefused] = useState<{ id: string; error: unknown } | null>(null);
  useEffect(() => {
    const id = state.agentId;
    if (!id) return;
    void dispatch(fetchFullAgent(id))
      .unwrap()
      .then(
        () => setAgentRefused(null),
        (error: unknown) => setAgentRefused({ id, error }),
      );
  }, [state.agentId, dispatch]);

  // The build's own record holds the original request + approved answer (mode 2).
  useEffect(() => {
    if (!state.buildId) return;
    let live = true;
    void getFactoryBuild(state.buildId).then(
      (d) => {
        if (live) setBuild(d?.state ?? null);
      },
      (e: unknown) => {
        if (live) toast.error("The build's cases did not load", { description: e instanceof Error ? e.message : String(e) });
      },
    );
    return () => {
      live = false;
    };
  }, [state.buildId, state.agentId]);
  const studioCase: StudioCase | null =
    mode.id === "do-with-me"
      ? studioCaseFromBuild(build, CHAT_CASE_SOURCE)
      : mode.id === "from-examples"
        ? studioCaseFromBuild(build, EXAMPLES_CASE_SOURCE)
        : null;
  // An unparseable saved-cases record is said once per build, after mount (never during render).
  const casesError = sampleInputsError(build);
  useEffect(() => {
    if (casesError) {
      toast.error("The saved example cases could not be read", {
        id: "studio-sample-inputs-unreadable",
        description: casesError,
      });
    }
  }, [casesError]);
  /** The run seed a case gives: only when the case carries an input (an example may not). */
  const caseSeed =
    studioCase && (studioCase.userInput.trim() || Object.keys(studioCase.variables).length > 0)
      ? { variables: studioCase.variables, userInput: studioCase.userInput }
      : null;
  /**
   * A first test of an agent with no run yet fills the inputs from its first saved test case (never
   * runs by itself); no test case → the fields stay empty and the person fills them in.
   */
  const [sampleSeed, setSampleSeed] = useState<{ variables: Record<string, string>; userInput: string; autoRun: false } | null>(null);
  const [sampleFor, setSampleFor] = useState<string | null>(null);
  const sampleReady = !state.agentId || Boolean(state.runId) || Boolean(caseSeed) || sampleFor === state.agentId;
  useEffect(() => {
    const id = state.agentId;
    if (!id || state.runId || caseSeed || sampleFor === id) return;
    let live = true;
    void fetchTestCaseRows(id).then(
      (rows) => {
        if (!live) return;
        for (const row of rows) {
          const variables: Record<string, string> = {};
          if (row.variables && typeof row.variables === "object" && !Array.isArray(row.variables)) {
            for (const [k, v] of Object.entries(row.variables)) {
              if (v !== null && v !== undefined && v !== "") variables[k] = typeof v === "string" ? v : JSON.stringify(v);
            }
          }
          const userInput = sampleInputText(row);
          if (Object.keys(variables).length > 0 || userInput.trim()) {
            setSampleSeed({ variables, userInput, autoRun: false });
            break;
          }
        }
        setSampleFor(id);
      },
      (e: unknown) => {
        if (!live) return;
        toast.error("Its test cases did not load", { description: e instanceof Error ? e.message : String(e) });
        setSampleFor(id);
      },
    );
    return () => {
      live = false;
    };
  }, [state.agentId, state.runId, caseSeed, sampleFor]);
  /** Bumped when the agent's test cases change, so the Cases list re-reads them. */
  const [casesVersion, setCasesVersion] = useState(0);

  // Mode "Improve": the latest real run opens in the center (read only; nothing is saved on open).
  // A run becomes a test case only when the person presses "Save as test case" on it. The center
  // waits until that run is in the URL (or the agent has none), so it never starts a fresh run on
  // top of the one it is about to open.
  const [improveSettled, setImproveSettled] = useState(false);
  const [improveLatest, setImproveLatest] = useState<string | null>(null);
  const improveReady = mode.id !== "improve" || Boolean(state.runId) || improveSettled;
  const plannedFor = useRef<string | null>(null);
  useEffect(() => {
    const agentId = state.agentId;
    if (mode.id !== "improve" || !agentId || plannedFor.current === agentId) return;
    plannedFor.current = agentId;
    void (async () => {
      try {
        const runs = await fetchCandidateRuns(agentId, { limit: 15 });
        const plan = planImprove(runs);
        if (plan.latest && !state.runId) setImproveLatest(plan.latest.conversationId);
        setImproveSettled(true);
      } catch (e) {
        toast.error("Its recent runs did not load", { description: e instanceof Error ? e.message : String(e) });
        setImproveSettled(true);
      }
    })();
  }, [mode.id, state.agentId, state.runId, go]);

  // ── the two conversations: the platform's canvas hook, twice (Lane 2G launch + param) ──
  /** The assistant: its own key per mode (a new mode starts a new chat in place), named at `?chat=`. */
  const assistantKey = `${ASSISTANT_SURFACE}:${mode.id}`;
  const assistant = useCanvasWorkspaceConversation(assistantKey, {
    enabled: assistantReady,
    start: state.chatId ? { kind: "open", conversationId: state.chatId } : { kind: "new" },
    launch: { mandateKey: ASSISTANT_MANDATE, sourceFeature: "agent-studio", surfaceName: STUDIO_SURFACE_NAME },
    address: { link: null, open: true, hostedElsewhere: false, param: "chat" },
  });
  /**
   * The person's EXACT words for the flip: the first message she sent the assistant (never the build's
   * paraphrase, which dropped "under 300 characters" on 2026-10-21).
   */
  const firstTyped = useAppSelector((s) => {
    if (mode.id !== "do-with-me" || !state.chatId) return "";
    const first = (selectConversationMessages(state.chatId)(s) as StudioMessageRecord[]).find((m) => m.role === "user");
    return first ? extractFlatText(first as never).trim() : "";
  });
  const flipSeed = caseSeed ? { ...caseSeed, userInput: firstTyped || caseSeed.userInput } : null;
  /** The agent's run: keyed by the agent (its arrival restarts the hook in place), named at `?run=`. */
  const runSurfaceKey = state.agentId ? tryKey(state.agentId) : "agent-studio:run:none";
  const launchSeed: { variables: Record<string, string>; userInput: string; autoRun?: boolean } | null =
    rerunSeed ?? flipSeed ?? sampleSeed;
  const launchRuns = launchSeed ? launchSeed.autoRun !== false : false;
  const run = useCanvasWorkspaceConversation(runSurfaceKey, {
    enabled: Boolean(state.agentId) && !agentRefused && improveReady && sampleReady,
    start: state.runId
      ? { kind: "open", conversationId: state.runId, agentId: state.agentId ?? null }
      : state.agentId
        ? { kind: "agent", agentId: state.agentId }
        : { kind: "new" },
    launch: {
      mandateKey: ASSISTANT_MANDATE, // never used: this hook only opens and launches the agent itself
      sourceFeature: "agent-studio",
      config: { displayMode: "direct", allowChat: true, autoRun: launchRuns, showVariablePanel: true },
      ...(launchSeed
        ? {
            runtime: {
              ...(Object.keys(launchSeed.variables).length > 0 ? { variables: launchSeed.variables } : {}),
              ...(launchSeed.userInput ? { userInput: launchSeed.userInput } : {}),
            },
          }
        : {}),
      initiation: launchRuns && rerunSeed ? "user" : "auto",
    },
    address: { link: null, open: true, hostedElsewhere: false, param: "run" },
  });
  const runConversation = run.conversationId;
  // Improve: the latest real run opens in place (read only), never a fresh paid one.
  useEffect(() => {
    if (improveLatest) run.openExisting(improveLatest, state.agentId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per latest run found
  }, [improveLatest]);

  /** "Save as test case" on the run on screen: an eval test case (kind='test_case'), its answer approved. */
  const [savingCase, setSavingCase] = useState(false);
  const [savedRuns, setSavedRuns] = useState<ReadonlySet<string>>(new Set());
  const shownRun = runConversation ?? state.runId;
  /** "Run again" only once something ran: the shown conversation holds a message the person sent (a blank one is not a run). */
  const hasRun = useAppSelector((s) =>
    shownRun ? (selectConversationMessages(shownRun)(s) as StudioMessageRecord[]).some((m) => m.role === "user") : false,
  );
  const saveRunAsCase = async () => {
    const agentId = state.agentId;
    if (!agentId || !shownRun) return;
    setSavingCase(true);
    try {
      const [runs, cases] = await Promise.all([fetchCandidateRuns(agentId, { limit: 25 }), fetchTestCaseRows(agentId)]);
      const already = new Set(cases.map((x) => x.source_conversation_id).filter((id): id is string => Boolean(id)));
      const target = runToSave(runs, shownRun, new Set([...already, ...savedRuns]));
      if (target === "already") {
        setSavedRuns((prev) => new Set(prev).add(shownRun));
        toast.info("This run is already a test case");
      } else if (!target) {
        toast.error("This run is not saved yet", { description: "Send it first, then save it as a test case" });
      } else {
        await saveRunAsTestCase({ agentId, run: target, head: await fetchAgentContractHead(agentId) });
        setSavedRuns((prev) => new Set(prev).add(shownRun));
        setCasesVersion((v) => v + 1);
        toast.success("Saved as a test case");
      }
    } catch (e) {
      toast.error("It did not become a test case", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingCase(false);
    }
  };

  // (c) The approved answer becomes the agent's first test case, once ("From examples": every
  // example becomes one, with the input it was made from when the person gave it).
  const savedCaseFor = useRef<string | null>(null);
  useEffect(() => {
    const agentId = state.agentId;
    if (!agentId || !studioCase?.approved || savedCaseFor.current === agentId) return;
    savedCaseFor.current = agentId;
    const fromExamples = mode.id === "from-examples";
    const cases = fromExamples ? studioCasesFromBuild(build, EXAMPLES_CASE_SOURCE) : [studioCase];
    void (async () => {
      try {
        if ((await fetchTestCaseRows(agentId)).length > 0) return;
        const head = await fetchAgentContractHead(agentId);
        for (const [i, c] of cases.entries()) {
          await createTestCase({
            agentId,
            label: fromExamples ? `Your example ${i + 1}` : "Approved in the Studio",
            variables: c.variables,
            userInput: c.userInput,
            approvedAnswer: c.approved,
            head,
          });
        }
        setCasesVersion((v) => v + 1);
        toast.success(fromExamples ? "Your examples are its test cases" : "Your approved result is its first test case");
      } catch (e) {
        toast.error("The first test case did not save", { description: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [state.agentId, studioCase, build, mode.id]);

  // Opened from an Orchestra Studio step: the kept agent is written back onto that step, once.
  const wroteBackFor = useRef<string | null>(null);
  useEffect(() => {
    const { agentId, planId, planStep } = state;
    const key = `${agentId}:${agentName ?? ""}`;
    if (!agentId || !planId || !planStep || wroteBackFor.current === key) return;
    wroteBackFor.current = key;
    void writeAgentToPlanStep(planId, Number(planStep), agentId, agentName ?? null).catch((e: unknown) =>
      toast.error("The plan step was not updated", { description: e instanceof Error ? e.message : String(e) }),
    );
  }, [state, agentName]);

  /** The page's offered values ride EVERY turn through the host-values channel (ids and where we are only). */
  useMandateHostValues(
    ASSISTANT_MANDATE,
    "agent_studio.do_the_job_together",
    {
      studio_mode: mode.id,
      studio_phase: state.agentId ? "improving" : state.buildId ? "building" : "doing",
      agent_id: state.agentId ?? undefined,
      build_id: state.buildId ?? undefined,
    },
    // hostSuppliesContext: the page's frame is not something the person attached, so her bubble
    // carries no display-only "N sent" receipt chip (lane 1B found it back after the hand hook went).
    { everyTurn: true, hostSuppliesContext: true },
  );

  /**
   * One turn into the assistant's OPEN conversation (feedback from the controls) through the composer's
   * own send path (`smartExecute`); the page's values ride it through the host-values channel. What the
   * person had typed in the assistant's box is put back after the send. True only once the turn started.
   */
  const sendToAssistant = async (text: string): Promise<boolean> => {
    const conversationId = assistant.conversationId;
    if (!conversationId) {
      toast.error("The assistant is still opening", { description: "Send it again in a moment" });
      return false;
    }
    const typed = store.getState().instanceUserInput?.byConversationId?.[conversationId]?.text ?? "";
    try {
      dispatch(setUserInputText({ conversationId, text }));
      const sent = dispatch(smartExecute({ conversationId, surfaceKey: assistantKey }));
      if (typed) dispatch(setUserInputText({ conversationId, text: typed }));
      await sent.unwrap();
      return true;
    } catch (e) {
      toast.error("The assistant did not get your message", { description: e instanceof Error ? e.message : String(e) });
      return false;
    }
  };

  /** The latest answer that actually came back — never a refused or failed turn. */
  const readApproved = (chatId: string) => {
    const s = store.getState();
    const ids = selectOrderedMessageIds(chatId)(s);
    const byId: Record<string, StudioMessageRecord | undefined> = {};
    for (const id of ids) byId[id] = selectMessageById(chatId, id)(s) as StudioMessageRecord | undefined;
    return approvedAnswerFrom(ids, byId);
  };

  // Applied-but-unsaved edits to the agent live on the assistant's conversation and come back on reload.
  useStudioUnsavedEdits(state.agentId, state.chatId);

  /** The assistant's turn ended (complete/error/paused for a person): the mark the workspace re-reads on. */
  const assistantTurnEnded = useAppSelector((s) => {
    if (!state.chatId) return null;
    const status = selectInstanceStatus(state.chatId)(s);
    if (status !== "complete" && status !== "error" && status !== "paused") return null;
    return `${status}:${selectLatestAssistantMessageId(state.chatId)(s) ?? ""}`;
  });
  const { ws, edit } = useStudioWorkspace(state.chatId ?? null, assistantTurnEnded);
  useStudioBuilderFeed(state.chatId ?? null, ws);
  const [dropped, setDropped] = useState<ReadonlySet<string>>(new Set());

  // Reload restores the exact stage: the URL carries chat + build + agent, and when it lost them (a bare
  // reopen with only the chat) the workspace record — which the server stamps with the build at start —
  // and then the build's own record bring them back.
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    const recorded = ws?.build;
    if (recorded?.build_id && !state.buildId && restoredFor.current !== recorded.build_id) {
      restoredFor.current = recorded.build_id;
      go({ buildId: recorded.build_id, ...(recorded.agent_id ? { agentId: recorded.agent_id } : {}) });
    }
  }, [ws?.build, state.buildId, go]);
  const agentRestoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (build?.agent_id && build.outcome && KEPT_OUTCOMES.has(build.outcome) && !state.agentId && agentRestoredFor.current !== build.agent_id) {
      agentRestoredFor.current = build.agent_id;
      go({ agentId: build.agent_id });
    }
  }, [build, state.agentId, go]);

  /** "Make this an agent": approve (code), optional missed-inputs check, then the workspace goes to the factory. */
  const makeThisAnAgent = async () => {
    const chatId = state.chatId;
    if (!chatId) return;
    const approved = readApproved(chatId);
    if (!approved?.text.trim()) {
      toast.error("Get a result you like first");
      return;
    }
    try {
      setPhase({ kind: "approving" });
      const ids = selectOrderedMessageIds(chatId)(store.getState());
      // The deliverable the person approved, never the chat reply around it (2026-10-18).
      await edit((w) => codeApprove(w, approvalText(w, approved.text), ids.indexOf(approved.id) + 1 || null));
      setPhase({ kind: "checking" });
      let suggestions: WorkspaceInput[] = [];
      try {
        const check = await checkMissedInputs(dispatch, chatId);
        suggestions = check.suggestions;
        if (!check.checked && check.reason) toast.info("Skipped the check for missed inputs", { description: check.reason });
      } catch (e) {
        toast.info("Skipped the check for missed inputs", { description: e instanceof Error ? e.message : String(e) });
      }
      if (suggestions.length > 0) {
        setDropped(new Set());
        setPhase({ kind: "suggest", suggestions });
        return;
      }
      await buildNow([]);
    } catch (e) {
      setPhase({ kind: "idle" });
      toast.error("Making the agent stopped", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const buildNow = async (accepted: WorkspaceInput[]) => {
    if (!state.chatId) return;
    setPhase({ kind: "building" });
    try {
      const started = await buildFromWorkspace(dispatch, state.chatId, accepted);
      setPhase({ kind: "idle" });
      go({ buildId: started.buildId });
      showAgent();
    } catch (e) {
      setPhase({ kind: "idle" });
      toast.error("The build did not start", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const onBuildFinished = (s: FactoryBuildState) => {
    setBuild(s);
    if (s.agent_id && s.outcome && KEPT_OUTCOMES.has(s.outcome)) go({ agentId: s.agent_id });
  };

  /**
   * The top Run button. Nothing ran yet → it SENDS what is filled in on the run on screen (the typed
   * input is never thrown away); after a run → a NEW conversation on the same inputs, fresh every time.
   */
  const runAgain = () => {
    const agentId = state.agentId;
    if (!agentId) return;
    if (!hasRun && runConversation) {
      void dispatch(smartExecute({ conversationId: runConversation, surfaceKey: runSurfaceKey }))
        .unwrap()
        .catch((e: unknown) =>
          toast.error("The run did not start", { description: e instanceof Error ? e.message : String(e) }),
        );
      return;
    }
    if (runConversation) {
      const again = runAgainSeed(store.getState(), runConversation);
      setRerunSeed(again ? { ...again, autoRun: true } : null);
    }
    run.startWith(agentId);
  };

  /** A saved test case, run fresh in the center. */
  const runCase = (sample: TestCaseRow) => {
    if (!state.agentId) return;
    const variables: Record<string, string> = {};
    if (sample.variables && typeof sample.variables === "object" && !Array.isArray(sample.variables)) {
      for (const [k, v] of Object.entries(sample.variables)) {
        if (v !== null && v !== undefined && v !== "") variables[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
    }
    setRerunSeed({ variables, userInput: sampleInputText(sample), autoRun: true });
    run.startWith(state.agentId);
    showAgent();
  };

  // ── panes ──
  const left = doerError ? (
    <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="The assistant is unavailable" line={doerError} />
  ) : !assistantReady ? (
    <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Getting your assistant ready" />
  ) : (
    <StudioRun conversation={assistant.conversation} surfaceKey={assistantKey} operation="Open the Studio assistant" />
  );

  let center: React.ReactNode;
  if (phase.kind === "suggest") {
    center = (
      <EmptyState
        icon={<AGENT_ICON className="h-5 w-5" />}
        title="We found inputs you may have given"
        line="Keep or drop each one in your workspace, then build the agent"
        action={
          <div className="flex gap-2">
            <Button variant="quiet" onClick={() => setPhase({ kind: "idle" })}>
              Not yet
            </Button>
            <Button variant="primary" data-testid="studio-build-agent" onClick={() => void buildNow([])}>
              Build the agent
            </Button>
          </div>
        }
      />
    );
  } else if (phase.kind !== "idle") {
    center = (
      <EmptyState
        icon={<AGENT_ICON className="h-5 w-5" />}
        title={
          phase.kind === "approving"
            ? "Saving the result you approved"
            : phase.kind === "checking"
              ? "Checking for inputs you may have given"
              : "Starting the build"
        }
      />
    );
  } else if (state.agentId && agentRefused?.id === state.agentId) {
    center = <AccessGate token="agent" id={state.agentId} error={agentRefused.error} fallbackHref={studioHref({})} fallbackLabel="Agent Studio" />;
  } else if (state.agentId && (!improveReady || !sampleReady)) {
    center = <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Opening its latest run" />;
  } else if (state.agentId) {
    const runPane = (
      <StudioRun conversation={run.conversation} surfaceKey={runSurfaceKey} turnModelBar={!studioCase?.approved} operation="Run the agent" />
    );
    center = studioCase?.approved ? (
      <StudioCompare
        run={runPane}
        original={studioCase.approved}
        originalLabel={mode.id === "from-examples" ? "Your example" : "Approved"}
        phone={isMobile}
        toolbar={runConversation ? <StudioTurnModel conversationId={runConversation} /> : null}
      />
    ) : (
      runPane
    );
  } else if (state.buildId) {
    center = (
      <div className="h-full overflow-y-auto p-3">
        <BuildProgress
          buildId={state.buildId}
          onFinished={onBuildFinished}
          onRebuilt={(id) => go({ buildId: id })}
          onKept={(id) => go({ agentId: id })}
          onEditDescription={(description) => {
            keepStudioDraft(description);
            router.push(studioHref({ mode: "describe", planId: state.planId, planStep: state.planStep }));
          }}
        />
      </div>
    );
  } else {
    center =
      mode.id === "improve" ? (
        <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Pick an agent to improve" />
      ) : (
        <StudioAgentPending mode={mode.id === "do-with-me" ? "do-with-me" : "describe"} hasAnswer={hasAnswer} />
      );
  }

  const suggestions = phase.kind === "suggest" ? phase.suggestions.filter((x) => !dropped.has(x.name)) : [];
  const workspaceSide = !state.agentId && mode.id === "do-with-me";
  const right = workspaceSide ? (
    <div className="flex h-full min-h-0 flex-col">
      <PaneBar>
        <PaneLabel>Workspace</PaneLabel>
      </PaneBar>
      <div className="min-h-0 flex-1">
        <StudioWorkspacePane
          ws={ws}
          edit={edit}
          suggestions={suggestions}
          onDropSuggestion={(name) => setDropped((d) => new Set(d).add(name))}
        />
      </div>
    </div>
  ) : (
    <StudioControls
      agentId={state.agentId}
      runConversationId={runConversation}
      onFeedback={async (text) => {
        const sent = await sendToAssistant(text);
        // The reply comes in the assistant's chat: bring it into view where the layout hides it.
        if (sent && layout === "two") setSide("assistant");
        if (sent && layout === "tabs") setPaneTab("assistant");
        return sent;
      }}
      onSaved={runAgain}
      onUseCase={runCase}
      casesVersion={casesVersion}
      tab={controlsTab}
      onTabChange={setControlsTab}
    />
  );
  const rightName = workspaceSide ? "Workspace" : "Controls";
  /** The center before a run is on screen gets the same top row, so the panes' hairlines line up. */
  const centerHasBar = Boolean(state.agentId && improveReady && phase.kind === "idle");
  const centerPane = centerHasBar ? (
    center
  ) : (
    <div className="flex h-full min-h-0 flex-col">
      <PaneBar>
        <PaneLabel>{state.agentId ? (agentName ?? "Your agent") : "Your agent"}</PaneLabel>
      </PaneBar>
      <div className="min-h-0 flex-1">{center}</div>
    </div>
  );
  const assistantPane = (
    <div className="flex h-full min-h-0 flex-col">
      <PaneBar>
        <PaneLabel>Assistant</PaneLabel>
      </PaneBar>
      <div className="min-h-0 flex-1">{left}</div>
    </div>
  );

  const making = phase.kind !== "idle";
  const stage = studioStage({
    mode: mode.id,
    making,
    buildId: state.buildId ?? null,
    agentId: state.agentId ?? null,
    runOpen: Boolean(shownRun),
  });
  const compactHeader = layout !== "three";
  /** What a chat that FOLLOWS this page sees (never the page's own two conversations). */
  const surfaceValues = {
    studio_mode: mode.id,
    studio_phase: making ? "making" : state.agentId ? "improving" : state.buildId ? "building" : "doing",
    studio_agent: state.agentId ? { id: state.agentId, name: agentName ?? null } : undefined,
    studio_build: state.buildId ? { id: state.buildId, outcome: build?.outcome ?? null } : undefined,
    studio_run: shownRun ? { conversation_id: shownRun, has_run: hasRun } : undefined,
  };

  // The page top is the record template (core-route-headers): back, the agent (or the mode) as the record,
  // the stage steps centered, the actions right. It renders in the shell header, never in the body.
  const header = (
    <RecordPageHeader
      backHref={studioHref({})}
      record={state.agentId ? { name: agentName ?? "Your agent", token: "agent", id: state.agentId } : { name: mode.title }}
      steps={{ steps: stage.steps, current: stage.current, labels: compactHeader ? "current" : "all", ariaLabel: "Where you are" }}
      actions={[
        ...(state.planId
          ? [{ label: state.planStep ? `Plan step ${state.planStep}` : "Plan", icon: ListChecks, href: `/agents/orchestra-studio?plan=${encodeURIComponent(state.planId)}`, showLabel: true }]
          : []),
        ...(state.agentId && shownRun
          ? [
              {
                label: savedRuns.has(shownRun) ? "Saved as test case" : "Save as test case",
                icon: FlaskConical,
                showLabel: !compactHeader,
                disabled: savingCase || savedRuns.has(shownRun),
                onPress: () => void saveRunAsCase(),
              },
            ]
          : []),
        ...(mode.id === "do-with-me" && !state.buildId
          ? [{ label: "Make this an agent", icon: AGENT_ICON, primary: true, pinnedOnPhone: true, disabled: !state.chatId || making, onPress: () => void makeThisAnAgent() }]
          : []),
        ...(state.agentId ? [{ label: hasRun ? "Run again" : "Run", icon: RotateCcw, primary: true, pinnedOnPhone: true, onPress: runAgain }] : []),
      ]}
    />
  );

  // ── ONE pane tree: one resizable group whose panels never unmount; a layout change only sets sizes ──
  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={layout === "tabs" ? "shrink-0 border-b border-border px-2" : "hidden"}>
        <Tabs
          value={paneTab}
          onValueChange={(v) => setPaneTab(v as typeof paneTab)}
          data={[
            { value: "assistant", label: "Assistant" },
            { value: "agent", label: "Agent" },
            { value: "controls", label: rightName },
          ]}
          aria-label="Studio panes"
        />
      </div>
      <StudioPanes
        layout={layout}
        ui={{ side, tab: paneTab }}
        saved={savedPaneSizes ?? {}}
        switchBar={
          <PaneBar>
            <SegmentedControl
              aria-label="Beside your agent"
              value={side}
              onValueChange={(v) => setSide(v as typeof side)}
              data={[
                { value: "assistant", label: "Assistant" },
                { value: "controls", label: rightName },
              ]}
            />
          </PaneBar>
        }
        panes={{
          assistant: layout === "two" ? <div className="h-full min-h-0">{left}</div> : assistantPane,
          agent: centerPane,
          controls: right,
        }}
      />
    </div>
  );

  return (
    <StudioSurfaceRoot agentId={state.agentId ?? null} runId={runConversation} values={surfaceValues}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-textured pt-[var(--shell-header-h)]" data-testid="agent-studio">
        {header}
        <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col" data-studio-layout={layout}>
          {body}
        </div>
      </div>
    </StudioSurfaceRoot>
  );
}

/**
 * ONE stable surface root for the whole page: its props change when an agent arrives (the Agent Builder's
 * surface, scope and write targets; its client tools), the element never does. The agent's run is the
 * page's own conversation (it never receives the page); the assistant follows the page.
 */
function StudioSurfaceRoot({
  agentId,
  runId,
  values,
  children,
}: {
  agentId: string | null;
  runId: string | null;
  values: Parameters<typeof studioScope>[0];
  children: React.ReactNode;
}) {
  const builderScope = useAgentBuilderPageScope(agentId ?? undefined);
  const builderWrites = useAgentBuilderWriteHandlers(agentId ?? "");
  const getScope = async () => ({ ...(agentId ? await builderScope() : {}), ...studioScope(values) });
  // Only the agent's RUN is the page's own conversation. The assistant FOLLOWS the page: a conversation
  // marked own has its surface stamp cleared by the composer (useConversationFollowsPage), so its turns
  // went out as the route's guess (`matrx-user/agents`) and lost the surface's `studio_workspace` tool
  // (live, 2026-10-21, conversation c855c05b). Its facts also ride the mandate's host values every turn.
  const isOwnConversation = (id: string) => id === runId;
  return (
    <SurfaceRuntimeProvider
      surfaceName={agentId ? AGENT_BUILDER_CONTEXT_MENU_PROPS.surfaceName : STUDIO_SURFACE_NAME}
      getScope={getScope}
      isEditable={Boolean(agentId)}
      getWriteHandlers={agentId ? builderWrites : undefined}
      isOwnConversation={isOwnConversation}
    >
      {agentId ? <AgentBuilderClientTools agentId={agentId} /> : null}
      {children}
    </SurfaceRuntimeProvider>
  );
}
