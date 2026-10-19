/** What does a step of a planned system: the Architect's own words, normalized. */
export type StepDoer = "agent" | "ai-call" | "decision" | "code" | "human" | "unknown";

export interface SystemPlanStep {
  n: number;
  title: string;
  /** The step's full text as the Architect wrote it (markdown), for display. */
  markdown: string;
  /** One or two whole sentences of plain prose, for the card. */
  summary: string;
  /** What the step does, in the Architect's words, as full plain prose (no markdown). */
  job: string;
  doer: StepDoer;
  /** Model class if the Architect named one (frontier / mid-size / small / decision). */
  modelClass: string | null;
  /** An existing agent the person chose for this step instead of building one. */
  usesAgentId: string | null;
  usesAgentName: string | null;
  /**
   * A person confirmed this agent fits the step (chose it, or built it for the step). Absent on
   * agents put there before fit was checked: those show their fit and ask to be confirmed.
   */
  agentConfirmed?: boolean;
  /** A code step: who will build it, in the person's words. */
  codeNote?: string | null;
  /** A person step: the person or role who does it. */
  assignee?: string | null;
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
  /** The Conductor of the Orchestra made from this plan (an existing Orchestra, not a second ensemble system). */
  orchestraConductorId?: string | null;
}

export const SYSTEM_PLAN_TAG = "system-plan";
export const SYSTEM_PLAN_KIND = "system_plan_v1";
