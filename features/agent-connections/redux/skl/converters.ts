import type { Database } from "@/types/database.types";
import type { SklRenderDefinition, ShortcutCategoryRow } from "./types";
import { publishedToWebPatch } from "@/lib/row-access";

// NOTE — May 2026: skill-definition + category converters moved to
// `features/skills/redux/skillsConverters.ts`. Render-blocks continue here.
// Resources retired 2026-07-06 → attach code_files/notes to a skill via
// platform.associations (features/skills/redux/skillsThunks.ts).

// Content blocks / render blocks live in agent.prompt_block (skill.render_definition retired).
// Field map: block_id -> name, template -> content, is_active -> deleted_at is null (archive is the off switch).
type RenderDefRow = Database["agent"]["Tables"]["prompt_block"]["Row"];

/**
 * Row shape returned by fetchRenderBlockCategories after the May 2026 migration
 * to platform.categories. The query aliases new column names back to the old
 * consumer-expected names via PostgREST syntax (e.g. `label:name`). user_id /
 * project_id / task_id are no longer top-level columns on platform.categories
 * (they moved into metadata) and are not selected.
 */
// Raw platform.categories row — fetched via select("*") and aliased in the
// mapper below (the equivalent PostgREST `->>` aliased select triggered TS2589
// after the schema regen).
type PlatformCategoryRow = Database["platform"]["Tables"]["categories"]["Row"];

/** Insert payload before scope stamping — organization_id is filled by stampScopeForWrite. */
type SklRenderDefinitionInsertPayload = Omit<
  Database["agent"]["Tables"]["prompt_block"]["Insert"],
  "organization_id"
> & { organization_id?: string };

const RENDER_BLOCK_TYPES = new Set(["render_kind", "xml", "markdown"]);

function normalizeBlockType(
  raw: string,
): SklRenderDefinition["blockType"] {
  return RENDER_BLOCK_TYPES.has(raw)
    ? (raw as SklRenderDefinition["blockType"])
    : "markdown";
}

export function rowToSklRenderDefinition(
  row: RenderDefRow,
): SklRenderDefinition {
  return {
    id: row.id,
    blockId: row.name,
    label: row.label,
    description: row.description,
    iconName: row.icon_name ?? "",
    template: row.content,
    categoryId: row.category_id,
    skillId: row.skill_id,
    blockType: normalizeBlockType(row.block_type),
    isActive: row.deleted_at == null,
    isPublic: row.published_to_web,
    sortOrder: row.sort_order,
    userId: row.created_by,
    organizationId: row.organization_id,
    // Prompt blocks are not scoped to a project or task (none of the migrated rows were).
    projectId: null,
    taskId: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sklRenderDefinitionToUpdate(
  patch: Partial<SklRenderDefinition>,
): Database["agent"]["Tables"]["prompt_block"]["Update"] {
  const u: Database["agent"]["Tables"]["prompt_block"]["Update"] = {};
  if (patch.blockId !== undefined) u.name = patch.blockId;
  if (patch.label !== undefined) u.label = patch.label;
  if (patch.description !== undefined) u.description = patch.description;
  if (patch.iconName !== undefined) u.icon_name = patch.iconName;
  if (patch.template !== undefined) u.content = patch.template;
  if (patch.categoryId !== undefined) u.category_id = patch.categoryId;
  if (patch.skillId !== undefined) u.skill_id = patch.skillId;
  if (patch.blockType !== undefined) u.block_type = patch.blockType;
  // Active <-> archived: the prompt block has no is_active, the archive is the off switch.
  if (patch.isActive !== undefined)
    u.deleted_at = patch.isActive ? null : new Date().toISOString();
  if (patch.isPublic !== undefined)
    Object.assign(u, publishedToWebPatch(patch.isPublic, patch.userId ?? null));
  if (patch.sortOrder !== undefined) u.sort_order = patch.sortOrder;
  return u;
}

export function sklRenderDefinitionToInsert(
  def: Partial<SklRenderDefinition> &
    Pick<SklRenderDefinition, "blockId" | "label" | "iconName" | "template">,
): SklRenderDefinitionInsertPayload {
  return {
    name: def.blockId,
    label: def.label,
    icon_name: def.iconName,
    content: def.template,
    description: def.description ?? null,
    category_id: def.categoryId ?? null,
    skill_id: def.skillId ?? null,
    ...(def.blockType !== undefined ? { block_type: def.blockType } : {}),
    ...(def.isActive === false
      ? { deleted_at: new Date().toISOString() }
      : {}),
    ...(def.isPublic
      ? publishedToWebPatch(true, def.userId ?? null)
      : { shown_to: "only_me" as const }),
    sort_order: def.sortOrder ?? 0,
    created_by: def.userId ?? null,
    ...(def.organizationId != null
      ? { organization_id: def.organizationId }
      : {}),
  };
}

export function rowToShortcutCategory(
  row: PlatformCategoryRow,
): ShortcutCategoryRow {
  // description / is_active live in metadata on platform.categories. is_active
  // may be a boolean or a "true"/"false" text; absent/null means true (active).
  const meta = (row.metadata ?? {}) as {
    description?: string | null;
    is_active?: string | boolean | null;
  };
  const rawIsActive = meta.is_active;
  const isActive =
    rawIsActive === null || rawIsActive === undefined
      ? true
      : rawIsActive !== false && rawIsActive !== "false";

  return {
    id: row.id,
    label: row.name ?? "",
    description: meta.description ?? null,
    iconName: row.icon ?? "",
    color: row.color,
    parentCategoryId: row.parent_id,
    sortOrder: row.position ?? 0,
    isActive,
    placementType: row.placement_type ?? "",
    // user_id / project_id / task_id no longer exist as top-level columns on
    // platform.categories (moved into metadata). Default to null.
    userId: null,
    organizationId: row.organization_id,
    projectId: null,
    taskId: null,
  };
}
