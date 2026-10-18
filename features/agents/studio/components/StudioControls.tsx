"use client";

/**
 * RIGHT pane — plain-word controls for the ONE agent being built, with the scary parts hidden.
 *
 * - Settings: name, goal, model (the canonical `ModelListDropdown`), inputs (read only), feedback
 *   to the assistant, and Save version. Edits go through the Agent Builder's own record and save
 *   path (`setAgentField` → `saveAgent`): every save is a new immutable version.
 * - Cases: the agent's test cases on Agent Evaluation (`StudioCases`: kind='test_case' rows, the
 *   eval runner, checks + judge); "Open" runs one fresh in the center.
 * - Versions: cases × versions from eval results, then the saved versions, each opens.
 * - Battle: the agent against a challenger (Debrief candidate, another model, a saved version) on its
 *   test cases, through the eval runner (`StudioBattle`).
 * - Debrief: opens Debrief (`@ai-matrx/chat` debrief) on the latest answer in the center; its
 *   proposals (the `agent_debrief` kind) show here as cards — "Try as candidate" applies one through
 *   the Builder's own edit path (unsaved), "Battle it" runs it on the cases, "Keep" saves it.
 */

import { useEffect, useRef, useState } from "react";
import { RecordList } from "@ai-matrx/design-system/record-list";
import { FlaskConical, Lightbulb, Send, Swords } from "lucide-react";
import Link from "next/link";
import { Badge, Button, EmptyState, RegionSkeleton, Tabs } from "@ai-matrx/design-system/controls";
import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import { selectAgentById, selectAgentIsDirty } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { selectLatestAssistantMessageId } from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { debriefKey, getDebrief, setDebrief, useDebrief } from "@ai-matrx/chat/agents/debrief/debrief-store";
import { parseAgentDebrief, type DebriefProposal } from "@ai-matrx/chat/agents/debrief/debrief-proposals";
import { DebriefProposalCards } from "@ai-matrx/chat/agents/debrief/DebriefProposalCards";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { resetAgentField, setAgentField, setAgentMessages } from "@/features/agents/redux/agent-builder.slice";
import { saveAgent } from "@/features/agents/redux/builder-write.thunks";
import type { TestCaseRow } from "@/features/agent-tests/cases";
import { CaseVersionGrid } from "@/features/agent-tests/components/CaseVersionGrid";
import { StudioCases } from "./StudioCases";
import { StudioBattle } from "./StudioBattle";
import { followServerWork } from "@/features/ai-watch/followed-work";
import { candidateFromProposal, type StudioCandidate } from "../battle";
import { loadImproveRecord, saveImprovePart } from "../improve-record";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { StudioControlsPreview } from "./StudioEmpty";
import { PaneBar } from "./PaneBar";
import { StudioInputPills, type StudioInputDefinition } from "./StudioInputPills";
import { ResultCard, TabHead, Waiting } from "./StudioTabParts";

export type ControlsTab = "settings" | "cases" | "versions" | "battle" | "debrief";
const TABS: { value: ControlsTab; label: string }[] = [
  { value: "settings", label: "Settings" },
  { value: "cases", label: "Cases" },
  { value: "versions", label: "Versions" },
  { value: "battle", label: "Battle" },
  { value: "debrief", label: "Debrief" },
];

interface StudioControlsProps {
  agentId: string | null;
  /** The center's current run (Debrief reads its latest answer). */
  runConversationId: string | null;
  /** Send words to the assistant on the left (feedback on the process). */
  onFeedback: (text: string) => void;
  /** After a save: run the agent again, fresh. */
  onSaved: () => void;
  /** Run one of the agent's test cases, fresh, in the center. */
  onUseCase: (testCase: TestCaseRow) => void;
  /** Changes when the page added test cases (the Cases list re-reads). */
  casesVersion?: number;
  /** The tab on screen, held by the page so a layout change keeps it (mode "Improve" opens on Debrief). */
  tab: ControlsTab;
  onTabChange: (tab: ControlsTab) => void;
}

