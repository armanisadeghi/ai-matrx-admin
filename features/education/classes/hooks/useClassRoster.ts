// features/education/classes/hooks/useClassRoster.ts
//
// The owner's roster panel data + controls (approve request, remove member, comp
// paid access). Reads edu_class_roster (owner: all incl pending/entitled; member:
// active only). Every mutation is a role-gated edu_class_* RPC — the client is not
// the boundary.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  getClassRoster,
  approveMember,
  removeMember,
  grantAccess,
} from "../service";
import type { ClassRosterMember } from "../types";

export interface UseClassRosterReturn {
  members: ClassRosterMember[];
  loading: boolean;
  error: string | null;
  acting: boolean;
  refresh: () => Promise<void>;
  approve: (userId: string) => Promise<void>;
  remove: (userId: string) => Promise<void>;
  grant: (userId: string) => Promise<void>;
}

export function useClassRoster(
  classId: string | null,
  enabled = true,
): UseClassRosterReturn {
  const [members, setMembers] = useState<ClassRosterMember[]>([]);
  // The read this hook will run (null = none). Loading is DERIVED: true exactly
  // while that read has not finished, so it is true from the first render when
  // the read will run, and never true when it will not (a missing input).
  const readKey = classId && enabled ? classId : null;
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const loading = readKey !== null && (inFlight || doneKey !== readKey);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const key = readKey;
    if (!key) return;
    setInFlight(true);
    setError(null);
    try {
      setMembers(await getClassRoster(key));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the roster.");
      setMembers([]);
    } finally {
      setInFlight(false);
      setDoneKey(key);
    }
  }, [readKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = useCallback(
    async (
      fn: (id: string, userId: string) => Promise<unknown>,
      userId: string,
      okMsg: string,
    ) => {
      if (!classId) return;
      setActing(true);
      try {
        await fn(classId, userId);
        await refresh();
        toast.success(okMsg);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setActing(false);
      }
    },
    [classId, refresh],
  );

  return {
    members,
    loading,
    error,
    acting,
    refresh,
    approve: useCallback(
      (userId) => act(approveMember, userId, "Request approved."),
      [act],
    ),
    remove: useCallback(
      (userId) => act(removeMember, userId, "Member removed."),
      [act],
    ),
    grant: useCallback(
      (userId) => act(grantAccess, userId, "Access granted."),
      [act],
    ),
  };
}
