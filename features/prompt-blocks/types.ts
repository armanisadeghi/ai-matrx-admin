import type { Database } from "@/types/database.types";

type AgentTables = Database["agent"]["Tables"];
export type PromptBlockRow = AgentTables["prompt_block"]["Row"];
export type PromptBlockVariantRow = AgentTables["prompt_block_variant"]["Row"];

/** One entry of the server preview's `prompt_blocks` report (Model view and chip panel). */
export interface PromptBlockReportEntry {
  name: string;
  level: string;
  block_id?: string | null;
  variant_id?: string | null;
  source_kind?: string | null;
  bound_tool?: string | null;
  chars?: number | null;
}
