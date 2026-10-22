// features/agents/org-chart/department/departmentRunThunks.ts
//
// The "Plan a department" batch as thunks over `orchestras.departmentRuns`, so
// the batch keeps writing — and keeps its record of what it made — whether or
// not the dialog is open. The dialog only renders a run and starts these.
//
// Every step resumes from what the seat's run already records (positionId →
// placed → job → linked → agent), so Retry never makes a second of anything.
// Bookkeeping rules are pure in ./departmentPlan.ts (Jest-pinned).

"use client";

import type { UseHeadlessAgentJson } from "@ai-matrx/chat/agents/hooks/useHeadlessAgentJson";
import type { AppDispatch, AppThunk } from "@/lib/redux/store";
import { orchestrasActions } from "@/features/agents/redux/orchestras/slice";
import {
  createOrgPosition,
  removeManualManager,
  removeOrgPosition,
  restoreOrgPosition,
  setManualManager,
} from "@/features/agents/redux/orchestras/orgChartThunks";
import { addAgentToOrchestra } from "@/features/agents/redux/orchestras/thunks";
import { syncConductorPrompt } from "@/features/agents/orchestras/conductor/thunks";
import { saveAgentField } from "@/features/agents/redux/builder-write.thunks";
import { updateMandateDefinition } from "@/features/mandates/admin/service";
import { toast } from "@/lib/toast";
import { boxId } from "../constants";
import type { OrgPosition } from "../positionsService";
import { createSeatJob, linkSeatJob, SeatJobNotLinkedError } from "../seatJob";
import { buildSeatAgent, SeatAgentNotBoundError } from "../seatAgent";
import {
  batchInventory,
  creationOrder,
  inventoryWords,
  placementFor,
  seatNextStep,
  type BatchInventory,
  type DepartmentRun,
  type PlannedSeat,
  type SeatRun,
} from "./departmentPlan";

export const selectDepartmentRun = (state: { orchestras: { departmentRuns: Record<string, DepartmentRun> } }, runKey: string) =>
  state.orchestras.departmentRuns[runKey];

const reason = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

function helpers(runKey: string, dispatch: AppDispatch, getState: () => { orchestras: { departmentRuns: Record<string, DepartmentRun> } }) {
  return {
    get: () => getState().orchestras.departmentRuns[runKey],
    patch: (patch: Partial<DepartmentRun>) => dispatch(orchestrasActions.departmentRunPatched({ runKey, patch })),
    seat: (seatKey: string, patch: Partial<SeatRun>) =>
      dispatch(orchestrasActions.departmentSeatPatched({ runKey, seatKey, patch })),
  };
}

/** One seat, resumed from whatever step it reached. A seat whose manager seat does not exist yet waits. */
function createOneSeat(runKey: string, seat: PlannedSeat, underBoxId: string | null): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const h = helpers(runKey, dispatch, getState);
    const organizationId = h.get()?.organizationId;
    if (!organizationId) return;
    const runOf = () => h.get()?.runs[seat.key] ?? {};
    if (!runOf().placed) {
      const where = placementFor(seat, h.get()?.runs ?? {});
      if (where.kind === "waiting") {
        h.seat(seat.key, { busy: null, error: null, waitingOn: where.managerKey });
        return;
      }
    }
    h.seat(seat.key, { busy: "Creating…", error: null, waitingOn: null });
    try {
      let positionId = runOf().positionId;
      if (!positionId) {
        const made = await dispatch(
          createOrgPosition({ organizationId, name: seat.name, description: seat.description || null }),
        );
        if ("error" in made) throw new Error(made.error);
        positionId = made.id;
        h.seat(seat.key, { positionId });
      }
      if (!runOf().placed) {
        const where = placementFor(seat, h.get()?.runs ?? {});
        const managerBox = where.kind === "under-seat" ? boxId("position", where.positionId) : underBoxId;
        if (managerBox) {
          const placed = await dispatch(setManualManager(managerBox, boxId("position", positionId)));
          if (!placed.ok) throw new Error(`Created, but not placed on the chart: ${placed.error}`);
        }
        h.seat(seat.key, { placed: true });
      }
      const step = seatNextStep(runOf());
      const position = { id: positionId, name: seat.name, description: seat.description || null, organizationId };
      if (step === "job") {
        try {
          const job = await createSeatJob(dispatch, position, { goal: seat.goal, output: seat.output, inputs: seat.inputs });
          h.seat(seat.key, { mandateId: job.mandateId, mandateKey: job.mandateKey, jobLinked: true });
        } catch (e) {
          if (e instanceof SeatJobNotLinkedError)
            h.seat(seat.key, { mandateId: e.job.mandateId, mandateKey: e.job.mandateKey, jobLinked: false });
          throw e;
        }
      } else if (step === "link-job") {
        const r = runOf();
        await linkSeatJob(dispatch, positionId, { mandateId: r.mandateId as string, mandateKey: r.mandateKey as NonNullable<SeatRun["mandateKey"]> });
        h.seat(seat.key, { jobLinked: true });
      }
      h.seat(seat.key, { busy: null });
    } catch (e) {
      h.seat(seat.key, { busy: null, error: reason(e, "It could not be created.") });
    }
  };
}

