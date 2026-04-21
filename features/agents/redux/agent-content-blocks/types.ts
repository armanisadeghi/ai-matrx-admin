import type { FieldFlags } from "@/features/agents/redux/shared/field-flags";
import type { Scope } from "@/features/agents/redux/shared/scope";

export interface AgentContentBlockDef {
  id: string;
  blockId: string;
  categoryId: string | null;
  label: string;
  description: string | null;
  iconName: string;
  sortOrder: number;
  template: string;
  isActive: boolean;

  userId: string | null;
  organizationId: string | null;
  projectId: string | null;
  taskId: string | null;

  createdAt: string;
  updatedAt: string;
}

export type ContentBlockFieldSnapshot = {
  [K in keyof AgentContentBlockDef]?: AgentContentBlockDef[K];
};

export type ContentBlockLoadedFields = FieldFlags<keyof AgentContentBlockDef>;

export interface AgentContentBlockRecord extends AgentContentBlockDef {
  _dirty: boolean;
  _dirtyFields: FieldFlags<keyof AgentContentBlockDef>;
  _fieldHistory: ContentBlockFieldSnapshot;
  _loadedFields: ContentBlockLoadedFields;
  _loading: boolean;
  _error: string | null;
}

export interface AgentContentBlockSliceState {
  contentBlocksById: Record<string, AgentContentBlockRecord>;
  contentBlockIdsByScope: Record<string, string[]>;
  activeContentBlockId: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  scopeLoaded: Record<string, boolean>;
}

export interface ContentBlockApiRow {
  id: string;
  block_id: string;
  category_id: string | null;
  label: string;
  description: string | null;
  icon_name: string;
  sort_order: number | null;
  template: string;
  is_active: boolean | null;
  user_id: string | null;
  organization_id: string | null;
  project_id: string | null;
  task_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type CreateContentBlockPayload = Partial<
  Omit<AgentContentBlockDef, "id" | "createdAt" | "updatedAt">
> & {
  blockId: string;
  label: string;
  template: string;
  iconName: string;
  scope?: Scope;
  scopeId?: string | null;
};

export type UpdateContentBlockPatch = Partial<
  Omit<AgentContentBlockDef, "id" | "createdAt" | "updatedAt">
>;
