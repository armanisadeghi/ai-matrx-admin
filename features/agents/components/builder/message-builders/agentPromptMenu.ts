"use client";

/**
 * The agent builder's prompt editors' own rows in the designed right-click menu (the [Prompt]
 * feature section: the first 4 rows, the rest under More). Every row reuses a handler the page
 * already has — the toolbar's Insert menu, the Block picker, the Optimize dialog, the add-block
 * buttons, the header "…" menu's agent windows. Nothing here runs until the menu opens: hosts call
 * `agentPromptMenuSections` from `resolveExtraSectionsOnOpen`.
 *
 * Capability inventory (why each row is here, or not): common-docs
 * skills/context-menu-mapping/NOTES.md › "Capability inventory — worked example: the agent builder".
 */

import {
  Boxes,
  Braces,
  ClipboardList,
  Eraser,
  GitBranch,
  History,
  Info,
  LayoutTemplate,
  Maximize2,
  Play,
  Plus,
  Repeat,
  Settings2,
  Webhook,
  Trash2,
  Atom,
  TextCursorInput,
} from "lucide-react";
import type { ContextMenuExtraItem, ContextMenuExtraSection } from "@ai-matrx/context-menu/engine";
import {
  PROMPT_SECTION_TAGS,
  contextReferenceInsert,
  exampleInsert,
  sectionInsert,
  variableInsert,
  type PromptInsert,
} from "@ai-matrx/rich-editor/core/prompt-inserts";
import {
  useOpenAgentContentWindow,
  useOpenAgentOptimizerWindow,
  useOpenAgentRunHistoryWindow,
  useOpenAgentRunWindow,
  useOpenAgentSettingsWindow,
} from "@ai-matrx/chat/host/window-openers";
import type { BlockType } from "./AddBlockButton";

/** The header "…" menu's agent windows, as menu callbacks (same openers, same arguments). */
export interface AgentBuilderMenuActions {
  agentId: string;
  openAgentOptimizer: () => void;
  openTestRun: () => void;
  openRunHistory: () => void;
  openAgentInfo: () => void;
  openAdvancedSettings: () => void;
}

export function useAgentBuilderMenuActions(agentId: string): AgentBuilderMenuActions {
  const openOptimizer = useOpenAgentOptimizerWindow();
  const openRun = useOpenAgentRunWindow();
  const openRunHistory = useOpenAgentRunHistoryWindow();
  const openSettings = useOpenAgentSettingsWindow();
  const openAdvanced = useOpenAgentContentWindow();
  // React Compiler memoises this; callbacks only run on a menu click.
  return {
    agentId,
    openAgentOptimizer: () => void openOptimizer({ agentId }),
    openTestRun: () => void openRun({ initialAgentId: agentId, initialSelectedConversationId: null }),
    openRunHistory: () => void openRunHistory({ agentId, initialSelectedConversationId: null }),
    openAgentInfo: () => void openSettings({ initialAgentId: agentId }),
    openAdvancedSettings: () => void openAdvanced({ initialAgentId: agentId, initialTab: undefined, tabs: null }),
  };
}

export interface AgentPromptMenuArgs {
  /** The agent's variable names (Insert variable's submenu). */
  variableNames: readonly string[];
  /** The agent's context items (Insert › Context item). */
  contextItems: readonly { key: string; label?: string }[];
  /** Put an insert at the caret the person right-clicked (exact text, the toolbar Insert's path). */
  insert: (insert: PromptInsert) => void;
  /** "New variable…": the builder's Variables section, its Add button focused. */
  onNewVariable: () => void;
  /** "Add context item…": the builder's Context section. */
  onAddContextItem: () => void;
  /** The prompt-block row (`usePromptBlockEditing().menuSections()`): the toolbar's Block. */
  blockSections: readonly ContextMenuExtraSection[];
  /** "Only include when filled / empty" (selection over a variable): `promptSectionSections` / Write's own. */
  conditionalSections: readonly ContextMenuExtraSection[];
  /** System message: the section's "Optimize with AI" (SystemPromptOptimizer dialog). */
  onOptimize?: () => void;
  /** The add-block button's types (Text, Image, …) and its handler. */
  contentBlockTypes?: readonly { type: BlockType; label: string }[];
  onAddContentBlock?: (type: BlockType) => void;
  /** User/assistant message: the role select. */
  roleSwitch?: { to: "user" | "assistant"; run: () => void };
  onOpenFullScreenEditor?: () => void;
  onClear?: () => void;
  onDelete?: () => void;
  agent: AgentBuilderMenuActions;
}

const item = (
  id: string,
  label: string,
  onSelect: () => void,
  extra: Partial<Extract<ContextMenuExtraItem, { kind: "item" }>> = {},
): ContextMenuExtraItem => ({ kind: "item", id, label, onSelect, ...extra });

