import type { AgentContentBlockDef, ContentBlockApiRow } from "./types";

export function contentBlockRowToDef(
  row: ContentBlockApiRow,
): AgentContentBlockDef {
  return {
    id: row.id,
    blockId: row.block_id,
    categoryId: row.category_id,
    label: row.label,
    description: row.description,
    iconName: row.icon_name,
    sortOrder: row.sort_order ?? 0,
    template: row.template,
    isActive: row.is_active ?? true,
    userId: row.user_id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    taskId: row.task_id,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

export function contentBlockDefToRowPatch(
  patch: Partial<AgentContentBlockDef>,
): Partial<ContentBlockApiRow> {
  const out: Partial<ContentBlockApiRow> = {};
  if (patch.blockId !== undefined) out.block_id = patch.blockId;
  if (patch.categoryId !== undefined) out.category_id = patch.categoryId;
  if (patch.label !== undefined) out.label = patch.label;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.iconName !== undefined) out.icon_name = patch.iconName;
  if (patch.sortOrder !== undefined) out.sort_order = patch.sortOrder;
  if (patch.template !== undefined) out.template = patch.template;
  if (patch.isActive !== undefined) out.is_active = patch.isActive;
  if (patch.userId !== undefined) out.user_id = patch.userId;
  if (patch.organizationId !== undefined)
    out.organization_id = patch.organizationId;
  if (patch.projectId !== undefined) out.project_id = patch.projectId;
  if (patch.taskId !== undefined) out.task_id = patch.taskId;
  return out;
}
