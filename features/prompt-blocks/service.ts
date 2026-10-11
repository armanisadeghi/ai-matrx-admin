/**
 * Prompt blocks data door — direct to Supabase (RLS is the authorization layer), like every other
 * frontend table. The server only resolves (see `resolveBlocks.ts`).
 */
import { supabase } from "@/utils/supabase/client";
import type { PromptBlockRow, PromptBlockVariantRow } from "./types";

const agent = () => supabase.schema("agent");

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "no row came back"}`);
}

export async function listBlocks(): Promise<PromptBlockRow[]> {
  const { data, error } = await agent().from("prompt_block").select("*").is("deleted_at", null).order("name").limit(1000);
  if (error) fail("Could not load prompt blocks", error);
  return data ?? [];
}

export async function listBlocksNamed(name: string): Promise<PromptBlockRow[]> {
  const { data, error } = await agent().from("prompt_block").select("*").is("deleted_at", null).eq("name", name);
  if (error) fail("Could not load the block", error);
  return data ?? [];
}

export async function getBlock(id: string): Promise<PromptBlockRow | null> {
  const { data, error } = await agent().from("prompt_block").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) fail("Could not load the block", error);
  return data;
}

export interface NewBlock {
  name: string;
  label: string;
  content: string;
  description?: string | null;
  source_kind?: "authored" | "skill";
  source_ref?: string | null;
  bound_tool?: string | null;
  organization_id: string;
  visibility: PromptBlockRow["visibility"];
}

export async function createBlock(input: NewBlock): Promise<PromptBlockRow> {
  const { data, error } = await agent()
    .from("prompt_block")
    .insert({
      name: input.name,
      label: input.label,
      content: input.content,
      description: input.description ?? null,
      source_kind: input.source_kind ?? "authored",
      source_ref: input.source_ref ?? null,
      bound_tool: input.bound_tool ?? null,
      organization_id: input.organization_id,
      visibility: input.visibility,
    })
    .select("*")
    .single();
  if (error || !data) fail("Could not create the block", error);
  return data;
}

export type BlockPatch = Partial<
  Pick<PromptBlockRow, "label" | "description" | "content" | "source_kind" | "source_ref" | "bound_tool" | "visibility">
>;

export async function updateBlock(id: string, patch: BlockPatch): Promise<PromptBlockRow> {
  const { data, error } = await agent().from("prompt_block").update(patch).eq("id", id).select("*").single();
  if (error || !data) fail("Could not save the block", error);
  return data;
}

/** Soft delete: archived blocks stop resolving, history stays. */
export async function archiveBlock(id: string): Promise<void> {
  const { error } = await agent().from("prompt_block").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) fail("Could not archive the block", error);
}

export async function listVariants(blockId: string): Promise<PromptBlockVariantRow[]> {
  const { data, error } = await agent()
    .from("prompt_block_variant")
    .select("*")
    .eq("prompt_block_id", blockId)
    .is("deleted_at", null)
    .order("sort_order");
  if (error) fail("Could not load variants", error);
  return data ?? [];
}

export async function createVariant(
  block: Pick<PromptBlockRow, "id" | "organization_id">,
  input: { label: string; condition: Record<string, unknown>; content: string; sort_order: number },
): Promise<PromptBlockVariantRow> {
  const { data, error } = await agent()
    .from("prompt_block_variant")
    .insert({
      prompt_block_id: block.id,
      organization_id: block.organization_id,
      label: input.label,
      condition: input.condition as never,
      content: input.content,
      sort_order: input.sort_order,
    })
    .select("*")
    .single();
  if (error || !data) fail("Could not add the variant", error);
  return data;
}

export async function updateVariant(
  id: string,
  patch: Partial<Pick<PromptBlockVariantRow, "label" | "content" | "sort_order">> & { condition?: Record<string, unknown> },
): Promise<void> {
  const { error } = await agent()
    .from("prompt_block_variant")
    .update(patch as never)
    .eq("id", id);
  if (error) fail("Could not save the variant", error);
}

export async function archiveVariant(id: string): Promise<void> {
  const { error } = await agent().from("prompt_block_variant").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) fail("Could not remove the variant", error);
}

export interface UsingAgent {
  id: string;
  name: string;
}

/** Agents declaring `name` (an edit to the block goes live in all of them). */
export async function agentsUsing(name: string): Promise<UsingAgent[]> {
  const { data, error } = await agent()
    .from("definition")
    .select("id, name")
    .is("deleted_at", null)
    .contains("prompt_blocks", JSON.stringify([{ name }]))
    .limit(200);
  if (error) fail("Could not load the agents using this block", error);
  return (data ?? []) as UsingAgent[];
}

export async function toolUpdatedAt(toolName: string): Promise<string | null> {
  const { data } = await supabase.schema("tool").from("definition").select("updated_at").eq("name", toolName).is("deleted_at", null).maybeSingle();
  return data?.updated_at ?? null;
}

export interface SkillOption {
  skill_id: string;
  label: string;
}

export async function listSkills(): Promise<SkillOption[]> {
  const { data } = await supabase.schema("skill").from("definition").select("skill_id, label").is("deleted_at", null).order("label").limit(500);
  return (data ?? []) as SkillOption[];
}

export async function listToolNames(): Promise<string[]> {
  const { data } = await supabase.schema("tool").from("definition").select("name").is("deleted_at", null).order("name").limit(1000);
  return (data ?? []).map((t) => t.name);
}
