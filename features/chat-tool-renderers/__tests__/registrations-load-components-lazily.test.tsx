/**
 * The chat surface registrations are on every page's first load (`providers/ChatSurfaceRegistrations`
 * → app/Providers). On 2026-10-13 their STATIC component imports dragged the dataset table, the task
 * editor (→ EntityCustomFields) and the records answer table (→ records-ui, recharts, the data table)
 * onto every page — ~1.45 MB on its own (lane S3).
 *
 * Fails when:
 *  - a registration module statically imports a renderer / drawer-body component again (the
 *    graph half: read from the files' own import statements);
 *  - a lazily registered renderer stops drawing ITS component after the chunk loads, or shows a
 *    blank while loading (the behaviour half: the real registration modules, the impl modules
 *    stood in by named stubs so the test sees which one drew).
 */
import { describe, expect, it, jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function stub(name: string) {
  function Stub() {
    return <div data-testid={`impl:${name}`} />;
  }
  return Stub;
}

jest.mock("@/features/chat-tool-renderers/toolRendererImpls", () => {
  const names = [
    "SeoInline", "SeoOverlay", "PickListInline", "PickListOverlay", "TaskInline", "TaskOverlay",
    "TaskListInline", "DocumentInline", "DocumentOverlay", "DatasetInline", "DatasetOverlay",
    "KnowledgeSearchInline", "KnowledgeSearchOverlay", "DocumentSearchInline", "KnowledgeBrowseInline",
    "DocumentContentInline", "NoteToolInline", "NoteToolOverlay", "TopicalMapInline",
    "RecordsAnswerBody", "RefusalLine",
  ];
  return Object.fromEntries(names.map((n) => [n, stub(n)]));
});
jest.mock("@/features/chat-context-bodies/contextBodiesImpl", () => ({
  NoteBody: stub("NoteBody"),
  NoteFooter: stub("NoteFooter"),
  NoteTitleActions: stub("NoteTitleActions"),
  TaskBody: stub("TaskBody"),
}));

import "@/features/chat-tool-renderers/registerFeatureToolRenderers";
import "@/features/chat-context-bodies/registerContextBodies";
import "@/features/records-tool-display/registerDataToolRenderers";
import { getInlineRenderer, getOverlayRenderer } from "@ai-matrx/chat/tool-call-visualization/registry/registry";
import { hostSlot } from "@ai-matrx/chat/host/ui-slots";
import type { ToolRendererProps } from "@ai-matrx/chat/tool-call-visualization/types";

const ROOT = join(__dirname, "..", "..", "..");

/** Mount, and report what is on screen before and after the lazy chunk resolves. */
async function draw(el: ReactElement): Promise<{ before: string; after: string }> {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(el));
  const before = container.innerHTML;
  for (let i = 0; i < 8; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  const after = container.innerHTML;
  act(() => root.unmount());
  return { before, after };
}
const drew = (html: string, name: string) => html.includes(`data-testid="impl:${name}"`);

/** Every value (non-type) import specifier a module states. */
function staticImports(file: string): string[] {
  const src = readFileSync(join(ROOT, file), "utf8");
  const out: string[] = [];
  for (const m of src.matchAll(/^import\s+(?!type\b)([^;]*?\s+from\s+)?["']([^"']+)["']/gm)) out.push(m[2]!);
  return out;
}

const REGISTRATION_FILES = [
  "providers/ChatSurfaceRegistrations.tsx",
  "features/chat-tool-renderers/registerFeatureToolRenderers.tsx",
  "features/chat-tool-renderers/lazyToolRenderer.tsx",
  "features/records-tool-display/registerDataToolRenderers.tsx",
  "features/records-tool-display/answerRenderer.tsx",
  "features/chat-context-bodies/registerContextBodies.tsx",
];

/** Light readers a descriptor may use; every other module under `renderers/` is a component. */
const LIGHT_RENDERER_HELPERS = [
  "./renderers/seo/resolve",
  "./renderers/topical-map/topicalMapResult",
  "./renderers/document-content/documentContentView",
];

/** An app module (never a package's own light helpers, e.g. the chat `renderers/_shared`). */
const COMPONENT_MODULE = /^(\.|@\/).*(\/renderers\/|RecordsAnswerView|\/NoteBody$|\/TaskBody$|toolRendererImpls|contextBodiesImpl)/;

function entry(over: Record<string, unknown>): ToolRendererProps {
  return {
    entry: { callId: "c1", toolName: "table", status: "completed", arguments: {}, errorMessage: null, ...over },
  } as unknown as ToolRendererProps;
}

describe("the chat surface registrations keep components off the first load", () => {
  it("no registration module imports a component statically", () => {
    const offenders = REGISTRATION_FILES.flatMap((file) =>
      staticImports(file)
        .filter((spec) => COMPONENT_MODULE.test(spec) && !LIGHT_RENDERER_HELPERS.includes(spec))
        .map((spec) => `${file} -> ${spec}`),
    );
    expect(offenders).toEqual([]);
  });

  it("a plant is caught: a static renderer import is named", () => {
    const planted = 'import { DatasetOverlay } from "./renderers/dataset/DatasetOverlay";';
    const spec = /from\s+["']([^"']+)["']/.exec(planted)![1]!;
    expect(COMPONENT_MODULE.test(spec) && !LIGHT_RENDERER_HELPERS.includes(spec)).toBe(true);
  });
});

describe("a lazily registered component draws the right body after its chunk loads", () => {
  it("the task tool shows a skeleton, then TaskInline (inline) and TaskOverlay (overlay)", async () => {
    const Inline = getInlineRenderer("task");
    const inline = await draw(<Inline {...entry({ toolName: "task", result: { title: "Call the lab" } })} />);
    expect(inline.before).toContain('aria-label="Loading the result"');
    expect(drew(inline.after, "TaskInline")).toBe(true);
    const Overlay = getOverlayRenderer("task");
    expect(drew((await draw(<Overlay {...entry({ toolName: "task" })} />)).after, "TaskOverlay")).toBe(true);
  });

  it("a records answer with rows draws RecordsAnswerBody; one it cannot read draws the dataset renderer", async () => {
    const Table = getInlineRenderer("table");
    const rows = await draw(
      <Table
        {...entry({
          result: { action: "record_read", table_id: "4d8d6979-35b1-4d09-825e-2cfd987a9ec3", records: [{ record_id: "r1", values: { item: "Gel" } }], count: 1 },
        })}
      />,
    );
    expect(drew(rows.after, "RecordsAnswerBody")).toBe(true);
    const other = await draw(<Table {...entry({ result: { something: "else" } })} />);
    expect(drew(other.after, "DatasetInline")).toBe(true);
  });

  it("a refused data-tool call draws RefusalLine", async () => {
    const Table = getInlineRenderer("table");
    const refused = await draw(<Table {...entry({ status: "error", errorMessage: "No rights" })} />);
    expect(drew(refused.after, "RefusalLine")).toBe(true);
  });

  it("the note drawer body shows a skeleton, then NoteBody; the task drawer draws TaskBody", async () => {
    const NoteBody = hostSlot("NoteBody");
    const note = await draw(<NoteBody item={{}} setTitle={() => undefined} />);
    expect(note.before).toContain('aria-label="Loading"');
    expect(drew(note.after, "NoteBody")).toBe(true);
    const TaskBody = hostSlot("TaskBody");
    expect(drew((await draw(<TaskBody item={{}} setTitle={() => undefined} />)).after, "TaskBody")).toBe(true);
  });
});
