/**
 * "CHANGE WITH AI" ON A LAYOUT APPLET (review LAYFIX finding 1, 2026-10-22): every migrated Applet is a stock
 * layout (no files, `layout_config` set), and reading one for the builder threw "The builder's Applet has no
 * App.tsx file." A layout Applet now opens as its one entry file; an answer that is still only a stock layout
 * stays a layout (written to `layout_config`, never as code); an answer that needs code becomes a code Applet.
 * The rows below are recorded from app.definition (new-fact-checker-app, engineering-doc-assistant).
 */
import { readBuilderApplet, saveBuiltApplet, type BuilderApplet } from "./build-applet";
import { layoutFromAnswer, layoutFromSource } from "./layout-code";
import { LAYOUT_ENTRY, layoutSource } from "./layout-source";

type Sent = Record<string, unknown>;

const FACT_CHECKER = {
  id: "a-fact",
  organization_id: "org-1",
  slug: "new-fact-checker-app",
  name: "New Fact Checker App",
  description: null,
  entry: null,
  files: {},
  pages: [],
  sources: [],
  mandates: [{ key: "app.new_fact_checker_app", alias: "main" }],
  layout_config: { job: "main", kind: "form_to_chat", options: { title: "New Fact Checker App", followUp: true, messageBox: true, submitLabel: "Start" } },
};

function readClient(row: unknown) {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: row, error: null }) };
  return { schema: () => ({ from: () => chain }) } as never;
}

function writeClient(sent: Sent[]) {
  const chain = {
    update: (content: Sent) => {
      sent.push(content);
      return chain;
    },
    eq: () => chain,
    select: () => chain,
    single: async () => ({ data: { id: "a-fact", slug: "new-fact-checker-app", name: "New Fact Checker App", description: null, status: "active", published_to_web: false, deleted_at: null, content_version: 2 }, error: null }),
  };
  return { schema: () => ({ from: () => chain }) } as never;
}

describe("a layout Applet in the builder", () => {
  it("opens as its layout: one entry file rendering the stored layout with its options (no throw)", async () => {
    const { applet } = await readBuilderApplet(readClient(FACT_CHECKER), "a-fact");
    expect(applet.entry).toBe(LAYOUT_ENTRY);
    expect(applet.files).toHaveLength(1);
    expect(applet.files[0]!.source).toContain("<FormToChatLayout job=\"main\" options={OPTIONS} />");
    expect(applet.files[0]!.source).toContain('"submitLabel": "Start"');
    expect(applet.pages).toEqual([{ path: "/", title: "New Fact Checker App", file: LAYOUT_ENTRY }]);
    expect(applet.mandates).toEqual(FACT_CHECKER.mandates);
    expect(applet.layout).toEqual(FACT_CHECKER.layout_config);
  });

  it("every stock layout reads back exactly from the file it is shown as", () => {
    for (const kind of ["form", "form_to_chat", "chat", "centered_input", "chat_with_history", "widget"] as const) {
      const layout = { kind, job: "main", options: { title: "T", suggestions: ["a", "b"], gate: { message: "Hi" }, compact: true } };
      expect(layoutFromSource(LAYOUT_ENTRY, layoutSource(layout))).toEqual(layout);
    }
    expect(layoutFromSource(LAYOUT_ENTRY, layoutSource({ kind: "chat", job: "main" }))).toEqual({ kind: "chat", job: "main" });
  });

  it("a change the builder writes as a layout (new title, a message box, JS-style keys) stays a layout", () => {
    const source = `import { FormLayout } from "@ai-matrx/applets/react";
export default function App() {
  return <FormLayout job="main" options={{ title: \`Fact Checker\`, messageBox: true, placeholder: "Paste a claim" }} />;
}`;
    const answer = { entry: "App.tsx", files: [{ name: "App.tsx", source }], sources: [], mandates: FACT_CHECKER.mandates };
    expect(layoutFromAnswer(answer)).toEqual({ kind: "form", job: "main", options: { title: "Fact Checker", messageBox: true, placeholder: "Paste a claim" } });
    expect(layoutFromSource("App.tsx", `import { StockLayout } from "@ai-matrx/applets/react";
const L = { kind: "chat", job: "main" };
export default function App() { return <StockLayout layout={L} />; }`)).toEqual({ kind: "chat", job: "main" });
  });

  it("an answer that needs code is code, never squeezed into a layout", () => {
    const withHook = `import { FormLayout, useRows } from "@ai-matrx/applets/react";
export default function App() { const r = useRows("x"); return <FormLayout job="main" />; }`;
    const withSlot = `import { ChatLayout } from "@ai-matrx/applets/react";
export default function App() { return <ChatLayout job="main" header={<b>Hi</b>} />; }`;
    const withComputed = `import { ChatLayout } from "@ai-matrx/applets/react";
const t = "A" + "B";
export default function App() { return <ChatLayout job="main" options={{ title: t }} />; }`;
    for (const source of [withHook, withSlot, withComputed]) expect(layoutFromSource("App.tsx", source)).toBeNull();
    const base = { entry: "App.tsx", files: [{ name: "App.tsx", source: layoutSource({ kind: "chat", job: "main" }) }], mandates: FACT_CHECKER.mandates };
    expect(layoutFromAnswer({ ...base, sources: [{ alias: "t", table_id: "x", organization_id: "o" }] })).toBeNull();
    expect(layoutFromAnswer({ ...base, files: [...base.files, { name: "shared.ts", source: "export const a = 1;" }], sources: [] })).toBeNull();
    // A job the record does not run is not this Applet's layout.
    expect(layoutFromAnswer({ ...base, sources: [], mandates: [{ alias: "other", key: "k" }] })).toBeNull();
  });

  it("an entry answered '(unchanged)' is the stored layout", async () => {
    const { applet: current } = await readBuilderApplet(readClient(FACT_CHECKER), "a-fact");
    const answer = { entry: "App.tsx", files: [{ name: "App.tsx", source: "(unchanged)" }], sources: [], mandates: FACT_CHECKER.mandates };
    expect(layoutFromAnswer(answer, current)).toEqual(FACT_CHECKER.layout_config);
  });

  it("saving a layout answer writes layout_config and its job — no files, no entry", async () => {
    const { applet: current } = await readBuilderApplet(readClient(FACT_CHECKER), "a-fact");
    const sent: Sent[] = [];
    const layout = { kind: "form" as const, job: "main", options: { title: "Fact Checker", messageBox: true } };
    const answer = { applet: { ...current, name: "Fact Checker", files: [{ name: "App.tsx", source: layoutSource(layout) }] }, note: "" };
    await saveBuiltApplet(writeClient(sent), { organizationId: "org-1", appletId: "a-fact", current, answer, request: "Rename it", conversationId: null, layout });
    expect(sent[0]).toEqual({ name: "Fact Checker", description: null, mandates: FACT_CHECKER.mandates, layout_config: layout });
  });

  it("saving a code answer for a layout Applet turns it into code and clears its layout", async () => {
    const { applet: current } = await readBuilderApplet(readClient(FACT_CHECKER), "a-fact");
    const sent: Sent[] = [];
    const code: BuilderApplet = { ...current, layout: undefined, files: [{ name: "App.tsx", source: "export default function App() { return null; }" }] };
    await saveBuiltApplet(writeClient(sent), { organizationId: "org-1", appletId: "a-fact", current, answer: { applet: code, note: "" }, request: "Add a table", conversationId: null, layout: null });
    expect(sent[0]).toMatchObject({ entry: "App.tsx", files: { "App.tsx": "export default function App() { return null; }" }, layout_config: {} });
  });
});