/**
 * Create (or resume) every unfinished seat, managers first. The same thunk is
 * Retry: a seat that waited on a manager that now exists is placed this time.
 */
export function createDepartmentSeats(
  runKey: string,
  underBoxId: string | null,
  mode: "seats" | "retry" = "seats",
): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const h = helpers(runKey, dispatch, getState);
    const start = h.get();
    if (!start?.plan || start.working) return;
    h.patch({ working: mode, step: "made", error: null });
    const order = creationOrder(start.plan.seats);
    for (const seat of order) {
      if (seatNextStep(h.get()?.runs[seat.key]) === "done") continue;
      await dispatch(createOneSeat(runKey, seat, underBoxId));
    }
    h.patch({ working: null });
  };
}

/** Build each seat's agent and make it the job's Holder; `onlySeatKey` = one seat's Retry. */
export function buildDepartmentAgents(
  runKey: string,
  run: UseHeadlessAgentJson["run"],
  onlySeatKey?: string,
): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const h = helpers(runKey, dispatch, getState);
    const start = h.get();
    if (!start?.plan || start.working) return;
    h.patch({ working: onlySeatKey ? "retry" : "agents" });
    for (const seat of creationOrder(start.plan.seats)) {
      if (onlySeatKey && seat.key !== onlySeatKey) continue;
      const r = h.get()?.runs[seat.key];
      if (!r?.mandateId || !r.mandateKey || !r.jobLinked || r.agentId) continue;
      h.seat(seat.key, { busy: "Building its agent…", error: null });
      try {
        const agentId = await buildSeatAgent(
          dispatch,
          run,
          {
            mandateKey: r.mandateKey,
            mandateId: r.mandateId,
            organizationId: start.organizationId,
            seatName: seat.name,
            description: seat.description,
            goal: seat.goal,
            output: seat.output,
            inputs: seat.inputs,
          },
          r.unboundAgentId,
        );
        h.seat(seat.key, { busy: null, agentId, unboundAgentId: undefined });
      } catch (e) {
        h.seat(seat.key, {
          busy: null,
          error: reason(e, "The agent could not be built."),
          ...(e instanceof SeatAgentNotBoundError ? { unboundAgentId: e.agentId } : {}),
        });
      }
    }
    h.patch({ working: null });
  };
}

/** The leader, in the batch's organization, under the chosen box, directing the built agents. */
export function makeDepartmentOrchestra(
  runKey: string,
  underBoxId: string | null,
  createConductor: (args: { name: string; organizationId: string }) => Promise<string | null>,
): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const h = helpers(runKey, dispatch, getState);
    const start = h.get();
    if (!start?.plan || start.working || start.leader) return;
    const order = creationOrder(start.plan.seats);
    const memberIds = order.map((s) => start.runs[s.key]?.agentId).filter((x): x is string => Boolean(x));
    if (!memberIds.length) return;
    h.patch({ working: "orchestra", error: null, leaderFailed: false });
    const conductorId = await createConductor({
      name: start.leaderName.trim() || `${start.plan.department || "Department"} lead`,
      organizationId: start.organizationId,
    });
    if (!conductorId) {
      h.patch({ working: null, leaderFailed: true });
      return;
    }
    const warnings: string[] = [];
    // Recorded the moment it exists, so Undo takes it back even if what follows fails.
    h.patch({ leader: { conductorId, placedUnder: null, warnings } });
    for (const agentId of memberIds) {
      const res = await dispatch(addAgentToOrchestra({ conductorId, agentId }));
      if (!res.ok) warnings.push(res.error ?? "An agent could not be added.");
    }
    let placedUnder: string | null = null;
    if (underBoxId) {
      const placed = await dispatch(setManualManager(underBoxId, boxId("agent", conductorId)));
      if (placed.ok) placedUnder = underBoxId;
      else warnings.push(placed.error ?? "The leader could not be placed on the chart.");
    }
    const sync = await dispatch(syncConductorPrompt({ initiation: "user", conductorId, memberIds }));
    if (!sync.ok) warnings.push(`Its prompt still needs its team: ${sync.error ?? "sync failed"}.`);
    h.patch({ leader: { conductorId, placedUnder, warnings: [...warnings] }, working: null });
  };
}

