"use client";

/**
 * Repair Runs — press Start and an agent works a known problem in the platform sandbox.
 *
 * A run IS the admin's own chat (aidream `services/platform_repair`): started as them, in their
 * admin organization, bound to the platform's box. Each row opens that chat on the main site in a
 * new tab, where it streams live and the admin can keep talking to the agent. Nothing here starts
 * a run on its own. `?subject_kind=…&subject_id=…` pre-fills the problem so other admin pages can
 * link straight here.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Play, Server, Wrench } from "lucide-react";
import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import { BackendApiError } from "@ai-matrx/api";
import { ErrorNotice, ReadGate } from "@ai-matrx/design-system";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  LabeledField,
  RegionSkeleton,
  Select,
  type BadgeTone,
} from "@ai-matrx/design-system/controls";
import { ProTextarea } from "@/components/official/ProTextarea";
import AppLink from "@/components/navigation/AppLink";
import { AdminUserRef } from "@/features/admin/users/components/AdminUserRef";
import { crossDeploymentHref } from "@/lib/deployment/surfaces";
import {
  listRepairRuns,
  readPlatformBox,
  startRepairRun,
  type PlatformBox,
  type RepairRun,
  type SubjectKind,
} from "./api";

const REFRESH_MS = 10_000;

const SUBJECT_OPTIONS = [
  { value: "none", label: "No record — just my words" },
  { value: "system_error", label: "System error" },
  { value: "feedback", label: "Feedback" },
  { value: "check_finding", label: "Check finding" },
] as const;
type SubjectChoice = (typeof SUBJECT_OPTIONS)[number]["value"];

function isSubjectKind(value: string | null): value is SubjectKind {
  return value === "system_error" || value === "feedback" || value === "check_finding";
}

function chatHref(conversationId: string): string {
  const path = `/chat/${conversationId}`;
  return crossDeploymentHref(path) ?? path;
}

function statusTone(status: string | null): BadgeTone {
  if (status === "completed") return "success";
  if (status === "failed" || status === "error" || status === "cancelled") return "destructive";
  if (status === "pending" || status === "running" || status === "streaming") return "info";
  return "neutral";
}

function errorText(error: unknown): string {
  if (error instanceof BackendApiError) return error.detail || error.userMessage;
  return error instanceof Error ? error.message : String(error);
}

function when(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function RepairRunsConsole() {
  const params = useSearchParams();
  const presetKind = params.get("subject_kind");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [subjectChoice, setSubjectChoice] = useState<SubjectChoice>(
    isSubjectKind(presetKind) ? presetKind : "none",
  );
  const [subjectId, setSubjectId] = useState(params.get("subject_id") ?? "");
  const [instructions, setInstructions] = useState("");
  const [starting, setStarting] = useState(false);
  const [runs, setRuns] = useState<RepairRun[] | null>(null);
  const [box, setBox] = useState<PlatformBox | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [startError, setStartError] = useState<unknown>(null);

  async function refresh() {
    try {
      const [nextRuns, nextBox] = await Promise.all([listRepairRuns(), readPlatformBox()]);
      setRuns(nextRuns);
      setBox(nextBox);
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    }
  }

  useEffect(() => {
    // First read on the next tick, then every REFRESH_MS: never a setState inside the effect body.
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  // The admin's last pick is the default: the newest run's agent, read from the server's record.
  const lastAgentId = runs?.find((run) => run.initial_agent_id)?.initial_agent_id ?? null;
  const chosenAgentId = agentId ?? lastAgentId;
  const subjectKind = subjectChoice === "none" ? null : subjectChoice;
  const missing = !chosenAgentId
    ? "Pick the agent"
    : subjectKind && !subjectId.trim()
      ? "Paste the record id"
      : !subjectKind && !instructions.trim()
        ? "Pick a problem or say what to do"
        : null;

  async function start() {
    if (missing || !chosenAgentId || starting) return;
    setStarting(true);
    setStartError(null);
    // Opened inside the click so the browser allows it; pointed at the chat once the run exists.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const run = await startRepairRun({
        agentId: chosenAgentId,
        instructions,
        subjectKind,
        subjectId: subjectKind ? subjectId.trim() : null,
      });
      if (tab) tab.location.href = chatHref(run.conversation_id);
      setInstructions("");
      void refresh();
    } catch (error) {
      tab?.close();
      setStartError(error);
    } finally {
      setStarting(false);
    }
  }

  const platformBox = box?.box ?? null;

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 sm:px-6" data-matrx-page-scroll>
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Platform sandbox</span>
            {platformBox ? (
              <>
                <Badge tone={platformBox.status === "running" || platformBox.status === "ready" ? "success" : "warning"}>
                  {platformBox.status ?? "unknown"}
                </Badge>
                <AppLink
                  href={`/administration/compute/sandbox/${platformBox.id}`}
                  className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                >
                  {platformBox.sandbox_id ?? platformBox.id}
                </AppLink>
              </>
            ) : loadError != null ? (
              <span className="text-sm text-muted-foreground">Unknown — the read failed</span>
            ) : box ? (
              <span className="text-sm text-muted-foreground">None yet — the first Start creates it</span>
            ) : null}
          </div>

          <LabeledField label="Agent" htmlFor="repair-agent" required>
            <div id="repair-agent">
              <AgentListDropdown
                onSelect={(id) => setAgentId(id)}
                activeAgentId={chosenAgentId ?? undefined}
                label={chosenAgentId ? undefined : "Select the agent"}
              />
            </div>
          </LabeledField>

          <div className="flex flex-wrap gap-3">
            <LabeledField label="Problem" htmlFor="repair-subject-kind">
              <Select
                value={subjectChoice}
                options={SUBJECT_OPTIONS}
                onValueChange={(value) => setSubjectChoice(value)}
                aria-label="Problem type"
              />
            </LabeledField>
            {subjectKind && (
              <LabeledField label="Record id" htmlFor="repair-subject-id" required>
                {/* ui-exception: a raw record id, not prose */}
                <Input
                  id="repair-subject-id"
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
              </LabeledField>
            )}
          </div>

          <LabeledField label="What to do" htmlFor="repair-instructions" optional={Boolean(subjectKind)}>
            <ProTextarea
              id="repair-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder={subjectKind ? "Anything to add (optional)" : "Describe the problem and what done looks like"}
              rows={4}
              className="text-base sm:text-sm"
              maxLength={20000}
            />
          </LabeledField>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={<Play className="h-4 w-4" />}
              onClick={() => void start()}
              disabled={Boolean(missing) || starting}
              title={missing ?? "Starts the run and opens its chat in a new tab"}
            >
              {starting ? "Starting…" : "Start"}
            </Button>
            {startError != null && (
              <ErrorNotice
                size="inline"
                title="The run did not start"
                message={errorText(startError)}
                error={startError}
                operation="Start a repair run"
              />
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground">Runs</h2>
          <ReadGate
            status={loadError != null ? "error" : runs === null ? "loading" : "ready"}
            error={loadError}
            what="repair runs"
            onRetry={() => void refresh()}
            isEmpty={!runs || runs.length === 0}
            loading={<RegionSkeleton shape="rows" count={5} aria-label="Loading runs" />}
            empty={<EmptyState icon={<Wrench className="h-5 w-5" />} title="No runs yet" line="Start one above" />}
          >
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
              {(runs ?? []).map((run) => (
                <li key={run.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <a
                    href={chatHref(run.id)}
                    target="_blank"
                    rel="noopener"
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-foreground hover:underline"
                  >
                    <span className="truncate">{run.title ?? run.id}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </a>
                  {run.repair?.subject && <Badge>{run.repair.subject.label}</Badge>}
                  <Badge tone={statusTone(run.last_request_status)}>{run.last_request_status ?? "new"}</Badge>
                  {run.created_by && <AdminUserRef userId={run.created_by} hideEmail />}
                  {run.sandbox_instance_id && (
                    <AppLink
                      href={`/administration/compute/sandbox/${run.sandbox_instance_id}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {run.repair?.sandbox_id || "sandbox"}
                    </AppLink>
                  )}
                  <span className="text-xs text-muted-foreground">{when(run.last_activity_at ?? run.created_at)}</span>
                </li>
              ))}
            </ul>
          </ReadGate>
        </section>
      </div>
    </div>
  );
}
