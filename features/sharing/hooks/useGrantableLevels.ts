"use client";

/**
 * features/sharing/hooks/useGrantableLevels.ts
 *
 * WHICH LEVELS THIS PERSON MAY GIVE ON THIS THING - asked of the database, never assumed.
 *
 * ONE-LADDER (Arman 2026-10-10): every share door asks `iam.may_grant_as`. This hook asks the
 * thin door over it (`iam.my_grantable_levels`) so the share dialog can offer exactly what the
 * doors will accept: a level maps to `null` (you may) or the sentence that says why not, and
 * `outside` is the same answer for somebody outside the organization. The screen holds no rule of
 * its own - it cannot disagree with the doors.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { PermissionLevel } from "@/utils/permissions/types";

export type GrantableLevels = {
  loading: boolean;
  /** Could not be asked (a failure is not a refusal). */
  error: string | null;
  /** level -> null when allowed, else the reason. Absent while loading or on error. */
  levels: Partial<Record<PermissionLevel, string | null>>;
  /** May share outside the organization: null when allowed, else the reason. */
  outside: string | null;
  /** True when at least one level may be given - i.e. the person may share at all. */
  maySharePeople: boolean;
};

const NOTHING: GrantableLevels = { loading: true, error: null, levels: {}, outside: null, maySharePeople: false };

type Answer = { levels?: Record<string, string | null>; outside?: string | null };

export function useGrantableLevels(resourceType: string, resourceId: string, enabled: boolean, refreshKey?: string): GrantableLevels {
  const [state, setState] = useState<GrantableLevels>(NOTHING);
  useEffect(() => {
    if (!enabled || !resourceType || !resourceId) return;
    let cancelled = false;
    const supabase = createClient();
    // The door is newer than the generated database types.
    const iam = supabase.schema("iam") as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    void iam
      .rpc("my_grantable_levels", { p_resource_type: resourceType, p_resource_id: resourceId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState({ ...NOTHING, loading: false, error: error.message });
          return;
        }
        const a = (data ?? {}) as Answer;
        const levels = (a.levels ?? {}) as Partial<Record<PermissionLevel, string | null>>;
        setState({
          loading: false,
          error: null,
          levels,
          outside: a.outside ?? null,
          maySharePeople: Object.values(levels).some((why) => why === null),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, resourceType, resourceId, refreshKey]);
  return state;
}
