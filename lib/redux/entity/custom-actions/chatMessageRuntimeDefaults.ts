/**
 * Shared message runtime filter/sort defaults (leaf — no redux/entity thunks).
 * Kept in one place for chat actions + AI chat thunks to avoid import cycles.
 */
export const CHAT_DEFAULT_MESSAGE_RUNTIME_FILTERS = [
  { field: "role", operator: "neq" as const, value: "system" },
  { field: "displayOrder", operator: "neq" as const, value: 0 },
] as const;

export const CHAT_DEFAULT_MESSAGE_RUNTIME_SORT = {
  field: "displayOrder",
  direction: "asc" as const,
} as const;
