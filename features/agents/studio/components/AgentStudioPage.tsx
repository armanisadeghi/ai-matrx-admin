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
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button, EmptyState, Tabs } from "@ai-matrx/design-system/controls";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { useMandate } from "@ai-matrx/chat/mandates/useMandate";
import { useAgentLauncher } from "@ai-matrx/chat/agents/hooks/useAgentLauncher";
import { DEFAULT_NEW_CHAT_MANDATE_KEY } from "@ai-matrx/chat/agents/components/chat/chat-quick-actions.config";
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
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ProInput } from "@/components/official/ProInput";
import { BuildProgress } from "@/features/agents/factory/components/BuildProgress";
import { getFactoryBuild } from "@/features/agents/factory/service";
import { KEPT_OUTCOMES, type FactoryBuildState } from "@/features/agents/factory/types";
import { makeAgentFromChat, type StudioBrief } from "@/features/agents/from-chat/service";
import {
  borrowSampleFromRun,
  createAgentSample,
  fetchAgentContractHead,
  fetchAgentSamples,
  fetchCandidateRuns,
  sampleInputText,
  type AgentSampleRow,
} from "@/features/agents/samples/service";
import { fetchFullAgent } from "@/features/agents/redux/fetch-full-agent.thunk";
import { useAgentBuilderSurfaceScope } from "@/features/agents/hooks/useAgentBuilderSurfaceScope";
import { useAgentBuilderWriteHandlers } from "@/features/agents/hooks/useAgentBuilderWriteHandlers";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { studioMode } from "../modes";
import { planImprove } from "../improve";
import {
  CAPTURE_QUESTION,
  CHAT_CASE_SOURCE,
  DOER_CONTEXT_KEY,
  EXAMPLES_CASE_SOURCE,
  DOER_NOTE,
  approvedAnswerFrom,
  readStudioState,
  rerunSeedFrom,
  studioJobParam,
  studioCaseFromBuild,
  studioHref,
  type StudioCase,
  type StudioMessageRecord,
  type StudioState,
} from "../studio-state";
import { loadMakeDraft, saveMakeDraft } from "../make-draft";
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
const CAPTURE_WAIT_MS = 600_000;
/** The doer's standing hint, on its own conversation (never a new agent). */
const DOER_CONTEXT = { [DOER_CONTEXT_KEY]: DOER_NOTE };

type MakePhase =
  | { kind: "idle" }
  | { kind: "capturing" }
  | { kind: "reading" }
  | { kind: "confirm"; brief: StudioBrief; approved: string; capture: string }
  | { kind: "building" };