export function StudioControls({
  agentId,
  runConversationId,
  onFeedback,
  onSaved,
  onUseCase,
  casesVersion = 0,
  tab,
  onTabChange: setTab,
}: StudioControlsProps) {
  const dispatch = useAppDispatch();
  const record = useAppSelector((s) => (agentId ? selectAgentById(s, agentId) : undefined));
  const [candidate, setCandidate] = useState<StudioCandidate | null>(null);
  /** The proposal last kept as a version: its Debrief card reads "Kept" instead of offering a retry. */
  const [keptId, setKeptId] = useState<string | null>(null);
  /** A candidate is an unsaved draft: write it down as it changes, and re-apply it to the Builder record on reload. */
  const restored = useRef<string | null>(null);
  useEffect(() => {
    if (!agentId || !record || !runConversationId || restored.current === runConversationId) return;
    restored.current = runConversationId;
    void loadImproveRecord(runConversationId).then(
      (saved) => {
        const c = saved.candidate;
        if (!c || candidate) return;
        if (c.messages) dispatch(setAgentMessages({ id: agentId, messages: c.messages as typeof record.messages }));
        if (c.modelId) dispatch(setAgentField({ id: agentId, field: "modelId", value: c.modelId }));
        setCandidate(c);
      },
      () => undefined, // nothing saved yet reads as no candidate; the next change writes it
    );
  }, [agentId, record, runConversationId, candidate, dispatch]);
  const remember = (c: StudioCandidate | null) => {
    if (!runConversationId) return;
    void saveImprovePart(runConversationId, "candidate", c).catch((e: unknown) =>
      toast.error("The candidate was not remembered", { description: e instanceof Error ? e.message : String(e) }),
    );
  };

  /** "Try as candidate": the proposal goes into the Builder's own record (unsaved), never a copy. */
  const tryProposal = (proposal: DebriefProposal): StudioCandidate | null => {
    if (!agentId || !record) return null;
    const made = candidateFromProposal((record.messages ?? []) as { role?: unknown; content?: unknown }[], proposal);
    if ("error" in made) {
      toast.error("Not tried", { description: made.error });
      return null;
    }
    const c = made.candidate;
    if (c.messages) dispatch(setAgentMessages({ id: agentId, messages: c.messages as typeof record.messages }));
    if (c.modelId) dispatch(setAgentField({ id: agentId, field: "modelId", value: c.modelId }));
    setCandidate(c);
    setKeptId(null);
    remember(c);
    return c;
  };
  const discard = () => {
    if (!agentId) return;
    dispatch(resetAgentField({ id: agentId, field: "messages" }));
    dispatch(resetAgentField({ id: agentId, field: "modelId" }));
    setCandidate(null);
    remember(null);
  };
  const keep = async () => {
    if (!agentId) return;
    await dispatch(saveAgent(agentId)).unwrap();
    setKeptId(candidate?.proposalId ?? null);
    setCandidate(null);
    remember(null);
    onSaved();
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PaneBar className="items-end overflow-x-auto py-0" data-testid="studio-controls-tabs">
        <Tabs value={tab} onValueChange={(v) => setTab(v as ControlsTab)} data={TABS} aria-label="Agent controls" />
      </PaneBar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3" data-controls-scroll="">
        {!agentId ? (
          <StudioControlsPreview tab={tab} />
        ) : tab === "settings" ? (
          <SettingsTab agentId={agentId} onFeedback={onFeedback} onSaved={onSaved} />
        ) : tab === "cases" ? (
          <StudioCases agentId={agentId} casesVersion={casesVersion} onUseCase={onUseCase} />
        ) : tab === "versions" ? (
          <VersionsTab agentId={agentId} />
        ) : tab === "battle" ? (
          <StudioBattle
            agentId={agentId}
            casesVersion={casesVersion}
            candidate={candidate}
            onKeep={keep}
            onDiscard={discard}
            onOpenCases={() => setTab("cases")}
          />
        ) : (
          <DebriefTab
            runConversationId={runConversationId}
            candidateId={candidate?.proposalId ?? null}
            keptId={keptId}
            onTry={tryProposal}
            onBattle={() => setTab("battle")}
            onDiscard={discard}
            onOpenCases={() => setTab("cases")}
          />
        )}
      </div>
    </div>
  );
}

