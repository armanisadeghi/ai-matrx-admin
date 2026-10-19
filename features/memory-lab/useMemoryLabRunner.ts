"use client";

/**
 * Memory Lab — one agent pass, end to end:
 *   1. capture the role's provision point(s) with full values (memory.conversation_review +
 *      memory.store for a review; memory.store for reflection and the steward);
 *   2. map the agent's declared variables to provision values through the trial's bindings;
 *   3. run the agent through the execution system (a `requestId` the live run window and Watch AI
 *      bind to), streaming into the floating run window via the trial's run set;
 *   4. POST the finished run to the apply door, which validates its `memory_edits`, applies them to
 *      the sandbox store and writes the step row.
 * A run is recorded on `trial.metadata.pending_runs` before it starts and removed once applied, so
 * a reload in the middle offers to finish it (the run itself keeps going on the server).
 */
import { useEffect, useRef, useState } from "react";

import { launchAgentExecution } from "@ai-matrx/chat/agents/redux/execution-system/thunks/launch-agent-execution.thunk";
import { addRunToSet, clearRunSet } from "@ai-matrx/chat/agents/redux/execution-system/run-sets/run-sets.thunks";
import { useAppDispatch } from "@/lib/redux/hooks";
import { valueText, type ProvisionSnapshot } from "@/features/provision-window/data";
import { extractErrorMessage } from "@/utils/errors";
import { applyRun, captureLabProvision, savePendingRuns } from "./data";
import {
  REVIEW_POINT,
  ROLE_LABEL,
  ROLE_POINTS,
  STORE_POINT,
  splitSource,
  type MemoryRole,
  type MemoryTrial,
  type MemoryTrialStep,
  type PendingRun,
} from "./types";

export const memoryLabRunSetKey = (trialId: string) => `memory-lab:${trialId}`;

export interface RunnerPhase {
  role: MemoryRole;
  subjectConversationId: string | null;
  stage: "capturing" | "running" | "applying";
  /** For "Review next N": which of how many. */
  batch: { at: number; of: number } | null;
}

/** The variable values for one role from the captured snapshots, through the trial's bindings. */
export function bindVariables(
  role: MemoryRole,
  variables: string[],
  trial: MemoryTrial,
  snapshots: Map<string, ProvisionSnapshot>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const map = trial.bindings[role] ?? {};
  for (const variable of variables) {
    const source = map[variable] ? splitSource(map[variable]) : null;
    const points = source ? [source.point] : ROLE_POINTS[role];
    const valueName = source ? source.value : variable;
    for (const point of points) {
      const found = snapshots.get(point)?.values.find((v) => v.name === valueName && v.present);
      if (found) {
        out[variable] = valueText(found.value);
        break;
      }
    }
  }
  return out;
}

