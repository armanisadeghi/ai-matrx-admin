/** What does a step of a planned system: the Architect's own words, normalised. */
export type StepDoer = "agent" | "ai-call" | "decision" | "code" | "human" | "unknown";

export interface SystemPlanStep {
  n: number;
  title: string;
  /** What the step does, in the Architect's words (trimmed). */
  job: string;
  doer: StepDoer;
  /** Model class if the Architect named one (frontier / mid-size / small / decision). */
  modelClass: string | null;
  /** An existing agent the person chose for this step instead of building one. */
  usesAgentId: string | null;
  usesAgentName: string | null;
}

export interface SystemPlan {
  /** The person's own description of the system. */
  description: string;
  title: string;
  recommendation: string | null;
  steps: SystemPlanStep[];
  /** The Architect's full markdown answer, kept verbatim. */
  answer: string;
  /** Which run produced it (null for a hand-saved plan). */
  conversationId: string | null;
}

export const SYSTEM_PLAN_TAG = "system-plan";
export const SYSTEM_PLAN_FOLDER = "System plans";
export const SYSTEM_PLAN_KIND = "system_plan_v1";