const asPosition = (p: BatchInventory["positions"][number], organizationId: string): OrgPosition => ({
  id: p.positionId,
  organizationId,
  name: p.name,
  description: p.description,
  filledByUserId: null,
  hrJobTitleId: null,
  mandateId: p.mandateId,
});

const setArchived = (dispatch: AppDispatch, agentId: string, archived: boolean) =>
  dispatch(saveAgentField({ agentId, field: "isArchived", value: archived as never })).unwrap();

/**
 * Take back everything the batch made: the leader's place and the leader, every
 * built agent, every job (turned off — kept, so Restore turns it back on) and
 * every position (to Trash; its links stay so Restore puts it back in place).
 */
export function undoDepartmentRun(runKey: string): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const h = helpers(runKey, dispatch, getState);
    const start = h.get();
    if (!start?.plan || start.working) return;
    const inv = batchInventory(creationOrder(start.plan.seats), start.runs, start.leader);
    h.patch({ working: "undo", error: null });
    const failed: string[] = [];
    const attempt = async (what: string, write: () => Promise<unknown>) => {
      try {
        const res = await write();
        if (res && typeof res === "object" && "ok" in res && res.ok === false)
          failed.push(`${what}: ${"error" in res ? String(res.error) : "refused"}`);
      } catch (e) {
        failed.push(`${what}: ${reason(e, "refused")}`);
      }
    };
    if (inv.leaderId && inv.leaderPlacedUnder)
      await attempt("The leader's place", () => dispatch(removeManualManager(inv.leaderPlacedUnder as string, boxId("agent", inv.leaderId as string))));
    if (inv.leaderId) await attempt("The leader", () => setArchived(dispatch, inv.leaderId as string, true));
    for (const a of inv.agents) await attempt("An agent", () => setArchived(dispatch, a, true));
    for (const m of inv.jobs) await attempt("A job", () => updateMandateDefinition(m, { is_enabled: false }));
    for (const p of inv.positions)
      await attempt(p.name, () => dispatch(removeOrgPosition(asPosition(p, start.organizationId))));
    if (failed.length) {
      h.patch({ working: null, error: `Some of it could not be taken back. ${failed.join(" ")}` });
      return;
    }
    h.patch({ working: null, undone: true });
    toast.success(`Undone: ${inventoryWords(inv)}.`, {
      action: { label: "Restore", onClick: () => void dispatch(restoreDepartmentRun(runKey, inv)) },
    });
  };
}

/** Put back what Undo took, in reverse. */
export function restoreDepartmentRun(runKey: string, inv: BatchInventory): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const h = helpers(runKey, dispatch, getState);
    const organizationId = h.get()?.organizationId;
    if (!organizationId) return;
    const failed: string[] = [];
    for (const p of inv.positions) {
      const res = await dispatch(restoreOrgPosition(asPosition(p, organizationId)));
      if (!res.ok) failed.push(`${p.name}: ${res.error}`);
    }
    for (const m of inv.jobs) await updateMandateDefinition(m, { is_enabled: true }).catch((e) => failed.push(reason(e, "A job stayed off.")));
    for (const a of inv.agents) await setArchived(dispatch, a, false).catch((e) => failed.push(reason(e, "An agent stayed archived.")));
    if (inv.leaderId) {
      await setArchived(dispatch, inv.leaderId, false).catch((e) => failed.push(reason(e, "The leader stayed archived.")));
      if (inv.leaderPlacedUnder) {
        const res = await dispatch(setManualManager(inv.leaderPlacedUnder, boxId("agent", inv.leaderId)));
        if (!res.ok) failed.push(res.error ?? "The leader was not placed back.");
      }
    }
    h.patch({ undone: false });
    if (failed.length) toast.error(`Restored, with problems: ${failed.join(" ")}`);
  };
}