export function useMemoryLabRunner(args: {
  trial: MemoryTrial | null;
  agentVariables: (agentId: string) => Promise<string[]>;
  onTrialChanged: (trial: MemoryTrial) => void;
  onStep: (step: MemoryTrialStep) => void;
  onSnapshots: (key: string, snapshots: ProvisionSnapshot[]) => void;
}) {
  const dispatch = useAppDispatch();
  const [phase, setPhase] = useState<RunnerPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);
  const trialRef = useRef<MemoryTrial | null>(args.trial);
  useEffect(() => {
    trialRef.current = args.trial;
  }, [args.trial]);

  /** Every trial this hook writes is the new current one at once (the parent re-renders later). */
  const adopt = (trial: MemoryTrial) => {
    trialRef.current = trial;
    args.onTrialChanged(trial);
  };

  const current = () => {
    const t = trialRef.current;
    if (!t) throw new Error("Open a trial first.");
    return t;
  };

  /** Capture the role's points for one subject; returns them by point key. */
  async function capture(role: MemoryRole, subjectConversationId: string | null) {
    const trial = current();
    const snapshots = new Map<string, ProvisionSnapshot>();
    for (const point of ROLE_POINTS[role]) {
      const subject = point === REVIEW_POINT ? subjectConversationId : trial.id;
      if (!subject) continue;
      snapshots.set(point, await captureLabProvision(dispatch, point, subject, trial.organizationId));
    }
    args.onSnapshots(snapshotKey(role, subjectConversationId), [...snapshots.values()]);
    return snapshots;
  }

  async function finish(pending: PendingRun): Promise<MemoryTrialStep> {
    setPhase((p) => (p ? { ...p, stage: "applying" } : p));
    const step = await applyRun(dispatch, current(), {
      role: pending.role,
      runConversationId: pending.runConversationId,
      agentId: pending.agentId,
      subjectConversationId: pending.subjectConversationId,
      requestText: pending.requestText,
      provisionSnapshotIds: pending.provisionSnapshotIds,
    });
    const after = await savePendingRuns(current(), (list) =>
      list.filter((r) => r.runConversationId !== pending.runConversationId),
    );
    adopt(after);
    args.onStep(step);
    return step;
  }

  /** One pass of one role. With no agent chosen it captures the provision only. */
  async function runOne(
    role: MemoryRole,
    subjectConversationId: string | null,
    requestText: string | null,
    batch: RunnerPhase["batch"] = null,
  ): Promise<MemoryTrialStep | null> {
    const trial = current();
    setPhase({ role, subjectConversationId, stage: "capturing", batch });
    const snapshots = await capture(role, subjectConversationId);
    const agentId = trial.agents[role];
    if (!agentId) return null;

    const variables = bindVariables(role, await args.agentVariables(agentId), trial, snapshots);
    const pending: PendingRun = {
      role,
      runConversationId: crypto.randomUUID(),
      agentId,
      subjectConversationId,
      requestText,
      provisionSnapshotIds: [...snapshots.values()].map((s) => s.id),
      startedAt: new Date().toISOString(),
    };
    adopt(await savePendingRuns(trial, (list) => [...list, pending]));

    setPhase({ role, subjectConversationId, stage: "running", batch });
    const label =
      role === "review" && subjectConversationId
        ? `${ROLE_LABEL[role]} · ${subjectConversationId.slice(0, 8)}`
        : ROLE_LABEL[role];
    await dispatch(
      launchAgentExecution({
        initiation: "user",
        agentId,
        conversationId: pending.runConversationId,
        surfaceKey: `memory-lab:${trial.id}:${role}`,
        sourceFeature: "admin",
        isEphemeral: false,
        // Provision values ride as named variables; user_input is only what the admin typed.
        runtime: {
          variables,
          ...(requestText ? { userInput: requestText } : {}),
        },
        config: { displayMode: "background", autoRun: true },
        onRequestId: (requestId) => {
          dispatch(addRunToSet({ setKey: memoryLabRunSetKey(trial.id), requestId, label }));
        },
      }),
    ).unwrap();
    return finish(pending);
  }

  // Promise chaining, not try…finally: the React Compiler skips a component that uses `finally`.
  function guarded<T>(work: () => Promise<T>): Promise<T | null> {
    setError(null);
    stopRef.current = false;
    return work()
      .then(
        (value): T | null => value,
        (e: unknown): T | null => {
          setError(extractErrorMessage(e));
          return null;
        },
      )
      .then((value) => {
        setPhase(null);
        return value;
      });
  }

  return {
    phase,
    error,
    busy: phase !== null,
    clearError: () => setError(null),
    /** Capture a provision without running any agent. */
    captureOnly: (role: MemoryRole, subjectConversationId: string | null) =>
      guarded(async () => {
        setPhase({ role, subjectConversationId, stage: "capturing", batch: null });
        return capture(role, subjectConversationId);
      }),
    review: (conversationId: string) =>
      guarded(() => {
        dispatch(clearRunSet(memoryLabRunSetKey(current().id)));
        return runOne("review", conversationId, null);
      }),
    /** Sequential, one run at a time; `stop()` ends it after the current conversation. */
    reviewMany: (conversationIds: string[]) =>
      guarded(async () => {
        dispatch(clearRunSet(memoryLabRunSetKey(current().id)));
        let done = 0;
        for (const id of conversationIds) {
          if (stopRef.current) break;
          const step = await runOne("review", id, null, { at: done + 1, of: conversationIds.length });
          done += 1;
          if (!step) break;
        }
        return done;
      }),
    reflect: () =>
      guarded(() => {
        dispatch(clearRunSet(memoryLabRunSetKey(current().id)));
        return runOne("reflect", null, null);
      }),
    steward: (requestText: string) =>
      guarded(() => {
        dispatch(clearRunSet(memoryLabRunSetKey(current().id)));
        return runOne("steward", null, requestText);
      }),
    /** Apply a run a reload interrupted (the server reads its output from the run conversation). */
    finishPending: (pending: PendingRun) =>
      guarded(() => {
        setPhase({
          role: pending.role,
          subjectConversationId: pending.subjectConversationId,
          stage: "applying",
          batch: null,
        });
        return finish(pending);
      }),
    discardPending: (pending: PendingRun) =>
      guarded(async () => {
        const t = current();
        adopt(
          await savePendingRuns(t, (list) =>
            list.filter((r) => r.runConversationId !== pending.runConversationId),
          ),
        );
        return null;
      }),
    stop: () => {
      stopRef.current = true;
    },
  };
}

export const snapshotKey = (role: MemoryRole, subjectConversationId: string | null) =>
  role === "review" && subjectConversationId ? `review:${subjectConversationId}` : `${role}:${STORE_POINT}`;
