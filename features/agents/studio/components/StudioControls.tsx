"use client";

/**
 * RIGHT pane — plain-word controls for the ONE agent being built, with the scary parts hidden.
 *
 * - Settings: name, goal, model (the canonical `ModelListDropdown`), inputs (read only), feedback
 *   to the assistant, and Save version. Edits go through the Agent Builder's own record and save
 *   path (`setAgentField` → `saveAgent`): every save is a new immutable version.
 * - Cases: the agent's test cases (the ONE store, `agent.exemplar`, through `AgentSamplesManager`);
 *   "Use" runs one fresh in the center.
 * - Versions: the agent's saved versions (`agent.definition_version`), each opens.
 * - Battle: the existing model battle with this agent locked in, its input loaded with a test case
 *   (`applySampleToComposer`), or the versions battle.
 * - Debrief: opens Debrief (`@ai-matrx/chat` debrief) on the latest answer in the center, in place.
 */

import { useEffect, useState } from "react";
import { Swords } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, EmptyState, Tabs } from "@ai-matrx/design-system/controls";
import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import { selectAgentById, selectAgentIsDirty } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { selectLatestAssistantMessageId } from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { debriefKey, setDebrief } from "@ai-matrx/chat/agents/debrief/debrief-store";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { setAgentField } from "@/features/agents/redux/agent-builder.slice";
import { saveAgent } from "@/features/agents/redux/builder-write.thunks";
import { setLockedAgent } from "@/features/agent-comparison/modes/model/redux/thunks";
import { AgentSamplesManager } from "@/features/agents/components/samples/AgentSamplesManager";
import { applySampleToComposer } from "@/features/agents/samples/apply-sample";
import { fetchAgentSamples, type AgentSampleRow } from "@/features/agents/samples/service";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { StudioControlsPreview } from "./StudioEmpty";

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
  onUseCase: (sample: AgentSampleRow) => void;
  /** Changes when the page added test cases (the Cases list re-reads). */
  casesVersion?: number;
  /** The tab the pane opens on (mode "Improve" opens on Debrief: its first action). */
  initialTab?: ControlsTab;
}

