"use client";

/**
 * Memory Lab — one trial's workspace (PLAN §4). Left: the person's conversations and the review
 * controls. Center: the agents and bindings, Reflect, the steward box, and the step timeline.
 * Right: the sandbox store at any step. Runs float in the live run window (the trial's run set);
 * a run a reload interrupted is offered back to finish.
 */
import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Eye, Layers, ScanSearch, Send, Trash2 } from "lucide-react";

import { RunSetWindowController } from "@ai-matrx/chat/agents/components/live-run/RunSetDisplay";
import { ErrorNotice, RecordId } from "@ai-matrx/design-system";
import { Button, PropertyRow, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ProTextarea } from "@/components/official/ProTextarea";
import { useOpenProvisionWindow } from "@/features/overlays/definitions/provisionWindow.overlay";
import { useWatchAiRun } from "@/features/overlays/definitions/aiWatchWindow.overlay";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import type { ProvisionSnapshot } from "@/features/provision-window/data";
import { extractErrorMessage } from "@/utils/errors";
import { listPersonConversations, listSteps, loadAgents, loadTrial, updateTrial, type TrialPatch } from "../data";
import { memoryLabRunSetKey, useMemoryLabRunner } from "../useMemoryLabRunner";
import {
  MEMORY_ROLES,
  ROLE_LABEL,
  type CandidateConversation,
  type LabAgent,
  type MemoryTrial,
  type MemoryTrialStep,
} from "../types";
import { ConversationsColumn } from "./ConversationsColumn";
import { MemoryFilesPanel } from "./MemoryFilesPanel";
import { RoleAgentsPanel } from "./RoleAgentsPanel";
import { StepTimeline } from "./StepTimeline";

const LAB_HREF = "/administration/intelligence/memory-lab";
const SURFACE_NAME = "matrx-admin/memory-lab";

const STAGE_LABEL = { capturing: "Capturing provision", running: "Agent running", applying: "Applying edits" } as const;

