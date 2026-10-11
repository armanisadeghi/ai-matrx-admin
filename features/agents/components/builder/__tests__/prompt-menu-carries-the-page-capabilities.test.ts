/**
 * THE AGENT BUILDER'S PROMPT MENU CARRIES THE PAGE'S OWN CAPABILITIES (Arman, 2026-10-11: "there are
 * SO MANY things this menu could do for this page … the most important feature of all, which is to
 * insert a variable"). The [Prompt] feature section's rows come from `agentPromptMenuSections`; the
 * designed menu draws them in order — the first 4 inline, the rest under More.
 *
 * Breaks it names:
 * - Insert variable / Insert / Block / Optimize leave the first four → "first four" goes red.
 * - a capability from the inventory is dropped (Agent ›, Add content block, Delete…) → "every row" goes red.
 * - Insert variable stops writing `{{name}}` at the right-clicked caret → "inserts at the caret" goes red.
 * - the package census mirror drifts from these rows → "census mirror" goes red (when the sibling checkout is present).
 */
import fs from "node:fs";
import path from "node:path";
import type { ContextMenuExtraItem, ContextMenuExtraSection } from "@ai-matrx/context-menu/engine";
import { insertIntoText, type PromptInsert } from "@ai-matrx/rich-editor/core/prompt-inserts";
import {
  agentPromptMenuSections,
  type AgentBuilderMenuActions,
  type AgentPromptMenuArgs,
} from "../message-builders/agentPromptMenu";

jest.mock("@ai-matrx/chat/host/window-openers", () => ({}));

const calls: string[] = [];
const agent: AgentBuilderMenuActions = {
  agentId: "agent-1",
  openAgentOptimizer: () => calls.push("agent-optimizer"),
  openTestRun: () => calls.push("test-run"),
  openRunHistory: () => calls.push("run-history"),
  openAgentInfo: () => calls.push("agent-info"),
  openAdvancedSettings: () => calls.push("advanced-settings"),
};

// What the hosts pass today (usePromptBlockEditing().menuSections, promptSectionSections).
const BLOCKS: ContextMenuExtraSection[] = [
  { id: "prompt-blocks", anchor: "after-clipboard", items: [{ kind: "item", id: "insert-prompt-block", label: "Insert prompt block…", onSelect: () => calls.push("block") }] },
];
const CONDITIONAL: ContextMenuExtraSection[] = [
  {
    id: "prompt-sections",
    items: (["filled", "empty"] as const).map((when) => ({
      kind: "submenu" as const,
      id: `section-when-${when}`,
      label: `Only include when ${when}`,
      children: [{ kind: "item" as const, id: `section-when-${when}-company`, label: "company", onSelect: () => undefined }],
    })),
  },
];

function args(over: Partial<AgentPromptMenuArgs> = {}): AgentPromptMenuArgs {
  return {
    variableNames: ["company", "audience"],
    contextItems: [{ key: "brand_voice", label: "Brand voice" }],
    insert: () => undefined,
    onNewVariable: () => calls.push("new-variable"),
    onAddContextItem: () => calls.push("add-context-item"),
    blockSections: BLOCKS,
    conditionalSections: CONDITIONAL,
    contentBlockTypes: [
      { type: "image", label: "Image" },
      { type: "document", label: "Document" },
    ],
    onAddContentBlock: (t) => calls.push(`block:${t}`),
    onOpenFullScreenEditor: () => calls.push("full-screen"),
    onClear: () => calls.push("clear"),
    agent,
    ...over,
  };
}

const SYSTEM = (over: Partial<AgentPromptMenuArgs> = {}) => args({ onOptimize: () => calls.push("optimize"), ...over });
const MESSAGE = (over: Partial<AgentPromptMenuArgs> = {}) =>
  args({ roleSwitch: { to: "assistant", run: () => calls.push("switch-role") }, onDelete: () => calls.push("delete"), ...over });

/** The feature section's rows, in order (one row per section item — the engine's row key). */
const rowKeys = (sections: ContextMenuExtraSection[]) => sections.flatMap((s) => s.items.filter((i) => i.kind !== "separator").map((i) => `extra:${s.id}/${i.id}`));

/** id/label skeleton: what a census needs to place every row (no handlers). */
type Skel = { kind: string; id: string; label?: string; children?: Skel[] };
const skelItem = (i: ContextMenuExtraItem): Skel =>
  i.kind === "submenu" ? { kind: i.kind, id: i.id, label: i.label, children: i.children.map(skelItem) } : i.kind === "separator" ? { kind: i.kind, id: i.id } : { kind: i.kind, id: i.id, label: i.label };
const skeleton = (sections: ContextMenuExtraSection[]) => sections.map((s) => ({ id: s.id, items: s.items.map(skelItem) }));