function SettingsTab({ agentId, onFeedback, onSaved }: { agentId: string; onFeedback: (t: string) => void; onSaved: () => void }) {
  const dispatch = useAppDispatch();
  const record = useAppSelector((s) => selectAgentById(s, agentId));
  const dirty = useAppSelector((s) => selectAgentIsDirty(s, agentId));
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  if (!record) return <RegionSkeleton />;

  const save = async () => {
    setSaving(true);
    try {
      await dispatch(saveAgent(agentId)).unwrap();
      toast.success("New version saved");
      onSaved();
    } catch (e) {
      toast.error("The version did not save", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };
  const discard = () => {
    for (const field of ["name", "description", "modelId"] as const) dispatch(resetAgentField({ id: agentId, field }));
  };
  const send = () => {
    const text = feedback.trim();
    if (!text) return;
    onFeedback(text);
    setFeedback("");
  };

  const inputs = (record.variableDefinitions ?? []) as StudioInputDefinition[];
  return (
    <div className="flex min-h-full flex-col" data-testid="studio-settings">
      <div className="flex flex-1 flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <ProInput
            value={record.name ?? ""}
            onChange={(e) => dispatch(setAgentField({ id: agentId, field: "name", value: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Goal</span>
          <ProTextarea
            value={record.description ?? ""}
            onChange={(e) => dispatch(setAgentField({ id: agentId, field: "description", value: e.target.value }))}
            minHeight={56}
            autoGrow
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Model</span>
          <ModelListDropdown
            aria-label="Model"
            modelOnly
            inputModalities={["text"]}
            selectionPurpose="agent"
            triggerVariant="settings"
            value={record.modelId ?? null}
            onValueChange={(modelId) => {
              dispatch(setAgentField({ id: agentId, field: "modelId", value: modelId }));
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Inputs</span>
          {inputs.length === 0 ? (
            <span className="text-sm text-muted-foreground">None. It works from what you type</span>
          ) : (
            <StudioInputPills definitions={inputs} />
          )}
        </div>
        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <span className="text-xs font-medium text-muted-foreground">Tell the assistant</span>
          <div className="flex items-end gap-1.5">
            <ProTextarea
              aria-label="Tell the assistant what to change"
              placeholder="What should change?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              minHeight={36}
              autoGrow
              wrapperClassName="min-w-0 flex-1"
            />
            <Button variant="outline" icon={<Send />} aria-label="Send to the assistant" title="Send to the assistant" disabled={!feedback.trim()} onClick={send} />
          </div>
        </div>
      </div>
      {/* One fixed bar for the save: the same height clean or dirty, so nothing above it moves. */}
      <div
        className="sticky bottom-0 -mx-3 -mb-3 mt-4 flex h-11 shrink-0 items-center justify-end gap-1 border-t border-border bg-card px-3"
        data-testid="studio-save-bar"
        data-dirty={dirty ? "" : undefined}
      >
        {dirty ? (
          <>
            <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>
            <Button variant="quiet" onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button variant="primary" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save version"}
            </Button>
          </>
        ) : (
          <span className="mr-auto text-xs text-muted-foreground">Every save is a new version</span>
        )}
      </div>
    </div>
  );
}

interface VersionRow {
  version_number: number;
  changed_at: string;
  change_note: string | null;
}

function VersionsTab({ agentId }: { agentId: string }) {
  const [rows, setRows] = useState<VersionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void createClient()
      .schema("agent")
      .from("definition_version")
      .select("version_number, changed_at, change_note")
      .eq("agent_id", agentId)
      .order("version_number", { ascending: false })
      .limit(50)
      .then(({ data, error: e }) => {
        if (!live) return;
        if (e) setError(e.message);
        else setRows((data ?? []) as VersionRow[]);
      });
    return () => {
      live = false;
    };
  }, [agentId]);
  if (error) return <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Versions did not load" line={error} />;
  if (!rows) return <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Loading versions" />;
  if (rows.length === 0) return <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="No saved versions yet" />;
  return (
    <div className="flex flex-col gap-3">
      <CaseVersionGrid agentId={agentId} />
      <div data-testid="studio-versions">
        <RecordList
          items={rows}
          getKey={(r) => String(r.version_number)}
          title={(r) => `Version ${r.version_number}`}
          meta={(r) => new Date(r.changed_at).toLocaleString()}
          href={(r) => `/agents/${agentId}/v/${r.version_number}`}
          size="sm"
          sourceFeature="agent"
          ariaLabel="Versions"
        />
      </div>
    </div>
  );
}

function DebriefTab({
  runConversationId,
  candidateId,
  keptId,
  onTry,
  onBattle,
  onDiscard,
  onOpenCases,
}: {
  runConversationId: string | null;
  candidateId: string | null;
  keptId: string | null;
  onTry: (p: DebriefProposal) => StudioCandidate | null;
  onBattle: () => void;
  onDiscard: () => void;
  onOpenCases: () => void;
}) {
  const messageId = useAppSelector((s) =>
    runConversationId ? selectLatestAssistantMessageId(runConversationId)(s) : undefined,
  );
  const key = runConversationId && messageId ? debriefKey(runConversationId, messageId) : "";
  const debrief = useDebrief(key);
  // The debrief runs on its own fork: Watch AI and the Builder follow that conversation too.
  const forkId = debrief?.forkConversationId ?? null;
  useEffect(() => {
    if (forkId) followServerWork({ kind: "conversation", id: forkId, label: "Debrief", source: "agent studio" });
  }, [forkId]);
  // The answer is written down when it lands and brought back on reload (its fork is the server-side body).
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!runConversationId || !messageId || !key || loadedFor.current === key || getDebrief(key)) return;
    loadedFor.current = key;
    void loadImproveRecord(runConversationId).then(
      (saved) => {
        const d = saved.debrief;
        if (d && d.message_id === messageId && !getDebrief(key)) {
          setDebrief(key, { status: "done", text: d.text, model: d.model, forkConversationId: d.fork_conversation_id, error: null });
        }
      },
      () => undefined,
    );
  }, [runConversationId, messageId, key]);
  const doneText = debrief?.status === "done" ? debrief.text : null;
  const doneFork = debrief?.forkConversationId ?? null;
  const doneModel = debrief?.model ?? null;
  useEffect(() => {
    if (!runConversationId || !messageId || !doneText) return;
    void saveImprovePart(runConversationId, "debrief", {
      message_id: messageId,
      fork_conversation_id: doneFork,
      model: doneModel,
      text: doneText,
    }).catch(() => undefined);
  }, [runConversationId, messageId, doneText, doneFork, doneModel]);
  if (!runConversationId || !messageId) {
    return (
      <EmptyState
        icon={<AGENT_ICON className="h-5 w-5" />}
        title="Run the agent first"
        line="Debrief reads its latest answer"
        action={
          <Button variant="outline" onClick={onOpenCases}>
            Run a test case
          </Button>
        }
      />
    );
  }
  const parsed = debrief?.status === "done" ? parseAgentDebrief(debrief.text) : null;
  const working = debrief?.status === "running";
  const hasRun = debrief && debrief.status !== "choosing";
  return (
    <div className="flex flex-col gap-2" data-testid="studio-debrief">
      <TabHead>
        <Button
          variant={parsed || working ? "outline" : "primary"}
          icon={<Lightbulb />}
          disabled={working}
          onClick={() => setDebrief(key, { status: "choosing" })}
        >
          {hasRun ? "Debrief again" : "Debrief the latest answer"}
        </Button>
        {!debrief ? <span className="min-w-0 truncate text-xs text-muted-foreground">Opens under the answer</span> : null}
      </TabHead>
      {working ? <Waiting text="Reading the run" /> : null}
      {debrief?.status === "done" && !parsed ? (
        <ResultCard tone="warning">
          <span className="text-foreground">
            {debrief.text.trim() ? "The debrief had no proposals to read" : "The model sent no answer"}
          </span>
          <Button variant="outline" onClick={() => setDebrief(key, { status: "choosing" })} data-testid="studio-debrief-retry">
            Retry
          </Button>
        </ResultCard>
      ) : null}
      {debrief?.status === "error" ? (
        <ResultCard tone="warning">
          <span className="text-foreground">{debrief.error || "The debrief did not finish"}</span>
          <Button variant="outline" onClick={() => setDebrief(key, { status: "choosing" })} data-testid="studio-debrief-retry">
            Retry
          </Button>
        </ResultCard>
      ) : null}
      {parsed ? (
        <DebriefProposalCards
          debrief={parsed}
          renderActions={(p) =>
            keptId === p.id ? (
              <Badge tone="success">Kept as a version</Badge>
            ) : candidateId === p.id ? (
              <>
                <Badge tone="info">Candidate</Badge>
                <Button variant="primary" icon={<Swords />} onClick={onBattle} data-testid="studio-proposal-battle">
                  Battle it
                </Button>
                <Button variant="quiet" onClick={onDiscard}>
                  Discard
                </Button>
              </>
            ) : p.target === "instructions" || p.target === "model" ? (
              <Button
                variant="outline"
                icon={<FlaskConical />}
                onClick={() => void onTry(p)}
                data-testid="studio-proposal-try"
              >
                Try as candidate
              </Button>
            ) : null
          }
        />
      ) : null}
    </div>
  );
}
