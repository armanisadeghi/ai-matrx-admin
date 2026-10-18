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

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button, EmptyState, Tabs } from "@ai-matrx/design-system/controls";
import { useIsMobile, useMediaQuery } from "@ai-matrx/kit/media-query";
import { useMandate } from "@ai-matrx/chat/mandates/useMandate";
import { useAgentLauncher } from "@ai-matrx/chat/agents/hooks/useAgentLauncher";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import { selectInstanceStatus } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversations.selectors";
import {
  selectLatestAnswerText,
  selectLatestAssistantMessageId,
  selectConversationMessages,
  selectMessageById,
  selectOrderedMessageIds,
} from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { selectOwnSubmittedFirstTurnValues } from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { AGENT_BUILDER_CONTEXT_MENU_PROPS } from "@ai-matrx/chat/agents/agent-context/buildAgentBuilderContextData";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { STUDIO_MIN_THREE_PANE_PX, STUDIO_PANE_MIN_PX } from "../studio-layout";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
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
import { studioMode } from "../modes";
import { planImprove, runToSave } from "../improve";
import {
  CHAT_CASE_SOURCE,
  EXAMPLES_CASE_SOURCE,
  approvedAnswerFrom,
  readStudioState,
  rerunSeedFrom,
  studioJobParam,
  studioCaseFromBuild,
  studioCasesFromBuild,
  studioHref,
  type StudioCase,
  type StudioMessageRecord,
  type StudioState,
} from "../studio-state";
import { STUDIO_ASSISTANT_MANDATE, STUDIO_SURFACE_NAME, buildFromWorkspace, checkMissedInputs } from "../workspace-api";
import { codeApprove, type WorkspaceInput } from "../workspace";
import { StudioWorkspacePane, useStudioWorkspace } from "./StudioWorkspacePane";
import { useStudioBuilderFeed } from "../studio-builder-feed";
import { StudioStart } from "./StudioStart";
import { StudioRun } from "./StudioRun";
import { StudioControls } from "./StudioControls";
import { StudioCost } from "./StudioCost";
import { StudioPath } from "./StudioEmpty";
import { StudioCompare } from "./StudioCompare";
import { PlanBackLink, writeAgentToPlanStep } from "./PlanBackLink";

const ASSISTANT_SURFACE = "agent-studio:assistant";
/** The center's runs are the builder page's OWN conversations: they never receive the builder. */
const tryKey = (agentId: string) => `agent-builder:${agentId}`;
/** The assistant is a MANDATE (the server resolves its holder); the page never names an agent for it. */
const ASSISTANT_MANDATE = storedMandateKey(STUDIO_ASSISTANT_MANDATE);

type MakePhase =
  | { kind: "idle" }
  | { kind: "approving" }
  | { kind: "checking" }
  | { kind: "suggest"; suggestions: WorkspaceInput[] }
  | { kind: "building" };

export function AgentStudioPage() {
  const router = useRouter();
  const params = useSearchParams();
  const state = readStudioState(new URLSearchParams(params.toString()));
  // Patches the URL as it stands NOW: the assistant's and the agent's conversations both report
  // their ids asynchronously, and a patch built on a render's stale state dropped the other's.
  const go = (patch: Partial<StudioState>) =>
    router.replace(studioHref({ ...readStudioState(new URLSearchParams(window.location.search)), ...patch }));
  const mode = studioMode(state.mode);
  const planPatch = { planId: state.planId, planStep: state.planStep };
  if (!mode) {
    return (
      <StudioStart
        onStart={(patch) => router.push(studioHref({ ...planPatch, ...patch }))}
        onBack={() => router.back()}
        initialJob={studioJobParam(new URLSearchParams(params.toString()))}
        planLink={<PlanBackLink state={state} />}
      />
    );
  }
  return <StudioWorkspace key={state.mode} state={state} go={go} />;
}

