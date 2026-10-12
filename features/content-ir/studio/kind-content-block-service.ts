/**
 * Kind content-block persistence — the client seam for storing a DERIVED
 * teaching block (from `kind-content-block-generator.ts`) into
 * `agent.prompt_block` (the canonical content/render-block table; the
 * old public content_blocks table is retired — see scripts/dead-relations.json).
 *
 * Two authorization worlds, ONE generator feeding both:
 *   - admin (platform kinds): the block lives in the system org, which no user
 *     can write via RLS, so it goes through the `is_super_admin()`-gated
 *     `content_ir.admin_upsert_kind_content_block` RPC (upsert by the globally
 *     unique block_id — create AND regenerate in one call; writes
 *     agent.prompt_block with block_type 'render_kind').
 *   - owner (user shapes on /shapes): RLS already permits the owner to write
 *     their own block, so that path is a direct supabase upsert-by-block_id
 *     below (same table, same block_type).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as browserSupabase } from "@/utils/supabase/client";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { operationFailed } from "@/utils/errors";
import { tryWriteOne } from "@/utils/supabase/writeOne";
import type { Database } from "@/types/database.types";
import type { GeneratedContentBlock } from "@/features/content-ir/registry/kind-content-block-generator";

import { getClaimsUser } from "@ai-matrx/auth";
export interface AdminUpsertContentBlockResult {
  id: string;
  blockId: string;
  label: string;
  isActive: boolean;
}

/**
 * Store (or regenerate in place) a platform kind's teaching content block.
 * Super-admin only — the RPC raises `42501` for anyone else.
 */
export async function adminUpsertKindContentBlock(
  client: SupabaseClient<Database>,
  args: { kindDefinitionId: string; block: GeneratedContentBlock },
): Promise<AdminUpsertContentBlockResult> {
  const { kindDefinitionId, block } = args;
  const { data, error } = await client
    .schema("content_ir")
    .rpc("admin_upsert_kind_content_block", {
      p_kind_definition_id: kindDefinitionId,
      p_block_id: block.blockId,
      p_label: block.label,
      p_description: block.description,
      p_icon_name: block.iconName,
      p_template: block.template,
      p_metadata: { tier: block.tier },
    });
  if (error) {
    throw operationFailed("save this kind's content block", error);
  }
  const row =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return {
    id: typeof row.id === "string" ? row.id : "",
    blockId: typeof row.block_id === "string" ? row.block_id : block.blockId,
    label: typeof row.label === "string" ? row.label : block.label,
    isActive: typeof row.id === "string" && row.deleted_at == null,
  };
}

/**
 * Store (or update in place) a content block for a USER-OWNED shape — a
 * direct supabase write to `agent.prompt_block` (block_type 'render_kind').
 * RLS lets the owner write their own block, so no RPC. Matches the live block
 * of the same name in the organization so regenerate never duplicates.
 * (metadata on prompt_block is system-owned; the kind link is the name.)
 */
export async function ownerUpsertKindContentBlock(
  block: GeneratedContentBlock,
): Promise<void> {
  const { data: userData } = await getClaimsUser(browserSupabase);
  const userId = userData?.user?.id ?? null;
  // org-filter: write-target writes into the organization the person is working in; no list reads it
  const organizationId = await ensureOrgId(undefined);

  const { data: existing, error: findError } = await browserSupabase
    .schema("agent")
    .from("prompt_block")
    .select("id")
    .eq("name", block.blockId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (findError) {
    throw new Error(
      `Failed to look up your content block: ${findError.message}`,
    );
  }

  const fields = {
    name: block.blockId,
    label: block.label,
    description: block.description,
    icon_name: block.iconName,
    content: block.template,
    block_type: "render_kind",
  };

  const { error } = existing
    ? await tryWriteOne(
        browserSupabase
          .schema("agent")
          .from("prompt_block")
          .update(fields)
          .eq("id", existing.id)
          .select("id"),
        { action: "save", noun: "content block" },
      )
    : await browserSupabase
        .schema("agent")
        .from("prompt_block")
        .insert({
          ...fields,
          organization_id: organizationId,
          created_by: userId,
          shown_to: "only_me",
        });
  if (error) {
    throw new Error(`Failed to store the content block: ${error.message}`);
  }
}
