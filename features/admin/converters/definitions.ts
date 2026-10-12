/**
 * features/admin/converters/definitions.ts
 *
 * Database-defined (no-code) converters: `content_ir.converter_definition` rows, read and written
 * straight to Supabase under RLS; the check runs on aidream (`POST /admin/converters/definitions/{id}/check`).
 */
import { apiPost, buildPath } from "@/lib/api/typed-client";
import type { Database, Json } from "@/types/database.types";
import { createClient } from "@/utils/supabase/client";

import type { components } from "@ai-matrx/agents/generated/api-types";

export type ConverterDefinitionRow =
  Database["content_ir"]["Tables"]["converter_definition"]["Row"];
export type ConverterDefinitionCheck =
  components["schemas"]["ConverterDefinitionCheckResponse"];

/** The editable part of a row (the spec plus its labels). */
export interface ConverterDefinitionDraft {
  slug: string;
  label: string;
  description: string | null;
  target: string;
  status: string;
  detect: Json;
  item_selector: string | null;
  fields: Json;
  constants: Json;
  sample_url: string | null;
}

const COLUMNS =
  "id, organization_id, slug, label, description, target, converter_version, status, detect, item_selector, fields, constants, sample_url, sample_file_id, last_check, updated_at";

export async function listConverterDefinitions(): Promise<
  ConverterDefinitionRow[]
> {
  const { data, error } = await createClient()
    .schema("content_ir")
    .from("converter_definition")
    .select(COLUMNS)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConverterDefinitionRow[];
}

const SPEC_KEYS = [
  "target",
  "detect",
  "item_selector",
  "fields",
  "constants",
] as const;

/** Save a definition; a change to the mapping itself bumps `converter_version`. */
export async function saveConverterDefinition(
  row: ConverterDefinitionRow,
  draft: ConverterDefinitionDraft,
): Promise<void> {
  const specChanged = SPEC_KEYS.some(
    (k) => JSON.stringify(row[k]) !== JSON.stringify(draft[k]),
  );
  const { error } = await createClient()
    .schema("content_ir")
    .from("converter_definition")
    .update({
      ...draft,
      converter_version: specChanged
        ? row.converter_version + 1
        : row.converter_version,
    })
    .eq("id", row.id);
  if (error) throw error;
}

export async function createConverterDefinition(
  organizationId: string,
  draft: ConverterDefinitionDraft,
): Promise<string> {
  const { data, error } = await createClient()
    .schema("content_ir")
    .from("converter_definition")
    .insert({ ...draft, organization_id: organizationId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function checkConverterDefinition(
  id: string,
): Promise<ConverterDefinitionCheck> {
  const { data } = await apiPost(
    buildPath("/admin/converters/definitions/{definition_id}/check", {
      definition_id: id,
    }),
    undefined,
  );
  return data;
}