export function TrialWorkspace({ trialId }: { trialId: string }) {
  const [trial, setTrial] = useState<MemoryTrial | null>(null);
  const [gateError, setGateError] = useState<unknown>(null);
  const [steps, setSteps] = useState<MemoryTrialStep[]>([]);
  const [conversations, setConversations] = useState<CandidateConversation[] | null>(null);
  const [agents, setAgents] = useState<Map<string, LabAgent>>(new Map());
  const [captures, setCaptures] = useState<{ key: string; snapshots: ProvisionSnapshot[] } | null>(null);
  const [knownValues, setKnownValues] = useState<Map<string, string[]>>(new Map());
  const [stewardText, setStewardText] = useState("");
  const [notes, setNotes] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const openProvision = useOpenProvisionWindow();
  const watchAiRun = useWatchAiRun();

  const agentIdsKey = trial ? MEMORY_ROLES.map((r) => trial.agents[r] ?? "").join(",") : "";

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        let t: MemoryTrial;
        try {
          t = await loadTrial(trialId);
        } catch (e) {
          if (live) setGateError(e);
          return;
        }
        if (!live) return;
        setTrial(t);
        const [s, c] = await Promise.all([listSteps(trialId), listPersonConversations(t.subjectUserId)]);
        if (!live) return;
        setSteps(s);
        setConversations(c);
      } catch (e) {
        if (live) setLoadError(extractErrorMessage(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [trialId]);

  // The chosen agents and every agent a step names (names + declared variables).
  const stepAgentKey = steps.map((s) => s.agentId ?? "").join(",");
  useEffect(() => {
    const ids = [...agentIdsKey.split(","), ...stepAgentKey.split(",")].filter(Boolean);
    if (ids.length === 0) return;
    loadAgents(ids)
      .then(setAgents)
      .catch((e: unknown) => setLoadError(extractErrorMessage(e)));
  }, [agentIdsKey, stepAgentKey]);

  const runner = useMemoryLabRunner({
    trial,
    agentVariables: async (agentId) => {
      const known = agents.get(agentId);
      if (known) return known.variables;
      const fresh = await loadAgents([agentId]);
      return fresh.get(agentId)?.variables ?? [];
    },
    onTrialChanged: setTrial,
    // The apply door answers with the step's outcome; the full row (its doors) is read back.
    onStep: () => {
      listSteps(trialId)
        .then(setSteps)
        .catch((e: unknown) => setLoadError(extractErrorMessage(e)));
    },
    onSnapshots: (key, snapshots) => {
      setCaptures({ key, snapshots });
      setKnownValues((prev) => {
        const next = new Map(prev);
        for (const s of snapshots) next.set(s.pointKey, s.values.map((v) => v.name));
        return next;
      });
    },
  });

  const patch = async (p: TrialPatch) => {
    if (!trial) return;
    try {
      setTrial(await updateTrial(trial, p));
    } catch (e) {
      setLoadError(extractErrorMessage(e));
    }
  };

  const captureAndOpen = async (role: (typeof MEMORY_ROLES)[number], conversationId: string | null) => {
    const snaps = await runner.captureOnly(role, conversationId);
    const first = snaps ? [...snaps.values()][0] : undefined;
    if (first) openProvision(first.id, `${ROLE_LABEL[role]} provision`);
  };

  if (gateError) {
    return (
      <>
        <RecordPageHeader backHref={LAB_HREF} parents={[{ label: "Memory Lab", href: LAB_HREF }]} record={{ name: "Trial" }} />
        <AccessGate
          token="memory_trial"
          id={trialId}
          error={gateError}
          fallbackHref={LAB_HREF}
          fallbackLabel="Memory Lab"
        />
      </>
    );
  }

  const conversationTitles = new Map((conversations ?? []).map((c) => [c.id, c.title] as const));
  const phase = runner.phase;
  const archived = trial?.status === "archived";

  return (
    <>
      <RecordPageHeader
        backHref={LAB_HREF}
        parents={[
          { label: "Intelligence", href: "/administration/intelligence" },
          { label: "Memory Lab", href: LAB_HREF },
        ]}
        record={{ name: trial?.title ?? "Trial", token: "memory_trial", id: trialId }}
        status={archived ? { label: "Archived" } : undefined}
        actions={
          trial
            ? [
                {
                  label: archived ? "Restore" : "Archive",
                  icon: archived ? ArchiveRestore : Archive,
                  onPress: () => void patch({ status: archived ? "open" : "archived" }),
                },
              ]
            : undefined
        }
      />
      {trial ? (
        <RunSetWindowController
          setKey={memoryLabRunSetKey(trial.id)}
          instanceId={`memory-lab:${trial.id}`}
          label="Memory Lab run"
          active={phase?.stage === "running"}
        />
      ) : null}
      <div className="flex h-full min-h-0 flex-col gap-2 p-3">
        {loadError ? <ErrorNotice title="Something could not be read or saved" message={loadError} /> : null}
        {runner.error ? <ErrorNotice title="The run stopped" message={runner.error} /> : null}
        {!trial ? (
          <RegionSkeleton shape="cards" count={3} aria-label="Reading the trial" />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)_minmax(260px,1fr)]">
            <div className="flex min-h-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <PropertyRow label="Person">
                  <RecordId value={trial.subjectUserId} label={trial.subjectLabel || "Person"} token="user" labelled />
                </PropertyRow>
              </div>
              <ConversationsColumn
                conversations={conversations}
                steps={steps}
                busy={runner.busy}
                runningId={phase?.subjectConversationId ?? null}
                hasReviewer={Boolean(trial.agents.review)}
                archived={archived}
                onReview={(id) => void runner.review(id)}
                onReviewMany={(ids) => void runner.reviewMany(ids)}
                onCapture={(id) => void captureAndOpen("review", id)}
                onStop={runner.stop}
              />
            </div>

            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
              {phase ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2" aria-live="polite">
                  <span className="type-label text-foreground">{ROLE_LABEL[phase.role]}</span>
                  <span className="type-secondary text-muted-foreground">
                    {STAGE_LABEL[phase.stage]}
                    {phase.batch ? ` · ${phase.batch.at} of ${phase.batch.of}` : ""}
                  </span>
                </div>
              ) : null}

              {trial.pendingRuns.map((p) => (
                <div key={p.runConversationId} className="flex flex-wrap items-center gap-2 rounded-md border border-warning bg-card px-3 py-2">
                  <span className="type-label text-foreground">Unapplied {ROLE_LABEL[p.role].toLowerCase()} run</span>
                  <RecordId value={p.runConversationId} label="Run conversation" token="conversation" />
                  <span className="flex-1" />
                  <Button variant="quiet" icon={<Eye />} onClick={() => watchAiRun({ conversationId: p.runConversationId })}>
                    Watch AI
                  </Button>
                  <Button
                    variant="primary"
                    disabled={runner.busy || archived}
                    title={archived ? "Archived: restore the trial to apply" : undefined}
                    onClick={() => void runner.finishPending(p)}
                  >
                    Apply its edits
                  </Button>
                  <Button variant="quiet" icon={<Trash2 />} disabled={runner.busy} onClick={() => void runner.discardPending(p)}>
                    Discard
                  </Button>
                </div>
              ))}

              <RoleAgentsPanel
                trial={trial}
                agents={agents}
                knownValues={knownValues}
                disabled={runner.busy}
                locked={archived}
                onAgent={(role, agentId) => void patch({ agent: { role, agentId } })}
                onBindings={(bindings) => void patch({ bindings })}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  icon={<Layers />}
                  disabled={runner.busy || archived || !trial.agents.reflect}
                  title={archived ? "Archived: restore the trial to run" : trial.agents.reflect ? undefined : "Choose a reflection agent first"}
                  onClick={() => void runner.reflect()}
                >
                  Reflect
                </Button>
                <Button variant="quiet" icon={<ScanSearch />} disabled={runner.busy} onClick={() => void captureAndOpen("reflect", null)}>
                  Capture store provision
                </Button>
                {captures
                  ? captures.snapshots.map((s) => (
                      <Button key={s.id} variant="quiet" onClick={() => openProvision(s.id, s.pointLabel || s.pointKey)}>
                        {s.pointLabel || s.pointKey}
                      </Button>
                    ))
                  : null}
              </div>

              <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
                <span className="type-label text-foreground">Ask the steward</span>
                <ProTextarea
                  value={stewardText}
                  onChange={(e) => setStewardText(e.target.value)}
                  placeholder="What the person would ask, e.g. forget my old address"
                  disabled={archived}
                  rows={2}
                  surfaceName={SURFACE_NAME}
                />
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    icon={<Send />}
                    disabled={runner.busy || archived || !trial.agents.steward || !stewardText.trim()}
                    title={archived ? "Archived: restore the trial to run" : trial.agents.steward ? undefined : "Choose a steward agent first"}
                    onClick={async () => {
                      const step = await runner.steward(stewardText.trim());
                      if (step) setStewardText("");
                    }}
                  >
                    Send to steward
                  </Button>
                </div>
              </div>

              <StepTimeline steps={steps} agents={agents} conversationTitles={conversationTitles} />

              <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
                <span className="type-label text-foreground">Notes</span>
                <ProTextarea
                  value={notes ?? trial.notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes !== null && notes !== trial.notes) void patch({ notes });
                  }}
                  placeholder="What you noticed in this trial"
                  rows={3}
                  surfaceName={SURFACE_NAME}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <MemoryFilesPanel currentFiles={trial.files} steps={steps} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
