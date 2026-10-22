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
// Every write names the department's organization — the chosen box's own.
// The batch lives in Redux (`orchestras.departmentRuns`, ./departmentRunThunks.ts),
// so it keeps its record of what it made while the dialog is closed; the
// dialog cannot close while a step runs. "Undo" takes back everything the batch
// made (leader, agents, jobs turned off, positions to Trash); toast Restore.

"use client";

import { useEffect, useState } from "react";
import { ClipboardList, ListChecks, Network, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { useHeadlessAgentJson } from "@ai-matrx/chat/agents/hooks/useHeadlessAgentJson";
import { useDeclaredSurfaceMandates } from "@ai-matrx/chat/surfaces/runtime/surface-mandates";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { Badge, Button, Select } from "@ai-matrx/design-system/controls";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ProInput } from "@/components/official/ProInput";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId, selectOrganizationName } from "@/lib/redux/slices/appContextSlice";
import { orchestrasActions } from "@/features/agents/redux/orchestras/slice";
import { useCreateConductor } from "@/features/agents/orchestras/conductor/useCreateConductor";
import { DEFAULT_ORCHESTRA_ACCENT } from "@/features/agents/orchestras/constants";
import { boxId } from "../constants";
import { SEAT_JOB_SURFACE, seatJobScope } from "../seatJob";
import { HOLDER_DRAFT_MANDATE_KEY } from "../seatAgent";
import {
  batchInventory,
  coerceDepartmentPlan,
  creationOrder,
  departmentRunKey,
  removeSeat,
  seatNextStep,
  seatProblems,
  type DepartmentPlan,
  type DepartmentRun,
  type PlannedSeat,
  type SeatRun,
} from "./departmentPlan";
import {
  buildDepartmentAgents,
  createDepartmentSeats,
  makeDepartmentOrchestra,
  selectDepartmentRun,
  undoDepartmentRun,
} from "./departmentRunThunks";

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
  /** The box's own organization (every box type); null = the top of the chart or a box with none → the active one. */
  organizationId: string | null;
  organizationName: string | null;
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
  const runKey = departmentRunKey(request?.underBoxId ?? null);
  const working = useAppSelector((s) => (request ? (selectDepartmentRun(s, runKey)?.working ?? null) : null));
  return (
    // A step that is still writing keeps the dialog open: closing mid-batch used to lose Retry and Undo.
    <Dialog open={request !== null} onOpenChange={(open) => !open && !working && onClose()}>
      <DialogContent className="max-w-2xl">
        {request && <Body key={runKey} runKey={runKey} request={request} onClose={onClose} onFocus={onFocus} />}
      </DialogContent>
    </Dialog>
  );
}

let seatSeq = 0;
const newKey = () => `seat-new-${++seatSeq}`;

