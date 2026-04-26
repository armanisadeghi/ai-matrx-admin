// features/window-panels/windows/agents/agent-content.types.ts
//
// Pure type definitions for the AgentContent window panel.
// Kept separate from AgentContentWindow.tsx so that Redux slices (overlaySlice)
// can import these types without pulling in the entire React component tree.

export type AgentContentTab =
  | "messages"
  | "system"
  | "settings"
  | "variables"
  | "tools"
  | "context"
  | "overview"
  | "share"
  | "run"
  | "history"
  | "versions";
