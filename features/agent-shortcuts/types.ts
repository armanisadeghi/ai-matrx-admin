import type { AgentShortcut } from "@/features/agents/redux/agent-shortcuts/types";
import type { AgentShortcutCategoryDef } from "@/features/agents/redux/agent-shortcut-categories/types";
import type { AgentContentBlockDef } from "@/features/agents/redux/agent-content-blocks/types";
import type { AgentScope, PlacementType, ScopeLevel } from "./constants";

export type {
  AgentShortcut,
  AgentShortcutRecord,
} from "@/features/agents/redux/agent-shortcuts/types";

export type {
  AgentShortcutCategoryDef,
  AgentShortcutCategoryRecord,
} from "@/features/agents/redux/agent-shortcut-categories/types";

export type {
  AgentContentBlockDef,
  AgentContentBlockRecord,
} from "@/features/agents/redux/agent-content-blocks/types";

export type { AgentScope, PlacementType, ScopeLevel } from "./constants";

export type AgentShortcutCategory = AgentShortcutCategoryDef;
export type AgentContentBlock = AgentContentBlockDef;

export interface ScopeProps {
  scope: AgentScope;
  scopeId?: string;
}

export interface CategoryFormData {
  label: string;
  placementType: PlacementType;
  parentCategoryId: string | null;
  description: string;
  iconName: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  enabledContexts: string[];
  metadata: Record<string, unknown>;
}

export interface ContentBlockFormData {
  blockId: string;
  label: string;
  description: string;
  iconName: string;
  categoryId: string | null;
  template: string;
  sortOrder: number;
  isActive: boolean;
}

export type ShortcutFormData = Omit<
  AgentShortcut,
  "id" | "createdAt" | "updatedAt"
>;

export interface ScopeValidationResult {
  isValid: boolean;
  error?: string;
}
