import { supabase } from "@/utils/supabase/client";
import { requireUserId } from "@/utils/auth/getUserId";
import { defaultListFilter } from "@/lib/list-scope";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { create, getById, update } from "@/features/notes/service/notesApi";
import { parsePlannerAnswer } from "./parse-plan";
import type { Json } from "@/types/database.types";
import {
  SYSTEM_PLAN_KIND,
  SYSTEM_PLAN_TAG,
  type SystemPlan,
} from "./types";

/**
 * A planned system is a Note — the platform's existing record for a person's saved text —
 * tagged `system-plan`, readable as markdown in Notes, with the structured plan in
 * `custom_fields`. No new table: the System Builder is a working label and its home moves soon.
 */

export interface SavedPlanSummary {
  id: string;
  title: string;
  updatedAt: string;
  stepCount: number;
}

function toMarkdown(plan: SystemPlan): string {
  const steps = plan.steps
    .map((s) => `${s.n}. **${s.title}** — ${s.summary ?? s.job}${s.usesAgentName ? ` _(uses ${s.usesAgentName})_` : ""}`)
    .join("\n");
  return [`# ${plan.title}`, "", `> ${plan.description}`, "", steps ? `${steps}\n` : "", "---", "", plan.answer].join("\n");
}

// `metadata` belongs to the platform (the write gate refuses a user key there); a person's
// structured content goes in `custom_fields`.
function fieldsOf(plan: SystemPlan): Json {
  return { [SYSTEM_PLAN_KIND]: plan } as unknown as Json;
}

function planFromFields(fields: unknown): SystemPlan | null {
  if (!fields || typeof fields !== "object") return null;
  const plan = (fields as Record<string, SystemPlan | undefined>)[SYSTEM_PLAN_KIND];
  return plan && Array.isArray(plan.steps) ? plan : null;
}

export async function saveNewPlan(plan: SystemPlan): Promise<string> {
  const note = await create({
    label: plan.title,
    content: toMarkdown(plan),
    tags: [SYSTEM_PLAN_TAG],
    custom_fields: fieldsOf(plan),
    organization_id: await ensureOrgId(null),
  });
  return note.id;
}

export async function savePlanChanges(id: string, plan: SystemPlan): Promise<void> {
  await update(id, { label: plan.title, content: toMarkdown(plan), custom_fields: fieldsOf(plan) });
}

/** The answer is the record; steps are re-read from it so a better reader improves old plans. */
function withFreshSteps(stored: SystemPlan): SystemPlan {
  const fresh = parsePlannerAnswer(stored.answer, stored.description, stored.conversationId);
  if (fresh.steps.length === 0) return stored;
  const chosen = new Map(stored.steps.filter((s) => s.usesAgentId).map((s) => [s.title, s]));
  return {
    ...stored,
    recommendation: fresh.recommendation ?? stored.recommendation,
    steps: fresh.steps.map((s) => {
      const c = chosen.get(s.title);
      return c ? { ...s, usesAgentId: c.usesAgentId, usesAgentName: c.usesAgentName } : s;
    }),
  };
}

export async function loadPlan(id: string): Promise<SystemPlan | null> {
  const note = await getById(id);
  const stored = note ? planFromFields(note.custom_fields) : null;
  return stored ? withFreshSteps(stored) : null;
}

/** The person's own saved plans, newest first (a list declares its own scope: mine). */
export async function listMyPlans(): Promise<SavedPlanSummary[]> {
  const listScope = await defaultListFilter("note", { userId: requireUserId(), requested: "mine" });
  let query = supabase
    .schema("workbench")
    .from("notes")
    .select("id, label, updated_at, custom_fields")
    .contains("tags", [SYSTEM_PLAN_TAG])
    .is("deleted_at", null);
  query = listScope.apply(query);
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.label,
    updatedAt: row.updated_at,
    stepCount: (() => {
      const stored = planFromFields(row.custom_fields);
      return stored ? withFreshSteps(stored).steps.length : 0;
    })(),
  }));
}
