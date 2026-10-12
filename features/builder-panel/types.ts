/**
 * Builder panel — the shapes. The feed lives in the admin debug slice
 * (`lib/redux/preferences/adminDebugSlice.ts`, `builderFeeds`); pages publish into it
 * with `useBuilderFeed` (hooks/useBuilderFeed.ts). FEATURE: ./FEATURE.md.
 */

/** The sidebar groups, in display order. */
export const BUILDER_GROUPS = ["inputs", "findings", "workflow", "ai", "provision", "mandates", "other"] as const;
export type BuilderGroup = (typeof BUILDER_GROUPS)[number];

export const BUILDER_GROUP_LABELS: Record<BuilderGroup, string> = {
  inputs: "Inputs",
  findings: "Findings",
  workflow: "Workflow",
  ai: "AI calls",
  provision: "Provision",
  mandates: "Mandates",
  other: "Other",
};

/**
 * A record an entry points at — the tabs read these. `workflow_run` feeds the Workflow
 * tab, `ai_run` the AI calls tab, `provision_snapshot` the Provision tab and `mandate`
 * (a mandate key or a provision point key) the Mandates tab.
 */
export type BuilderRef =
  | { type: "workflow_run"; id: string; label?: string | null }
  | { type: "ai_run"; requestId?: string | null; userRequestId?: string | null; workflowRunId?: string | null; conversationId?: string | null }
  | { type: "provision_snapshot"; id: string }
  | { type: "mandate"; mandateKey?: string | null; provisionKey?: string | null };

/** What a page passes to `publish`. */
export interface BuilderPublishInput {
  /** Stable within the surface: the same key replaces in place (and keeps history). */
  key: string;
  label: string;
  group: BuilderGroup;
  data: unknown;
  /** A registered `__kind` this data is, when it does not carry its own marker. */
  kind?: string | null;
  /** Where the value came from (a step, a page, "typed"). */
  source?: string | null;
  /** 0–1 when the value is a guess. */
  certainty?: number | null;
  ref?: BuilderRef | null;
  /** Epoch ms; defaults to now. */
  at?: number;
}

export interface BuilderHistoryItem {
  at: number;
  data: unknown;
}

export interface BuilderEntry extends Omit<BuilderPublishInput, "at"> {
  at: number;
  firstAt: number;
  /** Earlier values of this key, newest first, at most BUILDER_HISTORY_MAX. */
  history: BuilderHistoryItem[];
}

export interface BuilderFeed {
  surfaceKey: string;
  /** The pathname the surface last published from — the sidebar matches the page by it. */
  route: string | null;
  updatedAt: number;
  entries: Record<string, BuilderEntry>;
  /** Keys in first-published order. */
  order: string[];
}

export const BUILDER_HISTORY_MAX = 5;
/** A surface keeps at most this many keys; the oldest fall off. */
export const BUILDER_ENTRY_MAX = 400;