function StudioWorkspace({ state, go }: { state: StudioState; go: (p: Partial<StudioState>) => void }) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const router = useRouter();
  const isMobile = useIsMobile();
  // Below the width the three minimums fit in, the panes become tabs (never overlap).
  const tabbedPanes = useMediaQuery(`(max-width: ${STUDIO_MIN_THREE_PANE_PX - 1}px)`);
  const mode = studioMode(state.mode)!;
  const { mandate, error: doerError } = useMandate(ASSISTANT_MANDATE);
  const assistantReady = Boolean(mandate);
  const { launchMandate } = useAgentLauncher();

  const [build, setBuild] = useState<FactoryBuildState | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [runConversation, setRunConversation] = useState<string | null>(null);
  /** Mode 1's "Run again": the last run's own inputs, re-sent on a fresh conversation. */
  const [rerunSeed, setRerunSeed] = useState<{ variables: Record<string, string>; userInput: string } | null>(null);
  const [phase, setPhase] = useState<MakePhase>({ kind: "idle" });
  const [paneTab, setPaneTab] = useState<"assistant" | "agent" | "controls">("assistant");
  /** The assistant's open conversation, kept out of the URL until the person sends something. */
  const [openChat, setOpenChat] = useState<string | null>(null);
  const openChatSent = useAppSelector((s) => (openChat ? selectOrderedMessageIds(openChat)(s).length > 0 : false));
  useEffect(() => {
    if (openChat && openChatSent && openChat !== state.chatId) go({ chatId: openChat });
  }, [openChat, openChatSent, state.chatId, go]);
  const hasAnswer = useAppSelector((s) => (state.chatId ? selectLatestAnswerText(state.chatId)(s).trim().length > 0 : false));
  const agentName = useAppSelector((s) => (state.agentId ? selectAgentById(s, state.agentId)?.name : undefined));

  // The agent the build kept: load it into the builder record (settings, save path, write targets).
  useEffect(() => {
    if (state.agentId) void dispatch(fetchFullAgent(state.agentId));
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
  /** The run seed a case gives: only when the case carries an input (an example may not). */
  const caseSeed =
    studioCase && (studioCase.userInput.trim() || Object.keys(studioCase.variables).length > 0)
      ? { variables: studioCase.variables, userInput: studioCase.userInput }
      : null;
  /** Bumped when the agent's test cases change, so the Cases list re-reads them. */
  const [casesVersion, setCasesVersion] = useState(0);

  // Mode "Improve": the latest real run opens in the center (read only; nothing is saved on open).
  // A run becomes a test case only when the person presses "Save as test case" on it. The center
  // waits until that run is in the URL (or the agent has none), so it never starts a fresh run on
  // top of the one it is about to open.
  const [improveSettled, setImproveSettled] = useState(false);
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
        if (plan.latest && !state.runId) go({ runId: plan.latest.conversationId });
        else setImproveSettled(true);
      } catch (e) {
        toast.error("Its recent runs did not load", { description: e instanceof Error ? e.message : String(e) });
        setImproveSettled(true);
      }
    })();
  }, [mode.id, state.agentId, state.runId, go]);

  /** "Save as test case" on the run on screen: an eval test case (kind='test_case'), its answer approved. */
  const [savingCase, setSavingCase] = useState(false);
  const [savedRuns, setSavedRuns] = useState<ReadonlySet<string>>(new Set());
  const shownRun = runConversation ?? state.runId;
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

  /** The page's offered values, sent on EVERY turn: ids and where we are only (the server builds the rest). */
  const assistantVariables = () => ({
    studio_mode: mode.id,
    studio_phase: state.agentId ? "improving" : state.buildId ? "building" : "doing",
    ...(state.agentId ? { agent_id: state.agentId } : {}),
    ...(state.buildId ? { build_id: state.buildId } : {}),
  });

  /** One turn into the assistant's conversation (feedback from the controls), through the mandate. */
  const sendToAssistant = async (text: string) => {
    if (!state.chatId) {
      toast.error("Say something to the assistant first");
      return false;
    }
    await launchMandate(ASSISTANT_MANDATE, {
      initiation: "user",
      conversationId: state.chatId,
      surfaceKey: ASSISTANT_SURFACE,
      sourceFeature: "agent-studio",
      config: { displayMode: "direct", autoRun: true, allowChat: true },
      runtime: { userInput: text, variables: assistantVariables(), surfaceName: STUDIO_SURFACE_NAME },
    });
    return true;
  };

  /** The latest answer that actually came back — never a refused or failed turn. */
  const readApproved = (chatId: string) => {
    const s = store.getState();
    const ids = selectOrderedMessageIds(chatId)(s);
    const byId: Record<string, StudioMessageRecord | undefined> = {};
    for (const id of ids) byId[id] = selectMessageById(chatId, id)(s) as StudioMessageRecord | undefined;
    return approvedAnswerFrom(ids, byId);
  };

  const { ws, edit } = useStudioWorkspace(state.chatId ?? null);
  useStudioBuilderFeed(state.chatId ?? null, ws);
  const [dropped, setDropped] = useState<ReadonlySet<string>>(new Set());

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
      await edit((w) => codeApprove(w, approved.text, ids.indexOf(approved.id) + 1 || null));
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
      if (isMobile) setPaneTab("agent");
    } catch (e) {
      setPhase({ kind: "idle" });
      toast.error("The build did not start", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const onBuildFinished = (s: FactoryBuildState) => {
    setBuild(s);
    if (s.agent_id && s.outcome && KEPT_OUTCOMES.has(s.outcome)) go({ agentId: s.agent_id });
  };

  /** Fresh every time: a NEW conversation on the same inputs (the case's own, or the last run's). */
  const runAgain = () => {
    if (!caseSeed && runConversation) {
      const s = store.getState();
      const values = selectOwnSubmittedFirstTurnValues(runConversation)(s) as Record<string, unknown> | undefined;
      const messages = selectConversationMessages(runConversation)(s) as StudioMessageRecord[];
      setRerunSeed(rerunSeedFrom(values, messages));
    }
    setRunKey((k) => k + 1);
  };

  /** A saved test case, run fresh in the center. */
  const runCase = (sample: TestCaseRow) => {
    const variables: Record<string, string> = {};
    if (sample.variables && typeof sample.variables === "object" && !Array.isArray(sample.variables)) {
      for (const [k, v] of Object.entries(sample.variables)) {
        if (v !== null && v !== undefined && v !== "") variables[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
    }
    setRerunSeed({ variables, userInput: sampleInputText(sample) });
    setRunKey((k) => k + 1);
    if (isMobile) setPaneTab("agent");
  };

  // ── panes ──
  const left = doerError ? (
    <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="The assistant is unavailable" line={doerError} />
  ) : !assistantReady ? (
    <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Getting your assistant ready" />
  ) : (
    <StudioRun
      mandateKey={ASSISTANT_MANDATE}
      mandateVariables={assistantVariables}
      surfaceName={STUDIO_SURFACE_NAME}
      conversationId={state.chatId}
      surfaceKey={ASSISTANT_SURFACE}
      onConversation={(id) => {
        // Opening the Studio creates nothing: the chat goes into the URL on the first send.
        if (id !== state.chatId) setOpenChat(id);
      }}
    />
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
  } else if (state.agentId && !improveReady) {
    center = <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Opening its latest run" />;
  } else if (state.agentId) {
    // A picked case (Cases tab) or "Run again" wins over the case the build started from.
    const seed = runKey > 0 && rerunSeed ? rerunSeed : (caseSeed ?? rerunSeed);
    const run = (
      <StudioRun
        agentId={state.agentId}
        conversationId={state.runId}
        surfaceKey={tryKey(state.agentId)}
        seed={seed}
        showVariables
        runKey={runKey}
        onConversation={(id) => {
          setRunConversation(id);
          // The run lives in the URL: a reload reopens it instead of starting (and paying for) a new one.
          if (id !== state.runId) go({ runId: id });
        }}
      />
    );
    center = studioCase?.approved ? (
      <StudioCompare
        run={run}
        original={studioCase.approved}
        originalLabel={mode.id === "from-examples" ? "Your example" : "Approved"}
        phone={isMobile}
      />
    ) : (
      run
    );
  } else if (state.buildId) {
    center = (
      <div className="h-full overflow-y-auto p-3">
        <BuildProgress buildId={state.buildId} onFinished={onBuildFinished} onRebuilt={(id) => go({ buildId: id })} onKept={(id) => go({ agentId: id })} />
      </div>
    );
  } else {
    center =
      mode.id === "improve" ? (
        <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Pick an agent to improve" />
      ) : (
        <StudioPath mode={mode.id === "do-with-me" ? "do-with-me" : "describe"} current={hasAnswer ? 1 : 0} />
      );
  }

  const suggestions = phase.kind === "suggest" ? phase.suggestions.filter((x) => !dropped.has(x.name)) : [];
  const right = !state.agentId && mode.id === "do-with-me" ? (
    <StudioWorkspacePane
      ws={ws}
      edit={edit}
      suggestions={suggestions}
      onDropSuggestion={(name) => setDropped((d) => new Set(d).add(name))}
    />
  ) : (
    <StudioControls
      agentId={state.agentId}
      runConversationId={runConversation}
      onFeedback={(text) => void sendToAssistant(text)}
      onSaved={runAgain}
      onUseCase={runCase}
      casesVersion={casesVersion}
      initialTab={mode.id === "improve" ? "debrief" : "settings"}
    />
  );

  const header = (
    <div
      className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-2"
      data-testid="studio-header"
      data-assist-dock-slot="header"
    >
      <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={() => router.push(studioHref({}))} />
      {!isMobile && <span className="shrink-0 text-sm font-semibold text-foreground">Agent Studio</span>}
      <span className="min-w-0 truncate text-xs text-muted-foreground">{agentName ?? mode.title}</span>
      <PlanBackLink state={state} />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <StudioCost
          buildId={state.buildId}
          buildDone={Boolean(state.agentId) || Boolean(build?.outcome)}
          runConversationId={state.agentId ? runConversation : null}
        />
        {mode.id === "do-with-me" && !state.buildId && (
          <Button
            variant="primary"
            data-testid="studio-make-agent"
            disabled={!state.chatId || phase.kind !== "idle"}
            onClick={() => void makeThisAnAgent()}
          >
            Make this an agent
          </Button>
        )}
        {state.agentId && shownRun && (
          <Button
            variant="outline"
            data-testid="studio-save-case"
            disabled={savingCase || savedRuns.has(shownRun)}
            onClick={() => void saveRunAsCase()}
          >
            {savedRuns.has(shownRun) ? "Saved as test case" : "Save as test case"}
          </Button>
        )}
        {state.agentId && (
          <Button variant="outline" icon={<RotateCcw />} aria-label="Run again" onClick={runAgain}>
            {isMobile ? null : "Run again"}
          </Button>
        )}
      </div>
    </div>
  );

  const body = isMobile || tabbedPanes ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-2">
        <Tabs
          value={paneTab}
          onValueChange={(v) => setPaneTab(v as typeof paneTab)}
          data={[
            { value: "assistant", label: "Assistant" },
            { value: "agent", label: "Agent" },
            { value: "controls", label: "Controls" },
          ]}
          aria-label="Studio panes"
        />
      </div>
      <div className="min-h-0 flex-1">
        <div className={paneTab === "assistant" ? "h-full" : "hidden"}>{left}</div>
        <div className={paneTab === "agent" ? "h-full" : "hidden"}>{center}</div>
        <div className={paneTab === "controls" ? "h-full" : "hidden"}>{right}</div>
      </div>
    </div>
  ) : (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
      <ResizablePanel defaultSize="28%" minSize={`${STUDIO_PANE_MIN_PX.assistant}px`} collapsible>
        <div className="h-full min-h-0" data-testid="studio-pane-assistant" data-assist-dock-avoid>{left}</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="44%" minSize={`${STUDIO_PANE_MIN_PX.agent}px`}>
        <div className="h-full min-h-0" data-testid="studio-pane-agent" data-assist-dock-avoid>{center}</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="28%" minSize={`${STUDIO_PANE_MIN_PX.controls}px`} collapsible>
        <div className="h-full min-h-0" data-testid="studio-pane-controls" data-assist-dock-avoid>{right}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );

  const page = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-textured pt-[var(--shell-header-h)]" data-testid="agent-studio">
      {header}
      {body}
    </div>
  );
  return state.agentId ? <BuilderSurface agentId={state.agentId}>{page}</BuilderSurface> : <StudioSurface>{page}</StudioSurface>;
}

/**
 * The Studio's own surface before an agent exists: the run's `client.surface` is `matrx-user/agent-studio`, so the server
 * resolves that surface's default tools (`studio_workspace`) for the assistant instead of the route's guess.
 */
function StudioSurface({ children }: { children: React.ReactNode }) {
  const getScope = useCallback(() => ({}), []);
  return (
    <SurfaceRuntimeProvider surfaceName={STUDIO_SURFACE_NAME} getScope={getScope}>
      {children}
    </SurfaceRuntimeProvider>
  );
}

/**
 * The Agent Builder's surface around the whole page once the agent exists: the assistant on the
 * left follows the page (THE PAGE-FOLLOW RULE) and can stage edits through the builder's write
 * targets; the center's runs are the page's own conversations and never receive it.
 */
function BuilderSurface({ agentId, children }: { agentId: string; children: React.ReactNode }) {
  const getScope = useAgentBuilderPageScope(agentId);
  const getWriteHandlers = useAgentBuilderWriteHandlers(agentId);
  const store = useAppStore();
  const isOwnConversation = (id: string) => {
    const focus = store.getState().conversationFocus?.bySurface[tryKey(agentId)];
    return focus?.input === id || focus?.display === id;
  };
  return (
    <SurfaceRuntimeProvider
      surfaceName={AGENT_BUILDER_CONTEXT_MENU_PROPS.surfaceName}
      getScope={getScope}
      isEditable
      getWriteHandlers={getWriteHandlers}
      isOwnConversation={isOwnConversation}
    >
      <AgentBuilderClientTools agentId={agentId} />
      {children}
    </SurfaceRuntimeProvider>
  );
}
