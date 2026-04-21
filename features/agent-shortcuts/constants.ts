export const PLACEMENT_TYPES = {
  AI_ACTION: "ai-action",
  BUTTON: "button",
  CARD: "card",
  QUICK_ACTION: "quick-action",
  MODAL: "modal",
  CONTENT_BLOCK: "content-block",
  ORGANIZATION_TOOL: "organization-tool",
  USER_TOOL: "user-tool",
} as const;

export type PlacementType = (typeof PLACEMENT_TYPES)[keyof typeof PLACEMENT_TYPES];

export const PLACEMENT_TYPE_META = {
  [PLACEMENT_TYPES.AI_ACTION]: {
    label: "AI Actions",
    description: "Agent actions available in context menus",
    icon: "Sparkles",
  },
  [PLACEMENT_TYPES.BUTTON]: {
    label: "Button",
    description: "Pre-programmed buttons that trigger agents",
    icon: "MousePointerClick",
  },
  [PLACEMENT_TYPES.CARD]: {
    label: "Card",
    description: "Cards with auto-scoped title and description",
    icon: "LayoutGrid",
  },
  [PLACEMENT_TYPES.QUICK_ACTION]: {
    label: "Quick Action",
    description: "Trigger specific functionality quickly",
    icon: "Zap",
  },
  [PLACEMENT_TYPES.MODAL]: {
    label: "Modal",
    description: "Render a modal interface",
    icon: "Square",
  },
  [PLACEMENT_TYPES.CONTENT_BLOCK]: {
    label: "Content Block",
    description: "Content blocks for insertion in editors",
    icon: "FileText",
  },
  [PLACEMENT_TYPES.ORGANIZATION_TOOL]: {
    label: "Organization Tool",
    description: "Organization tools",
    icon: "Building",
  },
  [PLACEMENT_TYPES.USER_TOOL]: {
    label: "User Tool",
    description: "User tools",
    icon: "User",
  },
} as const satisfies Record<
  PlacementType,
  { label: string; description: string; icon: string }
>;

export function getPlacementTypeMeta(placementType: string) {
  const meta = PLACEMENT_TYPE_META[placementType as PlacementType];
  if (!meta) {
    return {
      label: placementType || "Undefined",
      description: "No description available",
      icon: "HelpCircle",
    };
  }
  return meta;
}

export const AGENT_SCOPES = {
  GLOBAL: "global",
  USER: "user",
  ORGANIZATION: "organization",
  PROJECT: "project",
  TASK: "task",
} as const;

export type AgentScope = (typeof AGENT_SCOPES)[keyof typeof AGENT_SCOPES];

export interface ScopeOption {
  value: AgentScope;
  label: string;
  description: string;
  icon: string;
  requiresId: boolean;
}

export const SCOPE_OPTIONS: ScopeOption[] = [
  {
    value: AGENT_SCOPES.GLOBAL,
    label: "Global",
    description: "Available to every user on the platform (admin only)",
    icon: "Globe",
    requiresId: false,
  },
  {
    value: AGENT_SCOPES.USER,
    label: "User",
    description: "Personal — only the current user can see or run this",
    icon: "User",
    requiresId: false,
  },
  {
    value: AGENT_SCOPES.ORGANIZATION,
    label: "Organization",
    description: "Available to every member of a specific organization",
    icon: "Building",
    requiresId: true,
  },
  {
    value: AGENT_SCOPES.PROJECT,
    label: "Project",
    description: "Scoped to a specific project",
    icon: "FolderKanban",
    requiresId: true,
  },
  {
    value: AGENT_SCOPES.TASK,
    label: "Task",
    description: "Scoped to a specific task",
    icon: "ListChecks",
    requiresId: true,
  },
];

export const SCOPE_LEVELS = {
  SELECTION: "selection",
  CONTENT: "content",
  CONTEXT: "context",
} as const;

export type ScopeLevel = (typeof SCOPE_LEVELS)[keyof typeof SCOPE_LEVELS];

export const DEFAULT_AVAILABLE_SCOPES: ScopeLevel[] = [
  SCOPE_LEVELS.SELECTION,
  SCOPE_LEVELS.CONTENT,
  SCOPE_LEVELS.CONTEXT,
];

export const SCOPE_UNAVAILABLE_VALUES = {
  EMPTY: "",
  NOT_AVAILABLE: "NOT AVAILABLE",
} as const;

export const ICON_PRESETS = [
  "Sparkles",
  "Zap",
  "Wand2",
  "Bot",
  "Brain",
  "MessageSquare",
  "FileText",
  "Folder",
  "Code",
  "Terminal",
  "Search",
  "Pencil",
  "Edit3",
  "Check",
  "Play",
  "Settings",
  "Tag",
  "Star",
  "Heart",
  "Bookmark",
] as const;

export const CATEGORY_PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#64748b",
  "#6b7280",
  "#71717a",
] as const;

export const RESULT_DISPLAY_OPTIONS = [
  { value: "modal-full", label: "Full Modal" },
  { value: "modal-compact", label: "Compact Modal" },
  { value: "inline", label: "Inline" },
  { value: "sidebar", label: "Sidebar" },
  { value: "flexible-panel", label: "Flexible Panel" },
  { value: "floating-chat", label: "Floating Chat" },
  { value: "background", label: "Background" },
  { value: "direct", label: "Direct" },
] as const;
