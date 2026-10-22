"use client";

// features/visual-map-lab/SendToAgentPanel.tsx — "Send to agent builder".
//
// Pick any agent you can see. The screenshot goes in as an image part; the sample's values map onto the agent's DECLARED
// variables by name (edit any row), and every value no variable takes is listed — never silently dropped. The result is a
// test case on that agent (createAgentSampleDetailed) with a link into the agent builder.

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/navigation/AppLink";
import { Send } from "lucide-react";
import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { Button, Select, Switch } from "@ai-matrx/design-system/controls";
import { RecordId } from "@ai-matrx/design-system";
import { useAppSelector } from "@/lib/redux/hooks";
import { supabase } from "@/utils/supabase/client";
import {
  createAgentSampleDetailed,
  fetchAgentContractHead,
  fileRefPart,
  type AgentContractHead,
} from "@/features/agents/samples/service";
import { DataTable } from "./JsonTables";
import { LabError } from "./LabError";
import { applyMapping, suggestMapping, type SampleValue } from "./agentMapping";

const NONE = "__none__";

interface Sent {
  sampleId: string;
  agentId: string;
  agentName: string;
  screenshotFileId: string | null;
  variables: string[];
  unmapped: string[];
  unmappedByService: string[];
}

export function SendToAgentPanel({
  title,
  values,
  getScreenshotFileId,
  getMessageText,
}: {
  title: string;
  values: SampleValue[];
  /** The stored screenshot's file id, uploading the fresh picture when there is no stored one. Null = none to send. */
  getScreenshotFileId: () => Promise<string | null>;
  /** The Copy for AI text, sent as the message when asked. */
  getMessageText: () => Promise<string>;
}) {
  const [agentId, setAgentId] = useState<string | null>(null);
  const agent = useAppSelector((state) => (agentId ? selectAgentById(state, agentId) : undefined));
  const [answered, setAnswered] = useState<{ agentId: string; head: AgentContractHead | null; name: string | null; error: string | null } | null>(null);
  const [edited, setEdited] = useState<{ agentId: string; mapping: Record<string, string> } | null>(null);
  const [asMessage, setAsMessage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  useEffect(() => {
    if (!agentId) return undefined;
    let live = true;
    Promise.all([
      fetchAgentContractHead(agentId),
      supabase.schema("agent").from("definition").select("name").eq("id", agentId).maybeSingle(),
    ])
      .then(([h, named]) => live && setAnswered({ agentId, head: h, name: named.data?.name ?? null, error: null }))
      .catch((e) => live && setAnswered({ agentId, head: null, name: null, error: e instanceof Error ? e.message : "The agent could not be read." }));
    return () => {
      live = false;
    };
  }, [agentId]);

  const current = answered && answered.agentId === agentId ? answered : null;
  const head = current?.head ?? null;
  const headError = current?.error ?? null;
  const agentName = agent?.name ?? current?.name ?? null;
  const declaredNames = useMemo(() => head?.variableDeclarations.map((d) => d.name) ?? [], [head]);
  const mapping = useMemo(
    () => (edited && edited.agentId === agentId ? edited.mapping : suggestMapping(declaredNames, values)),
    [edited, agentId, declaredNames, values],
  );
  const pick = (agent: string) => {
    setAgentId(agent);
    setSent(null);
    setError(null);
  };

  const declared = useMemo(() => head?.variableDeclarations ?? [], [head]);
  const applied = useMemo(() => applyMapping(mapping, values), [mapping, values]);
  const options = useMemo(
    () => [{ value: NONE, label: "Nothing" }, ...values.map((v) => ({ value: v.key, label: v.label }))],
    [values],
  );

  const send = async () => {
    if (!agentId || !head || busy) return;
    setBusy(true);
    setError(null);
    try {
      const screenshotFileId = await getScreenshotFileId();
      const attachments = screenshotFileId ? [fileRefPart({ fileId: screenshotFileId, mimeType: "image/png", fileName: "screenshot.png" })] : [];
      const result = await createAgentSampleDetailed({
        agentId,
        label: `Visual map lab: ${title}`.slice(0, 120),
        variables: applied.variables,
        userInput: asMessage ? await getMessageText() : "",
        referenceOutput: "",
        head,
        attachments,
        declaredVariableNames: declared.map((d) => d.name),
      });
      setSent({
        sampleId: result.sample.id,
        agentId,
        agentName: agentName ?? agentId,
        screenshotFileId,
        variables: Object.keys(applied.variables),
        unmapped: applied.unmapped.map((v) => v.label),
        unmappedByService: result.unmappedVariables,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The test case could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3" data-lab-send>
      <AgentListDropdown
        consumerId="visual-map-lab-agent-picker"
        onSelect={pick}
        label={agentName ?? "Select an agent"}
        activeAgentId={agentId}
        showPinnedAgent={false}
        className="h-9 w-full max-w-md justify-between type-body"
      />
      {headError && <LabError message={headError} />}
      {agentId && head && (
        <>
          <div className="flex flex-col gap-1">
            <span className="type-secondary font-medium">Mapping</span>
            {declared.length === 0 ? (
              <span className="type-secondary text-muted-foreground">No declared variables</span>
            ) : (
              <div className="grid max-w-2xl grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                {declared.map((d) => (
                  <div key={d.name} className="contents">
                    <span className="truncate type-body" title={d.helpText ?? d.name}>{d.label ?? d.name}</span>
                    <Select
                      value={mapping[d.name] || NONE}
                      onValueChange={(v) => setEdited({ agentId: agentId ?? "", mapping: { ...mapping, [d.name]: v === NONE ? "" : v } })}
                      aria-label={`Value for ${d.name}`}
                      options={options}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="type-secondary font-medium">Not sent · {applied.unmapped.length}</span>
            {applied.unmapped.length > 0 ? (
              <DataTable columns={["value"]} rows={applied.unmapped.map((v) => ({ value: v.label }))} />
            ) : (
              <span className="type-secondary text-muted-foreground">Nothing left out</span>
            )}
          </div>
          <label className="flex items-center gap-2 type-body">
            <Switch checked={asMessage} onCheckedChange={setAsMessage} aria-label="Copy for AI text as the message" />
            Copy for AI text as the message
          </label>
          <div>
            <Button variant="primary" icon={<Send className="h-4 w-4" />} onClick={() => void send()} disabled={busy} aria-label="Send to agent builder">
              {busy ? "Sending" : "Send to agent builder"}
            </Button>
          </div>
        </>
      )}
      {error && <LabError message={error} />}
      {sent && (
        <div className="flex flex-col gap-2 rounded-md border border-border p-2">
          <DataTable
            columns={["name", "value"]}
            rows={[
              { name: "Agent", value: sent.agentName },
              { name: "Screenshot", value: sent.screenshotFileId ? "attached" : "none to send" },
              { name: "Variables sent", value: sent.variables.join(", ") || "none" },
              { name: "Not sent", value: [...sent.unmapped, ...sent.unmappedByService].join(", ") || "none" },
            ]}
          />
          <div className="flex items-center gap-3">
            <RecordId value={sent.sampleId} label="Test case" />
            <Link href={`/agents/${sent.agentId}/build`} className="type-body underline">
              Open in agent builder
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
