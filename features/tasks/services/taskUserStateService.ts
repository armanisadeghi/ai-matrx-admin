/**
 * taskUserStateService — the ONE client for projects.task_user_state, the
 * per-user notification/triage state on tasks (seen / acknowledged / snoozed /
 * dismissed / pinned). Reads name the current user (`created_by`); every write
 * is an upsert keyed on (task_id, created_by), filed in the task's organization.
 *
 * Snooze semantics: a snoozed task disappears from every attention view
 * (Today, Overdue, Upcoming, Inbox) until `snoozed_until`, but stays in
 * "All tasks". Reminders (email/cron) also respect it.
 */
import { supabase } from "@/utils/supabase/client";
import { projectsDb } from "@/utils/supabase/projectsDb";
import { requireUserId } from "@/utils/auth/getUserId";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import type { Database } from "@/types/database.types";

/** One person's state on one task; the person is `created_by` (unique with `task_id`). */
export type TaskUserState =
  Database["projects"]["Tables"]["task_user_state"]["Row"];

type TaskUserStatePatch = Partial<
  Pick<
    TaskUserState,
    "seen_at" | "acknowledged_at" | "snoozed_until" | "dismissed_at" | "pinned_at"
  >
>;

/** All of the current user's task states — scoped to them explicitly, never by RLS alone. */
export async function listMyTaskUserStates(): Promise<TaskUserState[]> {
  const { data, error } = await projectsDb(supabase)
    .from("task_user_state")
    .select("*")
    .eq("created_by", requireUserId())
    .is("deleted_at", null);
  if (error) {
    console.error("listMyTaskUserStates failed:", error.message);
    return [];
  }
  return data ?? [];
}

/** The task's own organization: the state row is filed with the record it is about. */
async function taskOrganizationId(taskId: string): Promise<string> {
  const { data, error } = await projectsDb(supabase)
    .from("tasks")
    .select("organization_id")
    .eq("id", taskId)
    .single();
  if (error) throw new Error(`task ${taskId} organization read failed: ${error.message}`);
  return ensureOrgId(data.organization_id);
}

async function upsertState(
  taskId: string,
  patch: TaskUserStatePatch,
): Promise<TaskUserState | null> {
  const userId = requireUserId();
  try {
    const organizationId = await taskOrganizationId(taskId);
    const { data, error } = await projectsDb(supabase)
      .from("task_user_state")
      .upsert(
        {
          task_id: taskId,
          created_by: userId,
          organization_id: organizationId,
          ...patch,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "task_id,created_by" },
      )
      .select()
      .single();
    if (error) {
      console.error("task_user_state upsert failed:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error("task_user_state upsert failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function snoozeTask(taskId: string, until: Date) {
  return upsertState(taskId, { snoozed_until: until.toISOString() });
}

export function unsnoozeTask(taskId: string) {
  return upsertState(taskId, { snoozed_until: null });
}

/** Put a dismissed task back in the attention views (the bell's Snoozed view, "Turn back on"). */
export function undismissTask(taskId: string) {
  return upsertState(taskId, { dismissed_at: null });
}

export function acknowledgeTask(taskId: string) {
  return upsertState(taskId, { acknowledged_at: new Date().toISOString() });
}

export function markTaskSeen(taskId: string) {
  return upsertState(taskId, { seen_at: new Date().toISOString() });
}

export function pinTask(taskId: string, pinned: boolean) {
  return upsertState(taskId, {
    pinned_at: pinned ? new Date().toISOString() : null,
  });
}

/** Canonical snooze presets (mirrors best-in-class reminder UX). */
export function snoozePresets(): { key: string; label: string; until: Date }[] {
  const now = new Date();
  const laterToday = new Date(now);
  laterToday.setHours(now.getHours() + 4);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  nextWeek.setHours(9, 0, 0, 0);
  return [
    { key: "later", label: "Later today", until: laterToday },
    { key: "tomorrow", label: "Tomorrow", until: tomorrow },
    { key: "nextweek", label: "Next week", until: nextWeek },
  ];
}