/** The section ids this module contributes (row keys are `extra:<sectionId>/<itemId>`). */
export const AGENT_PROMPT_SECTION = {
  insert: "agent-prompt-insert",
  ai: "agent-prompt-ai",
  edit: "agent-prompt-edit",
  agent: "agent-prompt-agent",
} as const;

/**
 * The [Prompt] feature section, in order. First 4: Insert variable, Insert, Insert prompt block…
 * (Arman: "Block" and "Insert", local to this surface), Optimize with AI (system) — then under More:
 * the conditional sections, Add content block, role switch, full screen, clear, delete, Agent ›.
 */
export function agentPromptMenuSections(a: AgentPromptMenuArgs): ContextMenuExtraSection[] {
  const insertPrompt = a.insert;
  const variables: ContextMenuExtraItem[] = [
    ...a.variableNames.map((name) => item(`variable:${name}`, name, () => insertPrompt(variableInsert(name)))),
    ...(a.variableNames.length ? [{ kind: "separator" as const, id: "variable-sep" }] : []),
    item("new-variable", "New variable…", a.onNewVariable, { icon: Plus }),
  ];
  const contextItems: ContextMenuExtraItem[] = [
    ...a.contextItems.map((c) =>
      item(`context:${c.key}`, c.label || c.key, () => insertPrompt(contextReferenceInsert(c.key))),
    ),
    ...(a.contextItems.length ? [{ kind: "separator" as const, id: "context-sep" }] : []),
    item("add-context-item", "Add context item…", a.onAddContextItem, { icon: Plus }),
  ];
  const insertSection: ContextMenuExtraSection = {
    id: AGENT_PROMPT_SECTION.insert,
    anchor: "after-clipboard",
    items: [
      { kind: "submenu", id: "insert-variable", label: "Insert variable", icon: Braces, children: variables },
      {
        kind: "submenu",
        id: "insert",
        label: "Insert",
        icon: TextCursorInput,
        children: [
          {
            kind: "submenu",
            id: "section-tag",
            label: "Section tag",
            icon: LayoutTemplate,
            children: PROMPT_SECTION_TAGS.map((tag) => item(`tag:${tag}`, `<${tag}>`, () => insertPrompt(sectionInsert(tag)))),
          },
          item("example", "Example block", () => insertPrompt(exampleInsert()), { icon: ClipboardList }),
          { kind: "submenu", id: "context-item", label: "Context item", icon: Boxes, children: contextItems },
        ],
      },
    ],
  };
  const aiSection: ContextMenuExtraSection | null = a.onOptimize
    ? {
        id: AGENT_PROMPT_SECTION.ai,
        anchor: "after-clipboard",
        items: [item("optimize", "Optimize with AI", a.onOptimize, { icon: Webhook })],
      }
    : null;
  const edit: ContextMenuExtraItem[] = [];
  if (a.onAddContentBlock && a.contentBlockTypes?.length) {
    const add = a.onAddContentBlock;
    edit.push({
      kind: "submenu",
      id: "add-content-block",
      label: "Add content block",
      icon: Plus,
      children: a.contentBlockTypes.map((t) => item(`block:${t.type}`, t.label, () => add(t.type))),
    });
  }
  if (a.roleSwitch) {
    edit.push(item("switch-role", a.roleSwitch.to === "assistant" ? "Change to assistant" : "Change to user", a.roleSwitch.run, { icon: Repeat }));
  }
  if (a.onOpenFullScreenEditor) edit.push(item("full-screen", "Open full screen editor", a.onOpenFullScreenEditor, { icon: Maximize2 }));
  if (a.onClear) edit.push(item("clear", "Clear message", a.onClear, { icon: Eraser }));
  if (a.onDelete) edit.push(item("delete-message", "Delete message", a.onDelete, { icon: Trash2, destructive: true }));
  const agent = a.agent;
  const agentSection: ContextMenuExtraSection = {
    id: AGENT_PROMPT_SECTION.agent,
    anchor: "after-clipboard",
    items: [
      {
        kind: "submenu",
        id: "agent",
        label: "Agent",
        icon: Webhook,
        children: [
          item("test-run", "Test run", agent.openTestRun, { icon: Play }),
          item("agent-optimizer", "Optimize whole agent", agent.openAgentOptimizer, { icon: Atom }),
          item("run-history", "Run history", agent.openRunHistory, { icon: History }),
          { kind: "link", id: "versions", label: "All versions", icon: GitBranch, href: `/agents/${agent.agentId}/latest?tab=history` },
          item("agent-info", "Agent info", agent.openAgentInfo, { icon: Info }),
          item("advanced-settings", "Advanced settings", agent.openAdvancedSettings, { icon: Settings2 }),
        ],
      },
    ],
  };
  return [
    insertSection,
    ...a.blockSections,
    ...(aiSection ? [aiSection] : []),
    ...a.conditionalSections,
    ...(edit.length ? [{ id: AGENT_PROMPT_SECTION.edit, anchor: "after-clipboard" as const, items: edit }] : []),
    agentSection,
  ];
}
