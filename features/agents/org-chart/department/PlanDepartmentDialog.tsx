// features/agents/org-chart/department/PlanDepartmentDialog.tsx
//
// THE SUMMIT of the open-position ladder (common-docs/systems/agents/org-chart/
// VISION.md rule 5): a person describes a department in plain words and the
// platform creates the seats under a chosen box, each seat's job, and — when
// they ask — each seat's agent and an Orchestra whose leader directs them.
//
// Composes the rungs, never re-implements them:
//   · plan     — `org_chart.department_planner` (kind `department_plan`), headless JSON;
//   · seats    — `createOrgPosition` + `setManualManager` (the chart's own thunks);
//   · jobs     — `createSeatJob` (../seatJob.ts, the same door as "Define the job");
//   · agents   — `buildSeatAgent` (../seatAgent.ts: mandates.holder_draft → agent → Holder);
//   · Orchestra — `useCreateConductor` + `addAgentToOrchestra` + `syncConductorPrompt`.
// Every write names the department's organization. "Undo" archives the
// positions this batch created (their links stay, Trash restores them).

"use client";

import { useEffect, useState } from "react";
import { Bot, ClipboardList, Network, Plus, RotateCcw, Trash2, Wand2, X } from "lucide-react";
import { useHeadlessAgentJson } from "@ai-matrx/chat/agents/hooks/useHeadlessAgentJson";
import { useDeclaredSurfaceMandates } from "@ai-matrx/chat/surfaces/runtime/surface-mandates";
import { MANDATE_KEYS, type AnyMandateKey } from "@ai-matrx/agents/mandates";
import { Badge, Button, Select } from "@ai-matrx/design-system/controls";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ProInput } from "@/components/official/ProInput";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId, selectOrganizationName } from "@/lib/redux/slices/appContextSlice";
import {
  createOrgPosition,
  removeOrgPosition,
  restoreOrgPosition,
  setManualManager,
} from "@/features/agents/redux/orchestras/orgChartThunks";
import { addAgentToOrchestra } from "@/features/agents/redux/orchestras/thunks";
import { useCreateConductor } from "@/features/agents/orchestras/conductor/useCreateConductor";
import { syncConductorPrompt } from "@/features/agents/orchestras/conductor/thunks";
import { DEFAULT_ORCHESTRA_ACCENT } from "@/features/agents/orchestras/constants";
import { toast } from "@/lib/toast";
import { boxId } from "../constants";
import type { OrgPosition } from "../positionsService";
import { createSeatJob, SEAT_JOB_SURFACE, seatJobScope } from "../seatJob";
import { buildSeatAgent, HOLDER_DRAFT_MANDATE_KEY, SeatAgentNotBoundError } from "../seatAgent";
import {
  coerceDepartmentPlan,
  creationOrder,
  removeSeat,
  seatProblems,
  type DepartmentPlan,
  type PlannedSeat,
} from "./departmentPlan";

const PLANNER = MANDATE_KEYS.org_chart__department_planner;
const DISCLOSURE = [
  { mandateKey: PLANNER, does: "plans a department's positions and their jobs" },
  { mandateKey: HOLDER_DRAFT_MANDATE_KEY, does: "builds the agent for each new position" },
] as const;
const UNDER_BOX = "__box__";

/** Where the department goes. */
export interface PlanDepartmentRequest {
  /** The box it sits under (box id); null = the top of the chart. */
  underBoxId: string | null;
  /** "Head of Marketing (Position)". */
  underLabel: string | null;
  /** The box's own organization when known (a position's); else the active one is used. */
  organizationId: string | null;
  /** Names already under that box. */
  existingTeam: string[];
}

export function PlanDepartmentDialog({
  request,
  onClose,
  onFocus,
}: {
  request: PlanDepartmentRequest | null;
  onClose: () => void;
  /** Show a box on the chart (the new leader). */
  onFocus?: (boxId: string) => void;
}) {
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {request && <Body request={request} onClose={onClose} onFocus={onFocus} />}
      </DialogContent>
    </Dialog>
  );
}