export function AgentStudioPage() {
  const router = useRouter();
  const params = useSearchParams();
  const state = readStudioState(new URLSearchParams(params.toString()));
  const go = (patch: Partial<StudioState>) => router.replace(studioHref({ ...state, ...patch }));
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
  const mode = studioMode(state.mode)!;
  const { mandate, error: mandateError } = useMandate(DEFAULT_NEW_CHAT_MANDATE_KEY);
  // The assistant: the default chat agent, unless the URL names another (`?assistant=`).
  const doerId = state.assistantId ?? mandate?.agentId ?? null;
  const doerError = state.assistantId ? null : mandateError;
  const { launchAgent } = useAgentLauncher();

  const [build, setBuild] = useState<FactoryBuildState | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [runConversation, setRunConversation] = useState<string | null>(null);
  /** Mode 1's "Run again": the last run's own inputs, re-sent on a fresh conversation. */
  const [rerunSeed, setRerunSeed] = useState<{ variables: Record<string, string>; userInput: string } | null>(null);
  const [phase, setPhase] = useState<MakePhase>({ kind: "idle" });
  const [paneTab, setPaneTab] = useState<"assistant" | "agent" | "controls">("assistant");
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
    void getFactoryBuild(state.buildId).then((d) => {
      if (live) setBuild(d?.state ?? null);
    });
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

  // Mode "Improve": the agent's recent real runs become its test cases (once per agent), and the
  // latest opens in the center. `improveReady` holds the center until that is known, so it never
  // starts a fresh run on top of the one it is about to open.
  const [improveReady, setImproveReady] = useState(mode.id !== "improve" || Boolean(state.runId));
  const plannedFor = useRef<string | null>(null);
  useEffect(() => {
    const agentId = state.agentId;
    if (mode.id !== "improve" || !agentId || plannedFor.current === agentId) return;
    plannedFor.current = agentId;
    void (async () => {
      try {
        const [runs, samples] = await Promise.all([fetchCandidateRuns(agentId, { limit: 15 }), fetchAgentSamples(agentId)]);
        const already = new Set(samples.map((s) => s.source_conversation_id).filter((id): id is string => Boolean(id)));
        const plan = planImprove(runs, already);
        let saved = 0;
        for (const run of plan.borrow) {
          try {
            await borrowSampleFromRun({ agentId, run });
            saved += 1;
          } catch (e) {
            toast.error("A run did not become a test case", { description: e instanceof Error ? e.message : String(e) });
          }
        }
        if (saved > 0) {
          toast.success(saved === 1 ? "Its latest run is now a test case" : `Its ${saved} latest runs are now test cases`);
          setCasesVersion((v) => v + 1);
        }
        if (plan.latest && !state.runId) go({ runId: plan.latest.conversationId });
      } catch (e) {
        toast.error("Its recent runs did not load", { description: e instanceof Error ? e.message : String(e) });
      } finally {
        setImproveReady(true);
      }
    })();
  }, [mode.id, state.agentId, state.runId, go]);

  // (c) The approved answer becomes the agent's first test case, once.
  const savedCaseFor = useRef<string | null>(null);
  useEffect(() => {
    const agentId = state.agentId;
    if (!agentId || !studioCase?.approved || savedCaseFor.current === agentId) return;
    savedCaseFor.current = agentId;
    void (async () => {
      try {
        if ((await fetchAgentSamples(agentId)).length > 0) return;
        await createAgentSample({
          agentId,
          label: "Approved in the Studio",
          variables: studioCase.variables,
          userInput: studioCase.userInput,
          referenceOutput: studioCase.approved,
          head: await fetchAgentContractHead(agentId),
        });
        toast.success("Your approved result is its first test case");
      } catch (e) {
        toast.error("The first test case did not save", { description: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [state.agentId, studioCase]);

  // Opened from a System Builder step: the kept agent is written back onto that step, once.
  const wroteBackFor = useRef<string | null>(null);
  useEffect(() => {
    const { agentId, planId, planStep } = state;
    if (!agentId || !planId || !planStep || wroteBackFor.current === agentId) return;
    wroteBackFor.current = agentId;
    void writeAgentToPlanStep(planId, Number(planStep), agentId, agentName ?? null).catch((e: unknown) =>
      toast.error("The plan step was not updated", { description: e instanceof Error ? e.message : String(e) }),
    );
  }, [state, agentName]);

  /** One turn into the assistant's conversation (feedback, the capture question). */
  const sendToAssistant = async (text: string) => {
    if (!doerId || !state.chatId) {
      toast.error("Say something to the assistant first");
      return false;
    }
    await launchAgent(doerId, {
      conversationId: state.chatId,
      surfaceKey: ASSISTANT_SURFACE,
      sourceFeature: "agent-studio",
      config: { displayMode: "direct", autoRun: true, allowChat: true },
      runtime: { userInput: text, context: DOER_CONTEXT },
    });
    return true;
  };

  const waitForAnswerAfter = async (conversationId: string, previousId: string | undefined) => {
    const started = Date.now();
    for (;;) {
      const s = store.getState();
      const latest = selectLatestAssistantMessageId(conversationId)(s);
      const status = selectInstanceStatus(conversationId)(s);
      if (latest && latest !== previousId && status === "complete") return selectLatestAnswerText(conversationId)(s);
      if (status === "error") throw new Error("The assistant stopped before answering");
      if (Date.now() - started > CAPTURE_WAIT_MS) throw new Error("The assistant took too long");
      await new Promise((r) => setTimeout(r, 700));
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

  const makeThisAnAgent = async () => {
    const chatId = state.chatId;
    if (!chatId) return;
    const approved = readApproved(chatId)?.text ?? "";
    if (!approved.trim()) {
      toast.error("Get a result you like first");
      return;
    }
    try {
      setPhase({ kind: "capturing" });
      // (a) The capture turn enriches the brief; the brief still reads the whole chat without it,
      // so a refused or failed capture is announced and the build goes on.
      let capture = "";
      try {
        const before = selectLatestAssistantMessageId(chatId)(store.getState());
        if (await sendToAssistant(CAPTURE_QUESTION)) capture = await waitForAnswerAfter(chatId, before);
      } catch (e) {
        toast.info("Building from the chat alone", {
          description: `The assistant did not answer the how-it-worked question: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
      setPhase({ kind: "reading" });
      const answer = await makeAgentFromChat(dispatch, chatId, () => undefined, [], undefined, {
        approvedOutput: approved,
        capture,
        stage: "inputs",
      });
      if (!answer.ok) throw new Error(answer.says);
      if (!("brief" in answer)) throw new Error("The inputs did not come back");
      setPhase({ kind: "confirm", brief: answer.brief, approved, capture });
      // A reload from here resumes the confirm card (the draft rides on the doer's conversation).
      void saveMakeDraft(chatId, { brief: answer.brief, approved, capture }).catch((e: unknown) =>
        toast.error("This step will not survive a reload", { description: e instanceof Error ? e.message : String(e) }),
      );
    } catch (e) {
      setPhase({ kind: "idle" });
      toast.error("Making the agent stopped", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  // Reload mid-"Make this an agent": the confirm card comes back from the conversation's draft.
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    const chatId = state.chatId;
    if (mode.id !== "do-with-me" || !chatId || state.buildId || restoredFor.current === chatId) return;
    restoredFor.current = chatId;
    let live = true;
    void loadMakeDraft<StudioBrief>(chatId)
      .then((draft) => {
        if (live && draft) setPhase((p) => (p.kind === "idle" ? { kind: "confirm", ...draft } : p));
      })
      .catch((e: unknown) => toast.error("The saved draft did not load", { description: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [mode.id, state.chatId, state.buildId]);

  const buildConfirmed = async (brief: StudioBrief, approved: string, capture: string) => {
    if (!state.chatId) return;
    setPhase({ kind: "building" });
    const answer = await makeAgentFromChat(dispatch, state.chatId, () => undefined, [], undefined, {
      approvedOutput: approved,
      capture,
      stage: "build",
      brief,
    });
    if (answer.ok && "buildId" in answer) {
      setPhase({ kind: "idle" });
      void saveMakeDraft(state.chatId, null).catch(() => undefined); // the build's record holds it now
      go({ buildId: answer.buildId });
      if (isMobile) setPaneTab("agent");
    } else {
      setPhase({ kind: "idle" });
      toast.error("The build did not start", { description: answer.ok ? "No build came back" : answer.says });
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
  const runCase = (sample: AgentSampleRow) => {
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
  ) : (
    <StudioRun
      agentId={doerId}
      conversationId={state.chatId}
      surfaceKey={ASSISTANT_SURFACE}
      context={DOER_CONTEXT}
      onConversation={(id) => {
        if (id !== state.chatId) go({ chatId: id });
      }}
    />
  );

  let center: React.ReactNode;
  if (phase.kind === "confirm") {
    center = (
      <ConfirmInputs
        brief={phase.brief}
        onBuild={(b) => void buildConfirmed(b, phase.approved, phase.capture)}
        onCancel={() => {
          setPhase({ kind: "idle" });
          if (state.chatId) void saveMakeDraft(state.chatId, null).catch(() => undefined);
        }}
      />
    );
  } else if (phase.kind !== "idle") {
    center = (
      <EmptyState
        icon={<AGENT_ICON className="h-5 w-5" />}
        title={
          phase.kind === "capturing"
            ? "Asking the assistant how it did it"
            : phase.kind === "reading"
              ? "Finding the inputs you gave"
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
        conversationId={mode.id === "improve" ? state.runId : null}
        surfaceKey={tryKey(state.agentId)}
        seed={seed}
        showVariables
        runKey={runKey}
        onConversation={setRunConversation}
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

  const right = (
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
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-2" data-testid="studio-header">
      <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={() => router.push(studioHref({}))} />
      <span className="text-sm font-semibold text-foreground">Agent Studio</span>
      <span className="truncate text-xs text-muted-foreground">{agentName ?? mode.title}</span>
      <PlanBackLink state={state} />
      <div className="ml-auto flex items-center gap-2">
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
        {state.agentId && (
          <Button variant="outline" icon={<RotateCcw />} onClick={runAgain}>
            Run again
          </Button>
        )}
      </div>
    </div>
  );

  const body = isMobile ? (
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
      <ResizablePanel defaultSize="28%" minSize="18%" collapsible>
        <div className="h-full min-h-0" data-testid="studio-pane-assistant">{left}</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="50%" minSize="30%">
        <div className="h-full min-h-0" data-testid="studio-pane-agent">{center}</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="22%" minSize="16%" collapsible>
        <div className="h-full min-h-0" data-testid="studio-pane-controls">{right}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );

  const page = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-textured pt-[var(--shell-header-h)]" data-testid="agent-studio">
      {header}
      {body}
    </div>
  );
  return state.agentId ? <BuilderSurface agentId={state.agentId}>{page}</BuilderSurface> : page;
}

/**
 * The Agent Builder's surface around the whole page once the agent exists: the assistant on the
 * left follows the page (THE PAGE-FOLLOW RULE) and can stage edits through the builder's write
 * targets; the center's runs are the page's own conversations and never receive it.
 */
function BuilderSurface({ agentId, children }: { agentId: string; children: React.ReactNode }) {
  const getScope = useAgentBuilderSurfaceScope(agentId);
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
      {children}
    </SurfaceRuntimeProvider>
  );
}

function ConfirmInputs({
  brief,
  onBuild,
  onCancel,
}: {
  brief: StudioBrief;
  onBuild: (brief: StudioBrief) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(brief.variables.map((v) => [v.name, v.test_value])),
  );
  const confirmed: StudioBrief = {
    ...brief,
    variables: brief.variables.map((v) => ({ ...v, test_value: values[v.name] ?? "" })),
  };
  return (
    <div className="h-full overflow-y-auto p-4" data-testid="studio-confirm-inputs">
      <div className="mx-auto flex max-w-xl flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          If you&apos;d been asked these questions, would these have been your answers?
        </h2>
        {brief.variables.length === 0 ? (
          <p className="text-xs text-muted-foreground">No inputs: the agent takes what you type</p>
        ) : (
          brief.variables.map((v) => (
            <label key={v.name} className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              {v.description || v.name}
              <ProInput
                value={values[v.name] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [v.name]: e.target.value }))}
              />
            </label>
          ))
        )}
        <div className="flex justify-end gap-2">
          <Button variant="quiet" onClick={onCancel}>
            Not yet
          </Button>
          <Button variant="primary" onClick={() => onBuild(confirmed)}>
            Build the agent
          </Button>
        </div>
      </div>
    </div>
  );
}