function Body({
  runKey,
  request,
  onClose,
  onFocus,
}: {
  runKey: string;
  request: PlanDepartmentRequest;
  onClose: () => void;
  onFocus?: (boxId: string) => void;
}) {
  const dispatch = useAppDispatch();
  const planner = useHeadlessAgentJson();
  const builder = useHeadlessAgentJson();
  const { create: createConductor, error: conductorError } = useCreateConductor();
  useDeclaredSurfaceMandates(DISCLOSURE);
  // A write, not a list read: the box's own organization, else (top of the chart, a box with none) the active one.
  const activeOrgId = useAppSelector(selectOrganizationId);
  const activeOrgName = useAppSelector(selectOrganizationName);
  const organizationId = request.organizationId ?? activeOrgId ?? null;
  const organizationName = request.organizationId ? request.organizationName : activeOrgName;
  const stored = useAppSelector((s) => selectDepartmentRun(s, runKey));
  /** The seat whose job is open for editing (view state only). */
  const [open, setOpenSeat] = useState<string | null>(null);

  // The batch is created once per box, in the box's organization, and kept until finished.
  useEffect(() => {
    if (stored || !organizationId) return;
    dispatch(
      orchestrasActions.departmentRunStarted({
        runKey,
        run: {
          step: "describe",
          organizationId,
          description: "",
          plan: null,
          runs: {},
          working: null,
          leaderName: "",
          leader: null,
          leaderFailed: false,
          undone: false,
          error: null,
        },
      }),
    );
  }, [stored, organizationId, runKey, dispatch]);

  const patch = (p: Partial<DepartmentRun>) => dispatch(orchestrasActions.departmentRunPatched({ runKey, patch: p }));
  const setPlan = (fn: (p: DepartmentPlan) => DepartmentPlan) => stored?.plan && patch({ plan: fn(stored.plan) });
  const patchSeat = (key: string, p: Partial<PlannedSeat>) =>
    setPlan((plan) => ({ ...plan, seats: plan.seats.map((s) => (s.key === key ? { ...s, ...p } : s)) }));

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
  if (!stored) return null;
  const { step, description, plan, runs, working, leaderName, leader, undone, error } = stored;

  // ── 1. plan it ───────────────────────────────────────────────────────────
  const planIt = async () => {
    patch({ error: null });
    try {
      const value = await planner.run<unknown>({
        mandateKey: PLANNER,
        surfaceKey: `mandate:${PLANNER}`,
        sourceFeature: "agent-builder",
        expect: "json",
        initiation: "user",
        surfaceName: null,
        organizationId,
        variables: {
          department_description: description.trim(),
          ...(request.underLabel ? { parent: request.underLabel } : {}),
          ...(organizationName ? { organization_context: organizationName } : {}),
          ...(request.existingTeam.length ? { existing_team: request.existingTeam.join("\n") } : {}),
        },
      });
      const planned = coerceDepartmentPlan(value, () => newKey());
      patch({
        plan: planned,
        step: "review",
        ...(leaderName ? {} : { leaderName: `${planned.department || "Department"} lead` }),
      });
    } catch (e) {
      patch({ error: e instanceof Error ? e.message : "No plan came back." });
    }
  };

  const seats = plan?.seats ?? [];
  const order = creationOrder(seats);
  const problems = seatProblems(seats);
  const nameOfSeat = (key: string) => seats.find((s) => s.key === key)?.name || "its manager";

  const createAll = () => void dispatch(createDepartmentSeats(runKey, request.underBoxId));
  const buildAll = () => void dispatch(buildDepartmentAgents(runKey, builder.run));
  const makeOrchestra = () =>
    void dispatch(
      makeDepartmentOrchestra(runKey, request.underBoxId, (args) =>
        createConductor({ ...args, accent: DEFAULT_ORCHESTRA_ACCENT }),
      ),
    );
  const retry = (seat: PlannedSeat) => {
    if (seatNextStep(runs[seat.key]) !== "done") void dispatch(createDepartmentSeats(runKey, request.underBoxId, "retry"));
    else void dispatch(buildDepartmentAgents(runKey, builder.run, seat.key));
  };
  const finish = () => {
    // A finished batch is forgotten so the next plan here starts fresh; an unfinished one stays for Retry.
    if (!working) dispatch(orchestrasActions.departmentRunCleared(runKey));
    onClose();
  };

  const inventory = batchInventory(order, runs, leader);
  const anyMade = inventory.positions.length > 0 || Boolean(inventory.leaderId);

  // ── render ──────────────────────────────────────────────────────────────
  const whereLine = `${request.underLabel ? `Under ${request.underLabel}` : "At the top of the chart"}${
    organizationName ? ` · ${organizationName}` : ""
  }`;

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
            onChange={(e) => patch({ description: e.target.value })}
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
              icon={<ListChecks />}
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
  const jobCount = order.filter((s) => runs[s.key]?.mandateId && runs[s.key]?.jobLinked).length;
  const stuckCount = order.filter((s) => runs[s.key]?.error || runs[s.key]?.waitingOn).length;

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
              onChange={(e) => setPlan((p) => ({ ...p, department: e.target.value }))}
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
                        onClick={() => setOpenSeat(expanded ? null : seat.key)}
                      />
                      <Button
                        variant="quiet"
                        icon={<X />}
                        aria-label={`Remove ${seat.name || `position ${i + 1}`}`}
                        onClick={() => setPlan((p) => ({ ...p, seats: removeSeat(p.seats, seat.key) }))}
                      />
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate type-body font-medium text-foreground">{seat.name}</span>
                      <SeatStatus run={run} waitingOnName={run.waitingOn ? nameOfSeat(run.waitingOn) : null} />
                      {(run.error || run.waitingOn) && !run.busy && working === null && !undone && (
                        <Button
                          variant="outline"
                          icon={<RotateCcw />}
                          disabled={Boolean(run.waitingOn && !runs[run.waitingOn]?.positionId)}
                          onClick={() => retry(seat)}
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
                {expanded && <SeatJobEditor seat={seat} onChange={(p) => patchSeat(seat.key, p)} />}
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
                setPlan((p) => ({
                  ...p,
                  seats: [...p.seats, { key, name: "", description: "", goal: "", inputs: [], output: "", reportsTo: null }],
                }));
                setOpenSeat(key);
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
              onChange={(e) => patch({ leaderName: e.target.value })}
              aria-label="Leader's name"
              disabled={Boolean(leader) || working !== null}
            />
            {leader && (
              <div className="flex items-center gap-2">
                <Badge tone={leader.warnings.length ? "warning" : "success"} icon={<Network />}>
                  {leader.warnings.length ? "Made, with problems" : "Orchestra made"}
                </Badge>
                {onFocus && (
                  <Button variant="quiet" onClick={() => onFocus(boxId("agent", leader.conductorId))}>
                    Show on chart
                  </Button>
                )}
              </div>
            )}
            {leader?.warnings.map((w, i) => (
              <p key={i} className="type-secondary text-destructive">
                {w}
              </p>
            ))}
            {stored.leaderFailed && working === null && (
              <p className="type-secondary text-destructive">
                {`The leader could not be created.${conductorError ? ` ${conductorError}` : ""}`}
                <ErrorAlchemyMenu error={conductorError ?? "The leader could not be created."} />
              </p>
            )}
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
        {working && <p className="type-secondary text-muted-foreground">Still working — this closes when it finishes.</p>}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {step === "review" ? (
          <>
            <Button variant="outline" onClick={() => patch({ step: "describe" })}>
              Back
            </Button>
            <Button variant="primary" disabled={!seats.length || problems.length > 0} onClick={createAll}>
              {`Create ${seats.length} ${seats.length === 1 ? "position" : "positions"}`}
            </Button>
          </>
        ) : (
          <>
            {anyMade && !undone && (
              <Button
                variant="danger"
                icon={<Trash2 />}
                disabled={working !== null}
                onClick={() => void dispatch(undoDepartmentRun(runKey))}
              >
                Undo
              </Button>
            )}
            {!undone && jobCount > 0 && builtCount < jobCount && (
              <Button variant="outline" icon={<AGENT_ICON />} disabled={working !== null} onClick={buildAll}>
                {working === "agents" ? "Building agents…" : "Build their agents"}
              </Button>
            )}
            {!undone && builtCount > 0 && !leader && (
              <Button
                variant="outline"
                icon={<Network />}
                disabled={working !== null || !leaderName.trim()}
                onClick={makeOrchestra}
              >
                {working === "orchestra" ? "Making the Orchestra…" : "Put them in an Orchestra"}
              </Button>
            )}
            <Button variant="primary" disabled={working !== null} onClick={stuckCount && !undone ? onClose : finish}>
              {working === "seats" ? "Creating…" : stuckCount && !undone ? "Close" : "Done"}
            </Button>
          </>
        )}
      </div>
    </>
  );
}

function SeatStatus({ run, waitingOnName }: { run: SeatRun; waitingOnName: string | null }) {
  if (run.busy) return <Badge tone="info">{run.busy}</Badge>;
  if (run.error) return <Badge tone="destructive">Stopped</Badge>;
  if (waitingOnName) return <Badge tone="warning">{`Waiting on ${waitingOnName}`}</Badge>;
  if (run.agentId) return <Badge tone="success">Agent at work</Badge>;
  if (run.mandateId && run.jobLinked) return <Badge tone="primary">Needs an agent</Badge>;
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