type Step = "describe" | "review" | "made";

interface SeatRun {
  positionId?: string;
  mandateId?: string;
  mandateKey?: AnyMandateKey;
  placed?: boolean;
  agentId?: string;
  /** The agent exists but has not taken the job yet. */
  unboundAgentId?: string;
  busy?: string | null;
  error?: string | null;
}

let seatSeq = 0;
const newKey = () => `seat-new-${++seatSeq}`;

function Body({
  request,
  onClose,
  onFocus,
}: {
  request: PlanDepartmentRequest;
  onClose: () => void;
  onFocus?: (boxId: string) => void;
}) {
  const dispatch = useAppDispatch();
  const planner = useHeadlessAgentJson();
  const builder = useHeadlessAgentJson();
  const { create: createConductor, error: conductorError } = useCreateConductor();
  useDeclaredSurfaceMandates(DISCLOSURE);
  const activeOrgId = useAppSelector(selectOrganizationId);
  const activeOrgName = useAppSelector(selectOrganizationName);
  const organizationId = request.organizationId ?? activeOrgId ?? null;

  const [step, setStep] = useState<Step>("describe");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<DepartmentPlan | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, SeatRun>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [leaderName, setLeaderName] = useState("");
  const [orchestra, setOrchestra] = useState<{ conductorId: string; warnings: string[] } | null>(null);
  const [undone, setUndone] = useState(false);

  useEffect(() => {
    if (plan && !leaderName) setLeaderName(`${plan.department || "Department"} lead`);
  }, [plan, leaderName]);

  const patchRun = (key: string, patch: Partial<SeatRun>) =>
    setRuns((cur) => ({ ...cur, [key]: { ...cur[key], ...patch } }));
  const patchSeat = (key: string, patch: Partial<PlannedSeat>) =>
    setPlan((p) => (p ? { ...p, seats: p.seats.map((s) => (s.key === key ? { ...s, ...patch } : s)) } : p));

  // ── 1. plan it ───────────────────────────────────────────────────────────
  const planIt = async () => {
    setError(null);
    try {
      const value = await planner.run<unknown>({
        mandateKey: PLANNER,
        surfaceKey: `mandate:${PLANNER}`,
        sourceFeature: "agent-builder",
        expect: "json",
        initiation: "user",
        surfaceName: null,
        ...(organizationId ? { organizationId } : {}),
        variables: {
          department_description: description.trim(),
          ...(request.underLabel ? { parent: request.underLabel } : {}),
          ...(organizationId === activeOrgId && activeOrgName ? { organization_context: activeOrgName } : {}),
          ...(request.existingTeam.length ? { existing_team: request.existingTeam.join("\n") } : {}),
        },
      });
      setPlan(coerceDepartmentPlan(value, () => newKey()));
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No plan came back.");
    }
  };

  // ── 2. create the seats and their jobs ─────────────────────────────────
  const seats = plan?.seats ?? [];
  const order = creationOrder(seats);
  const problems = seatProblems(seats);

  /** One seat, resumed from whatever step it reached: position → placed → job. */
  const createOne = async (seat: PlannedSeat, positionIds: Map<string, string>): Promise<boolean> => {
    if (!organizationId) return false;
    let run = { ...runs[seat.key] };
    patchRun(seat.key, { busy: "Creating…", error: null });
    try {
      if (!run.positionId) {
        const made = await dispatch(
          createOrgPosition({ organizationId, name: seat.name, description: seat.description || null }),
        );
        if ("error" in made) throw new Error(made.error);
        run = { ...run, positionId: made.id };
        patchRun(seat.key, { positionId: made.id });
      }
      positionIds.set(seat.key, run.positionId as string);
      if (!run.placed) {
        const managerPositionId = seat.reportsTo ? positionIds.get(seat.reportsTo) : undefined;
        const managerBox = managerPositionId ? boxId("position", managerPositionId) : request.underBoxId;
        if (managerBox) {
          const placed = await dispatch(setManualManager(managerBox, boxId("position", run.positionId as string)));
          if (!placed.ok) throw new Error(`Created, but not placed on the chart: ${placed.error}`);
        }
        run = { ...run, placed: true };
        patchRun(seat.key, { placed: true });
      }
      if (!run.mandateId) {
        const job = await createSeatJob(
          dispatch,
          { id: run.positionId as string, name: seat.name, description: seat.description || null, organizationId },
          { goal: seat.goal, output: seat.output, inputs: seat.inputs },
        );
        patchRun(seat.key, { mandateId: job.mandateId, mandateKey: job.mandateKey });
      }
      patchRun(seat.key, { busy: null });
      return true;
    } catch (e) {
      patchRun(seat.key, { busy: null, error: e instanceof Error ? e.message : "It could not be created." });
      return false;
    }
  };

  const createAll = async () => {
    setWorking("seats");
    setStep("made");
    const positionIds = new Map<string, string>();
    for (const [k, r] of Object.entries(runs)) if (r.positionId) positionIds.set(k, r.positionId);
    for (const seat of order) await createOne(seat, positionIds);
    setWorking(null);
  };

  // ── 3. build their agents ───────────────────────────────────────────────
  const buildOne = async (seat: PlannedSeat) => {
    const run = runs[seat.key];
    if (!run?.mandateId || !run.mandateKey || !organizationId || run.agentId) return;
    patchRun(seat.key, { busy: "Building its agent…", error: null });
    try {
      const agentId = await buildSeatAgent(
        dispatch,
        builder.run,
        {
          mandateKey: run.mandateKey,
          mandateId: run.mandateId,
          organizationId,
          seatName: seat.name,
          description: seat.description,
          goal: seat.goal,
          output: seat.output,
          inputs: seat.inputs,
        },
        run.unboundAgentId,
      );
      patchRun(seat.key, { busy: null, agentId, unboundAgentId: undefined });
    } catch (e) {
      patchRun(seat.key, {
        busy: null,
        error: e instanceof Error ? e.message : "The agent could not be built.",
        ...(e instanceof SeatAgentNotBoundError ? { unboundAgentId: e.agentId } : {}),
      });
    }
  };
  const buildAll = async () => {
    setWorking("agents");
    for (const seat of order) await buildOne(seat);
    setWorking(null);
  };

  // ── 4. put them in an Orchestra ─────────────────────────────────────────
  const makeOrchestra = async () => {
    const memberIds = order.map((s) => runs[s.key]?.agentId).filter((x): x is string => Boolean(x));
    if (!memberIds.length) return;
    setWorking("orchestra");
    setError(null);
    const conductorId = await createConductor({
      name: leaderName.trim() || `${plan?.department ?? "Department"} lead`,
      accent: DEFAULT_ORCHESTRA_ACCENT,
      organizationId,
    });
    if (!conductorId) {
      setWorking(null);
      setError(`The leader could not be created.${conductorError ? ` ${conductorError}` : ""}`);
      return;
    }
    const warnings: string[] = [];
    for (const agentId of memberIds) {
      const res = await dispatch(addAgentToOrchestra({ conductorId, agentId }));
      if (!res.ok) warnings.push(res.error ?? "An agent could not be added.");
    }
    if (request.underBoxId) {
      const placed = await dispatch(setManualManager(request.underBoxId, boxId("agent", conductorId)));
      if (!placed.ok) warnings.push(placed.error ?? "The leader could not be placed on the chart.");
    }
    const sync = await dispatch(syncConductorPrompt({ initiation: "user", conductorId, memberIds }));
    if (!sync.ok) warnings.push(`Its prompt still needs its team: ${sync.error ?? "sync failed"}.`);
    setOrchestra({ conductorId, warnings });
    setWorking(null);
  };

  // ── undo ────────────────────────────────────────────────────────────────
  const created = order
    .map((s) => ({ seat: s, run: runs[s.key] }))
    .filter((x): x is { seat: PlannedSeat; run: SeatRun & { positionId: string } } => Boolean(x.run?.positionId));
  const asPosition = (x: (typeof created)[number]): OrgPosition => ({
    id: x.run.positionId,
    organizationId: organizationId ?? "",
    name: x.seat.name,
    description: x.seat.description || null,
    filledByUserId: null,
    hrJobTitleId: null,
    mandateId: x.run.mandateId ?? null,
  });
  const undo = async () => {
    setWorking("undo");
    const failed: string[] = [];
    for (const x of created) {
      const res = await dispatch(removeOrgPosition(asPosition(x)));
      if (!res.ok) failed.push(`${x.seat.name}: ${res.error}`);
    }
    setWorking(null);
    if (failed.length) setError(`Some positions could not be archived. ${failed.join(" ")}`);
    else {
      setUndone(true);
      toast.success(`${created.length} positions archived.`, {
        action: {
          label: "Restore",
          onClick: () => {
            void (async () => {
              for (const x of created) await dispatch(restoreOrgPosition(asPosition(x)));
              setUndone(false);
            })();
          },
        },
      });
    }
  };

  // ── render ──────────────────────────────────────────────────────────────
  const whereLine = `${request.underLabel ? `Under ${request.underLabel}` : "At the top of the chart"}${
    organizationId === activeOrgId && activeOrgName ? ` · ${activeOrgName}` : ""
  }`;

  if (!organizationId) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Plan a department</DialogTitle>
          <DialogDescription>Choose an organization first, at the bottom of the sidebar.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </>
    );
  }

  if (step === "describe") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Plan a department</DialogTitle>
          <DialogDescription>{whereLine}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ProTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 5 roles: a lead, a writer, … — or “a dental front desk”"
            rows={5}
            autoGrow
            maxHeight={320}
            aria-label="Describe the department"
            surfaceName={SEAT_JOB_SURFACE}
            getApplicationScope={seatJobScope}
          />
          {error && (
            <p className="type-secondary text-destructive">
              {error}
              <ErrorAlchemyMenu error={error} />
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Wand2 />}
              disabled={!description.trim() || planner.isRunning}
              onClick={() => void planIt()}
            >
              {planner.isRunning ? "Planning…" : "Plan it"}
            </Button>
          </div>
        </div>
      </>
    );
  }

  const managerOptions = (seat: PlannedSeat) => [
    { value: UNDER_BOX, label: request.underLabel ? `Directly under ${request.underLabel}` : "At the top" },
    ...seats.filter((s) => s.key !== seat.key).map((s) => ({ value: s.key, label: `Under ${s.name || "unnamed"}` })),
  ];
  const builtCount = order.filter((s) => runs[s.key]?.agentId).length;
  const jobCount = order.filter((s) => runs[s.key]?.mandateId).length;
  const failedCount = order.filter((s) => runs[s.key]?.error).length;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{step === "review" ? "Check the plan" : plan?.department || "Department"}</DialogTitle>
        <DialogDescription>{whereLine}</DialogDescription>
      </DialogHeader>
      <div className="flex max-h-[65dvh] flex-col gap-3 overflow-y-auto pr-1">
        {step === "review" && (
          <label className="flex flex-col gap-1.5">
            <span className="type-secondary font-medium text-foreground">Department</span>
            <ProInput
              value={plan?.department ?? ""}
              onChange={(e) => setPlan((p) => (p ? { ...p, department: e.target.value } : p))}
            />
          </label>
        )}

        <ul className="flex flex-col gap-2">
          {(step === "review" ? seats : order).map((seat, i) => {
            const run = runs[seat.key] ?? {};
            const expanded = step === "review" && open === seat.key;
            return (
              <li key={seat.key} className="flex flex-col gap-2 rounded-md border border-border p-2.5">
                <div className="flex items-center gap-2">
                  {step === "review" ? (
                    <>
                      <ProInput
                        value={seat.name}
                        onChange={(e) => patchSeat(seat.key, { name: e.target.value })}
                        aria-label={`Position ${i + 1} name`}
                        className="flex-1"
                      />
                      <Select
                        aria-label={`Where ${seat.name || `position ${i + 1}`} sits`}
                        value={seat.reportsTo ?? UNDER_BOX}
                        options={managerOptions(seat)}
                        onValueChange={(v) => patchSeat(seat.key, { reportsTo: v === UNDER_BOX ? null : v })}
                        className="w-48"
                      />
                      <Button
                        variant="quiet"
                        icon={<ClipboardList />}
                        aria-label={`Edit the job of ${seat.name || `position ${i + 1}`}`}
                        onClick={() => setOpen(expanded ? null : seat.key)}
                      />
                      <Button
                        variant="quiet"
                        icon={<X />}
                        aria-label={`Remove ${seat.name || `position ${i + 1}`}`}
                        onClick={() => setPlan((p) => (p ? { ...p, seats: removeSeat(p.seats, seat.key) } : p))}
                      />
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate type-body font-medium text-foreground">{seat.name}</span>
                      <SeatStatus run={run} />
                      {run.error && !run.busy && working === null && (
                        <Button
                          variant="outline"
                          icon={<RotateCcw />}
                          onClick={() =>
                            void (async () => {
                              setWorking("retry");
                              if (!run.mandateId) {
                                const ids = new Map<string, string>();
                                for (const [k, r] of Object.entries(runs)) if (r.positionId) ids.set(k, r.positionId);
                                await createOne(seat, ids);
                              } else await buildOne(seat);
                              setWorking(null);
                            })()
                          }
                        >
                          Retry
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {step === "review" && !expanded && seat.goal && (
                  <p className="truncate type-secondary text-muted-foreground" title={seat.goal}>
                    {seat.goal}
                  </p>
                )}
                {run.error && (
                  <p className="type-secondary text-destructive">
                    {run.error}
                    <ErrorAlchemyMenu error={run.error} />
                  </p>
                )}
                {expanded && <SeatJobEditor seat={seat} onChange={(patch) => patchSeat(seat.key, patch)} />}
              </li>
            );
          })}
        </ul>

        {step === "review" && (
          <div>
            <Button
              variant="quiet"
              icon={<Plus />}
              onClick={() => {
                const key = newKey();
                setPlan((p) =>
                  p
                    ? {
                        ...p,
                        seats: [
                          ...p.seats,
                          { key, name: "", description: "", goal: "", inputs: [], output: "", reportsTo: null },
                        ],
                      }
                    : p,
                );
                setOpen(key);
              }}
            >
              Add a position
            </Button>
          </div>
        )}

        {step === "review" && plan && plan.questions.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="type-secondary font-medium text-foreground">Worth deciding</span>
            <ul className="list-disc pl-5 type-secondary text-muted-foreground">
              {plan.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        {step === "made" && jobCount === order.length && order.length > 0 && !undone && (
          <div className="flex flex-col gap-2 rounded-md border border-border p-2.5">
            <span className="type-secondary font-medium text-foreground">Leader</span>
            <ProInput
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
              aria-label="Leader's name"
              disabled={Boolean(orchestra) || working !== null}
            />
            {orchestra && (
              <div className="flex items-center gap-2">
                <Badge tone={orchestra.warnings.length ? "warning" : "success"} icon={<Network />}>
                  {orchestra.warnings.length ? "Made, with problems" : "Orchestra made"}
                </Badge>
                {onFocus && (
                  <Button variant="quiet" onClick={() => onFocus(boxId("agent", orchestra.conductorId))}>
                    Show on chart
                  </Button>
                )}
              </div>
            )}
            {orchestra?.warnings.map((w, i) => (
              <p key={i} className="type-secondary text-destructive">
                {w}
              </p>
            ))}
          </div>
        )}

        {error && (
          <p className="type-secondary text-destructive">
            {error}
            <ErrorAlchemyMenu error={error} />
          </p>
        )}
        {step === "review" && problems.length > 0 && (
          <p className="type-secondary text-muted-foreground">{problems[0]}</p>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {step === "review" ? (
          <>
            <Button variant="outline" onClick={() => setStep("describe")}>
              Back
            </Button>
            <Button
              variant="primary"
              disabled={!seats.length || problems.length > 0}
              onClick={() => void createAll()}
            >
              {`Create ${seats.length} ${seats.length === 1 ? "position" : "positions"}`}
            </Button>
          </>
        ) : (
          <>
            {created.length > 0 && !undone && (
              <Button variant="danger" icon={<Trash2 />} disabled={working !== null} onClick={() => void undo()}>
                Undo
              </Button>
            )}
            {!undone && jobCount > 0 && builtCount < jobCount && (
              <Button variant="outline" icon={<Bot />} disabled={working !== null} onClick={() => void buildAll()}>
                {working === "agents" ? "Building agents…" : "Build their agents"}
              </Button>
            )}
            {!undone && builtCount > 0 && !orchestra && (
              <Button
                variant="outline"
                icon={<Network />}
                disabled={working !== null || !leaderName.trim()}
                onClick={() => void makeOrchestra()}
              >
                {working === "orchestra" ? "Making the Orchestra…" : "Put them in an Orchestra"}
              </Button>
            )}
            <Button variant="primary" disabled={working !== null} onClick={onClose}>
              {working === "seats" ? "Creating…" : failedCount ? "Close" : "Done"}
            </Button>
          </>
        )}
      </div>
    </>
  );
}

function SeatStatus({ run }: { run: SeatRun }) {
  if (run.busy) return <Badge tone="info">{run.busy}</Badge>;
  if (run.error) return <Badge tone="destructive">Stopped</Badge>;
  if (run.agentId) return <Badge tone="success">Agent at work</Badge>;
  if (run.mandateId) return <Badge tone="primary">Needs an agent</Badge>;
  if (run.positionId) return <Badge>Noted</Badge>;
  return <Badge>Waiting</Badge>;
}

function SeatJobEditor({ seat, onChange }: { seat: PlannedSeat; onChange: (patch: Partial<PlannedSeat>) => void }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-border pt-2.5">
      <label className="flex flex-col gap-1.5">
        <span className="type-secondary font-medium text-foreground">What it covers</span>
        <ProTextarea
          value={seat.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={1}
          autoGrow
          maxHeight={160}
          surfaceName={SEAT_JOB_SURFACE}
          getApplicationScope={seatJobScope}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="type-secondary font-medium text-foreground">Goal</span>
        <ProTextarea
          value={seat.goal}
          onChange={(e) => onChange({ goal: e.target.value })}
          rows={2}
          autoGrow
          maxHeight={240}
          surfaceName={SEAT_JOB_SURFACE}
          getApplicationScope={seatJobScope}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="type-secondary font-medium text-foreground">What it&apos;s given</span>
        {seat.inputs.map((input, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <ProTextarea
              value={input.description}
              onChange={(e) =>
                onChange({ inputs: seat.inputs.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })
              }
              aria-label={`Input ${i + 1}`}
              rows={1}
              autoGrow
              maxHeight={160}
              surfaceName={SEAT_JOB_SURFACE}
              getApplicationScope={seatJobScope}
              className="flex-1"
            />
            <Button
              variant="quiet"
              icon={<X />}
              aria-label={`Remove input ${i + 1}`}
              onClick={() => onChange({ inputs: seat.inputs.filter((_, j) => j !== i) })}
            />
          </div>
        ))}
        <div>
          <Button
            variant="quiet"
            icon={<Plus />}
            onClick={() => onChange({ inputs: [...seat.inputs, { name: "", description: "", required: true }] })}
          >
            Add input
          </Button>
        </div>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="type-secondary font-medium text-foreground">What it hands back</span>
        <ProTextarea
          value={seat.output}
          onChange={(e) => onChange({ output: e.target.value })}
          rows={2}
          autoGrow
          maxHeight={200}
          surfaceName={SEAT_JOB_SURFACE}
          getApplicationScope={seatJobScope}
        />
      </label>
    </div>
  );
}