function find(sections: ContextMenuExtraSection[], ...ids: string[]): ContextMenuExtraItem {
  let items: ContextMenuExtraItem[] = sections.flatMap((s) => s.items);
  let hit: ContextMenuExtraItem | undefined;
  for (const id of ids) {
    hit = items.find((i) => i.id === id);
    if (!hit) throw new Error(`no row ${ids.join(" › ")}`);
    items = hit.kind === "submenu" ? hit.children : [];
  }
  return hit as ContextMenuExtraItem;
}
const run = (i: ContextMenuExtraItem) => {
  if (i.kind !== "item") throw new Error(`${i.id} is not a clickable item`);
  i.onSelect();
};

beforeEach(() => calls.splice(0));

describe("the agent builder's [Prompt] feature section", () => {
  it("first four: Insert variable, Insert, Block, Optimize with AI (system message)", () => {
    expect(rowKeys(agentPromptMenuSections(SYSTEM())).slice(0, 4)).toEqual([
      "extra:agent-prompt-insert/insert-variable",
      "extra:agent-prompt-insert/insert",
      "extra:prompt-blocks/insert-prompt-block",
      "extra:agent-prompt-ai/optimize",
    ]);
  });

  it("every row from the inventory is present, and each runs its handler", () => {
    const sys = agentPromptMenuSections(SYSTEM());
    expect(rowKeys(sys)).toEqual([
      "extra:agent-prompt-insert/insert-variable",
      "extra:agent-prompt-insert/insert",
      "extra:prompt-blocks/insert-prompt-block",
      "extra:agent-prompt-ai/optimize",
      "extra:prompt-sections/section-when-filled",
      "extra:prompt-sections/section-when-empty",
      "extra:agent-prompt-edit/add-content-block",
      "extra:agent-prompt-edit/full-screen",
      "extra:agent-prompt-edit/clear",
      "extra:agent-prompt-agent/agent",
    ]);
    run(find(sys, "insert-variable", "new-variable"));
    run(find(sys, "insert-prompt-block"));
    run(find(sys, "optimize"));
    run(find(sys, "add-content-block", "block:image"));
    run(find(sys, "insert", "context-item", "add-context-item"));
    for (const id of ["test-run", "agent-optimizer", "run-history", "agent-info", "advanced-settings"]) run(find(sys, "agent", id));
    expect(find(sys, "agent", "versions")).toMatchObject({ kind: "link", href: "/agents/agent-1/latest?tab=history" });
    expect(calls).toEqual(["new-variable", "block", "optimize", "block:image", "add-context-item", "test-run", "agent-optimizer", "run-history", "agent-info", "advanced-settings"]);

    const msg = agentPromptMenuSections(MESSAGE());
    expect(rowKeys(msg).slice(0, 4)).toEqual([
      "extra:agent-prompt-insert/insert-variable",
      "extra:agent-prompt-insert/insert",
      "extra:prompt-blocks/insert-prompt-block",
      "extra:prompt-sections/section-when-filled",
    ]);
    expect(rowKeys(msg)).toContain("extra:agent-prompt-edit/switch-role");
    expect(find(msg, "delete-message")).toMatchObject({ destructive: true });
    expect(rowKeys(msg)).not.toContain("extra:agent-prompt-ai/optimize");
  });

  it("Insert variable inserts {{name}} at the right-clicked caret; Insert writes tags, examples and context references", () => {
    const inserted: PromptInsert[] = [];
    const sys = agentPromptMenuSections(SYSTEM({ insert: (i) => inserted.push(i) }));
    run(find(sys, "insert-variable", "variable:company"));
    run(find(sys, "insert", "section-tag", "tag:instructions"));
    run(find(sys, "insert", "example"));
    run(find(sys, "insert", "context-item", "context:brand_voice"));
    expect(inserted.map((i) => i.text)).toEqual([
      "{{company}}",
      "<instructions>\n\n</instructions>",
      "<example>\n<input>\n\n</input>\n<output>\n\n</output>\n</example>",
      '`ctx_get("brand_voice")`',
    ]);
    // The hosts hand the insert to insertPromptText → insertIntoText at the caret saved on open.
    expect(insertIntoText("Write for  today.", 10, 10, inserted[0]).text).toBe("Write for {{company}} today.");
  });

  it("no variables yet: Insert variable still offers New variable…", () => {
    const sys = agentPromptMenuSections(SYSTEM({ variableNames: [] }));
    const sub = find(sys, "insert-variable");
    expect(sub.kind === "submenu" && sub.children.map((c) => c.id)).toEqual(["new-variable"]);
  });

  it("census mirror: the context-menu package's agent-builder rows are these rows", () => {
    const mirror = path.resolve(__dirname, "../../../../../../aidream/apps/shared/context-menu/src/designed/__tests__/census/agent-builder-prompt-sections.json");
    const computed = { system: skeleton(agentPromptMenuSections(SYSTEM())), message: skeleton(agentPromptMenuSections(MESSAGE())) };
    if (process.env.WRITE_PROMPT_MENU_CENSUS === "1") fs.writeFileSync(mirror, `${JSON.stringify(computed, null, 1)}\n`);
    if (!fs.existsSync(mirror)) return; // a checkout without the sibling aidream repo
    expect(JSON.parse(fs.readFileSync(mirror, "utf8"))).toEqual(computed);
  });
});