export function StudioControls({
  agentId,
  runConversationId,
  onFeedback,
  onSaved,
  onUseCase,
  casesVersion = 0,
  initialTab = "settings",
}: StudioControlsProps) {
  const [tab, setTab] = useState<ControlsTab>(initialTab);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 overflow-x-auto border-b border-border px-2" data-testid="studio-controls-tabs">
        <Tabs value={tab} onValueChange={(v) => setTab(v as ControlsTab)} data={TABS} aria-label="Agent controls" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!agentId ? (
          <StudioControlsPreview />
        ) : tab === "settings" ? (
          <SettingsTab agentId={agentId} onFeedback={onFeedback} onSaved={onSaved} />
        ) : tab === "cases" ? (
          <div data-testid="studio-cases">
            <AgentSamplesManager key={casesVersion} agentId={agentId} onUseSample={onUseCase} />
          </div>
        ) : tab === "versions" ? (
          <VersionsTab agentId={agentId} />
        ) : tab === "battle" ? (
          <BattleTab agentId={agentId} casesVersion={casesVersion} />
        ) : (
          <DebriefTab runConversationId={runConversationId} />
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
  if (!record) return <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Loading the agent" />;

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

  const inputs = record.variableDefinitions ?? [];
  return (
    <div className="flex flex-col gap-3" data-testid="studio-settings">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Name
        <ProInput
          value={record.name ?? ""}
          onChange={(e) => dispatch(setAgentField({ id: agentId, field: "name", value: e.target.value }))}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Goal
        <ProTextarea
          value={record.description ?? ""}
          onChange={(e) => dispatch(setAgentField({ id: agentId, field: "description", value: e.target.value }))}
          minHeight={64}
          autoGrow
        />
      </label>
      <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Model
        <ModelListDropdown
          aria-label="Model"
          modelOnly
          inputModalities={["text"]}
          selectionPurpose="agent"
          value={record.modelId ?? null}
          onValueChange={(modelId) => {
            dispatch(setAgentField({ id: agentId, field: "modelId", value: modelId }));
          }}
        />
      </div>
      <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Inputs
        <div className="flex flex-wrap gap-1">
          {inputs.length === 0 ? (
            <span className="text-xs font-normal">None — it takes what you type</span>
          ) : (
            inputs.map((v) => <Badge key={v.name}>{v.name}</Badge>)
          )}
        </div>
      </div>
      <Button variant="primary" onClick={() => void save()} disabled={!dirty || saving}>
        {saving ? "Saving…" : "Save version"}
      </Button>
      <div className="flex flex-col gap-1 border-t border-border pt-3 text-xs font-medium text-muted-foreground">
        Feedback for the assistant
        <ProTextarea
          aria-label="Feedback for the assistant"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          minHeight={64}
          autoGrow
        />
        <Button
          variant="outline"
          disabled={!feedback.trim()}
          onClick={() => {
            onFeedback(feedback.trim());
            setFeedback("");
          }}
        >
          Send to assistant
        </Button>
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
    <ul className="flex flex-col gap-1" data-testid="studio-versions">
      {rows.map((r) => (
        <li key={r.version_number}>
          <Link
            href={`/agents/${agentId}/v/${r.version_number}`}
            className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
          >
            <span className="font-medium text-foreground">Version {r.version_number}</span>
            <span className="text-muted-foreground">{new Date(r.changed_at).toLocaleString()}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BattleTab({ agentId, casesVersion }: { agentId: string; casesVersion: number }) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [cases, setCases] = useState<AgentSampleRow[] | null>(null);
  useEffect(() => {
    let live = true;
    void fetchAgentSamples(agentId)
      .then((rows) => live && setCases(rows))
      .catch(() => live && setCases([]));
    return () => {
      live = false;
    };
  }, [agentId, casesVersion]);

  /** The model battle with this agent locked in; with a case, its input is that case. */
  const compareModels = async (sample?: AgentSampleRow) => {
    setBusy(true);
    try {
      await dispatch(setLockedAgent({ agentId })).unwrap();
      const inputId = store.getState().agentComparisonModel.inputConversationId;
      if (sample && inputId) dispatch(applySampleToComposer({ conversationId: inputId, sample }));
      router.push("/agents/battle/model");
    } catch (e) {
      toast.error("Battle did not open", { description: e instanceof Error ? e.message : String(e) });
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2" data-testid="studio-battle">
      <Button variant="primary" onClick={() => void compareModels()} disabled={busy}>
        Compare models on this agent
      </Button>
      <Link href="/agents/battle/variations" className="text-xs text-primary hover:underline">
        Compare versions
      </Link>
      {cases && cases.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border pt-2">
          <span className="text-xs font-medium text-muted-foreground">Battle on a test case</span>
          {cases.slice(0, 12).map((c) => (
            <button
              key={c.id}
              type="button"
              data-clickable
              disabled={busy}
              onClick={() => void compareModels(c)}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left text-xs hover:bg-muted"
            >
              <Swords className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-foreground">{c.label || "Test case"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DebriefTab({ runConversationId }: { runConversationId: string | null }) {
  const messageId = useAppSelector((s) =>
    runConversationId ? selectLatestAssistantMessageId(runConversationId)(s) : undefined,
  );
  if (!runConversationId || !messageId) {
    return <EmptyState icon={<AGENT_ICON className="h-5 w-5" />} title="Run the agent first" line="Debrief reads its latest answer" />;
  }
  return (
    <div className="flex flex-col gap-2" data-testid="studio-debrief">
      <Button
        variant="primary"
        onClick={() => setDebrief(debriefKey(runConversationId, messageId), { status: "choosing" })}
      >
        Debrief the latest answer
      </Button>
      <p className="text-xs text-muted-foreground">Opens under the answer in the center</p>
    </div>
  );
}
