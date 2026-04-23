import type { Database } from "@/types/database.types";
import type {
  SklCategory,
  SklDefinition,
  SklRenderComponent,
  SklRenderDefinition,
  SklResource,
  ShortcutCategoryRow,
} from "./types";

type DefRow = Database["public"]["Tables"]["skl_definitions"]["Row"];
type RenderDefRow = Database["public"]["Tables"]["skl_render_definitions"]["Row"];
type RenderComponentRow =
  Database["public"]["Tables"]["skl_render_components"]["Row"];
type CategoryRow = Database["public"]["Tables"]["skl_categories"]["Row"];
type ResourceRow = Database["public"]["Tables"]["skl_resources"]["Row"];
type ShortcutCategoryDbRow =
  Database["public"]["Tables"]["shortcut_categories"]["Row"];

function asArray<T = unknown>(v: unknown): T[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v as T[];
  return null;
}

export function rowToSklDefinition(row: DefRow): SklDefinition {
  return {
    id: row.id,
    skillId: row.skill_id,
    label: row.label,
    description: row.description,
    skillType: row.skill_type,
    body: row.body,
    iconName: row.icon_name,
    modelPreference: row.model_preference,
    allowedTools: asArray(row.allowed_tools),
    triggerPatterns: asArray(row.trigger_patterns),
    disableAutoInvocation: row.disable_auto_invocation,
    platformTargets: asArray<string>(row.platform_targets),
    version: row.version,
    config: row.config,
    categoryId: row.category_id,
    parentSkillId: row.parent_skill_id,
    isSystem: row.is_system,
    isPublic: row.is_public,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    userId: row.user_id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    taskId: row.task_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sklDefinitionToInsert(
  def: Partial<SklDefinition> & Pick<SklDefinition, "skillId" | "label" | "description">,
): Database["public"]["Tables"]["skl_definitions"]["Insert"] {
  return {
    skill_id: def.skillId,
    label: def.label,
    description: def.description,
    skill_type: def.skillType ?? "convention",
    body: def.body ?? null,
    icon_name: def.iconName ?? null,
    model_preference: def.modelPreference ?? null,
    allowed_tools: (def.allowedTools ?? null) as DefRow["allowed_tools"],
    trigger_patterns: (def.triggerPatterns ?? null) as DefRow["trigger_patterns"],
    disable_auto_invocation: def.disableAutoInvocation ?? false,
    platform_targets: (def.platformTargets ?? null) as DefRow["platform_targets"],
    version: def.version ?? null,
    config: def.config ?? null,
    category_id: def.categoryId ?? null,
    parent_skill_id: def.parentSkillId ?? null,
    is_system: def.isSystem ?? false,
    is_public: def.isPublic ?? false,
    is_active: def.isActive ?? true,
    sort_order: def.sortOrder ?? 0,
    user_id: def.userId ?? null,
    organization_id: def.organizationId ?? null,
    project_id: def.projectId ?? null,
    task_id: def.taskId ?? null,
  };
}

export function sklDefinitionToUpdate(
  patch: Partial<SklDefinition>,
): Database["public"]["Tables"]["skl_definitions"]["Update"] {
  const u: Database["public"]["Tables"]["skl_definitions"]["Update"] = {};
  if (patch.skillId !== undefined) u.skill_id = patch.skillId;
  if (patch.label !== undefined) u.label = patch.label;
  if (patch.description !== undefined) u.description = patch.description;
  if (patch.skillType !== undefined) u.skill_type = patch.skillType;
  if (patch.body !== undefined) u.body = patch.body;
  if (patch.iconName !== undefined) u.icon_name = patch.iconName;
  if (patch.modelPreference !== undefined)
    u.model_preference = patch.modelPreference;
  if (patch.allowedTools !== undefined)
    u.allowed_tools = patch.allowedTools as DefRow["allowed_tools"];
  if (patch.triggerPatterns !== undefined)
    u.trigger_patterns = patch.triggerPatterns as DefRow["trigger_patterns"];
  if (patch.disableAutoInvocation !== undefined)
    u.disable_auto_invocation = patch.disableAutoInvocation;
  if (patch.platformTargets !== undefined)
    u.platform_targets = patch.platformTargets as DefRow["platform_targets"];
  if (patch.version !== undefined) u.version = patch.version;
  if (patch.config !== undefined) u.config = patch.config;
  if (patch.categoryId !== undefined) u.category_id = patch.categoryId;
  if (patch.parentSkillId !== undefined) u.parent_skill_id = patch.parentSkillId;
  if (patch.isSystem !== undefined) u.is_system = patch.isSystem;
  if (patch.isPublic !== undefined) u.is_public = patch.isPublic;
  if (patch.isActive !== undefined) u.is_active = patch.isActive;
  if (patch.sortOrder !== undefined) u.sort_order = patch.sortOrder;
  return u;
}

export function rowToSklRenderDefinition(
  row: RenderDefRow,
): SklRenderDefinition {
  return {
    id: row.id,
    blockId: row.block_id,
    label: row.label,
    description: row.description,
    iconName: row.icon_name,
    template: row.template,
    categoryId: row.category_id,
    skillId: row.skill_id,
    isActive: row.is_active,
    isPublic: row.is_public,
    sortOrder: row.sort_order,
    userId: row.user_id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    taskId: row.task_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sklRenderDefinitionToUpdate(
  patch: Partial<SklRenderDefinition>,
): Database["public"]["Tables"]["skl_render_definitions"]["Update"] {
  const u: Database["public"]["Tables"]["skl_render_definitions"]["Update"] = {};
  if (patch.blockId !== undefined) u.block_id = patch.blockId;
  if (patch.label !== undefined) u.label = patch.label;
  if (patch.description !== undefined) u.description = patch.description;
  if (patch.iconName !== undefined) u.icon_name = patch.iconName;
  if (patch.template !== undefined) u.template = patch.template;
  if (patch.categoryId !== undefined) u.category_id = patch.categoryId;
  if (patch.skillId !== undefined) u.skill_id = patch.skillId;
  if (patch.isActive !== undefined) u.is_active = patch.isActive;
  if (patch.isPublic !== undefined) u.is_public = patch.isPublic;
  if (patch.sortOrder !== undefined) u.sort_order = patch.sortOrder;
  return u;
}

export function sklRenderDefinitionToInsert(
  def: Partial<SklRenderDefinition> &
    Pick<SklRenderDefinition, "blockId" | "label" | "iconName" | "template">,
): Database["public"]["Tables"]["skl_render_definitions"]["Insert"] {
  return {
    block_id: def.blockId,
    label: def.label,
    icon_name: def.iconName,
    template: def.template,
    description: def.description ?? null,
    category_id: def.categoryId ?? null,
    skill_id: def.skillId ?? null,
    is_active: def.isActive ?? true,
    is_public: def.isPublic ?? false,
    sort_order: def.sortOrder ?? 0,
    user_id: def.userId ?? null,
    organization_id: def.organizationId ?? null,
    project_id: def.projectId ?? null,
    task_id: def.taskId ?? null,
  };
}

export function rowToSklRenderComponent(
  row: RenderComponentRow,
): SklRenderComponent {
  return {
    id: row.id,
    renderDefinitionId: row.render_definition_id,
    componentKey: row.component_key,
    platform: row.platform,
    parserKey: row.parser_key,
    parserConfig: row.parser_config,
    propsSchema: row.props_schema,
    importPath: row.import_path,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToSklCategory(row: CategoryRow): SklCategory {
  return {
    id: row.id,
    categoryKey: row.category_key,
    label: row.label,
    description: row.description,
    iconName: row.icon_name,
    color: row.color,
    parentCategoryId: row.parent_category_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    metadata: row.metadata,
    userId: row.user_id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    taskId: row.task_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToSklResource(row: ResourceRow): SklResource {
  return {
    id: row.id,
    skillId: row.skill_id,
    resourceType: row.resource_type,
    filename: row.filename,
    content: row.content,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToShortcutCategory(
  row: ShortcutCategoryDbRow,
): ShortcutCategoryRow {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    iconName: row.icon_name,
    color: row.color,
    parentCategoryId: row.parent_category_id,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    placementType: row.placement_type,
    userId: row.user_id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    taskId: row.task_id,
  };
}
