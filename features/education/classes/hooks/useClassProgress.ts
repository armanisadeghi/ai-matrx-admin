// features/education/classes/hooks/useClassProgress.ts
//
// Class ANALYTICS reads (teacher tools). Two gated entry points, both re-checked
// server-side:
//   * useClassProgressOverview(classId) — OWNER only: the roster × assignment grid
//     + class-wide rollup (edu_class_progress_overview). The owner check is the
//     RPC's, never the client.
//   * useMyClassProgress(classId) — a MEMBER's OWN completion of the class's
//     assignments (edu_class_student_progress(class, self)). A member may always
//     read their own progress; enrolment is the consent that also lets the OWNER
//     read it — and only scoped to THIS class's assignments.
//
// The teacher NEVER reads a student's full study spine here — every row is scoped
// to the class's assignments (mirrors the guardian gated-read privacy model, but
// tighter: guardian sees the whole spine; a teacher sees only class assignments).

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  getClassProgressOverview,
  getClassStudentProgress,
} from "../service";
import type { AssignmentProgress, ClassProgressOverview } from "../types";

export interface UseClassProgressOverviewReturn {
  overview: ClassProgressOverview | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** OWNER-only class progress grid. `enabled=false` (non-owner) skips the read. */
export function useClassProgressOverview(
  classId: string | null,
  enabled = true,
): UseClassProgressOverviewReturn {
  const [overview, setOverview] = useState<ClassProgressOverview | null>(null);
  // The read this hook will run (null = none). Loading is DERIVED: true exactly
  // while that read has not finished — from the first render when it will run,
  // never when it will not.
  const readKey = classId && enabled ? classId : null;
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const loading = readKey !== null && (inFlight || doneKey !== readKey);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const key = readKey;
    if (!key) return;
    setInFlight(true);
    setError(null);
    try {
      setOverview(await getClassProgressOverview(key));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load class progress.");
      setOverview(null);
    } finally {
      setInFlight(false);
      setDoneKey(key);
    }
  }, [readKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { overview, loading, error, reload };
}

export interface UseMyClassProgressReturn {
  progress: AssignmentProgress[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** A member's OWN per-assignment completion for the class. */
export function useMyClassProgress(
  classId: string | null,
  enabled = true,
): UseMyClassProgressReturn {
  const userId = useAppSelector(selectUserId);
  const [progress, setProgress] = useState<AssignmentProgress[]>([]);
  // The read this hook will run (null = none: no class, not enabled, or no
  // signed-in user yet). Loading is DERIVED: true exactly while that read has
  // not finished, so a user id that never arrives never leaves it stuck true.
  const readKey = classId && userId && enabled ? `${classId}:${userId}` : null;
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const loading = readKey !== null && (inFlight || doneKey !== readKey);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const key = readKey;
    if (!key || !classId || !userId) return;
    setInFlight(true);
    setError(null);
    try {
      setProgress(await getClassStudentProgress(classId, userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your progress.");
      setProgress([]);
    } finally {
      setInFlight(false);
      setDoneKey(key);
    }
  }, [readKey, classId, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { progress, loading, error, reload };
}
