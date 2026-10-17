/**
 * REVIEW-2 D1 (2026-10-17): a database block's blue "New ▾" listed only "Empty page", though the table carried
 * row templates ("Weekly 1:1", "Bug report", one default). Now the chevron lists them (the default marked), a
 * pick makes the row with that template's values and its page with that template's body, plain New starts from
 * the default, and "Empty page" makes a bare row whose page is empty (so the default never lands on it later).
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

import type { RowPageDb } from "../../embed/row-page";
import { NewButton } from "../menu-parts";
import { newRowData, readRowTemplates, startNewRow, templateFor, type NewRowPick, type RowTemplateChoice } from "../row-templates";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ONE_ON_ONE = { v: 1, blocks: [{ type: "heading", props: { level: 2 }, text: [{ text: "Agenda" }] }, { type: "todo", props: {}, text: [{ text: "Wins this week" }] }] };
const BUG = { v: 1, blocks: [{ type: "heading", props: { level: 2 }, text: [{ text: "Steps to reproduce" }] }] };

function fakeDb() {
  const calls: Array<{ schema: string; fn: string; args: Record<string, unknown> }> = [];
  const db: RowPageDb = {
    schema: (schema) => ({
      rpc: (async (fn: string, args: Record<string, unknown>) => {
        calls.push({ schema, fn, args });
        if (fn === "row_templates")
          return {
            data: [
              { template_id: "t-bug", name: "Bug report", values: { kind: "Bug" } },
              { template_id: "t-1on1", name: "Weekly 1:1", values: { status: "Scheduled" } },
            ],
            error: null,
          };
        if (fn === "row_template_bodies") return { data: [{ template_id: "t-bug", body: BUG }, { template_id: "t-1on1", body: ONE_ON_ONE }], error: null };
        if (fn === "row_template_default") return { data: [{ template_id: "t-1on1", name: "Weekly 1:1", values: {}, body: ONE_ON_ONE }], error: null };
        if (fn === "row_page_ensure") return { data: [{ space_id: "space-new", created: true }], error: null };
        return { data: null, error: { message: `unexpected ${schema}.${fn}` } };
      }) as never,
    }),
  };
  return { db, calls };
}

describe("the New menu's data", () => {
  it("lists every row template with its body, the default marked", async () => {
    const { db } = fakeDb();
    const list = await readRowTemplates(db, "org", "table");
    expect(list.map((t) => [t.name, t.isDefault])).toEqual([
      ["Bug report", false],
      ["Weekly 1:1", true],
    ]);
    expect(list[1].body?.blocks).toHaveLength(2);
    expect(list[0].values).toEqual({ kind: "Bug" });
  });

  it("plain New picks the default, a pick picks itself, Empty page picks nothing", async () => {
    const { db } = fakeDb();
    const list = await readRowTemplates(db, "org", "table");
    expect(templateFor({ kind: "default" }, list)?.name).toBe("Weekly 1:1");
    expect(templateFor({ kind: "template", id: "t-bug" }, list)?.name).toBe("Bug report");
    expect(templateFor({ kind: "empty" }, list)).toBeNull();
    expect(templateFor({ kind: "default" }, list.map((t) => ({ ...t, isDefault: false })))).toBeNull();
    // A "This page's row" link from the view wins over a preset.
    expect(newRowData(list[1], { client: ["row-9"] })).toEqual({ status: "Scheduled", client: ["row-9"] });
  });

  it("a picked template's values go on the row and ITS body (fresh ids) on the row's page — not the default's", async () => {
    const { db, calls } = fakeDb();
    const list = await readRowTemplates(db, "org", "table");
    calls.length = 0;
    const written: Array<Record<string, unknown>> = [];
    const pages: string[] = [];
    const out = await startNewRow(db, {
      organizationId: "org",
      tableId: "table",
      template: templateFor({ kind: "template", id: "t-bug" }, list),
      viewValues: {},
      writeRow: async (data) => (written.push(data), { ok: true, id: "row-new" }),
      onPage: (spaceId) => pages.push(spaceId),
    });
    expect(out).toEqual({ ok: true, recordId: "row-new" });
    expect(written).toEqual([{ kind: "Bug" }]);
    expect(pages).toEqual(["space-new"]);
    const ensure = calls.find((c) => c.fn === "row_page_ensure");
    const blocks = (ensure?.args.p_snapshot as { blocks: Array<{ id?: string; text: Array<{ text: string }> }> }).blocks;
    expect(blocks.map((b) => b.text[0].text)).toEqual(["Steps to reproduce"]);
    expect(typeof blocks[0].id).toBe("string");
    // The chosen body is used as is: the default template is not read again.
    expect(calls.some((c) => c.fn === "row_template_default")).toBe(false);
  });

  it("Empty page makes a bare row with an empty page", async () => {
    const { db, calls } = fakeDb();
    const written: Array<Record<string, unknown>> = [];
    await startNewRow(db, { organizationId: "org", tableId: "table", template: null, viewValues: {}, writeRow: async (data) => (written.push(data), { ok: true, id: "row-bare" }) });
    expect(written).toEqual([{}]);
    expect((calls.find((c) => c.fn === "row_page_ensure")?.args.p_snapshot as { blocks: unknown[] }).blocks).toEqual([]);
  });
});

describe("the New button's chevron", () => {
  const templates: RowTemplateChoice[] = [
    { id: "t-bug", name: "Bug report", values: {}, body: null, isDefault: false },
    { id: "t-1on1", name: "Weekly 1:1", values: {}, body: null, isDefault: true },
  ];
  const mount = (props: Partial<Parameters<typeof NewButton>[0]>) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const picks: Array<NewRowPick | undefined> = [];
    act(() => root.render(<NewButton onNew={(p) => picks.push(p)} {...props} />));
    return { picks, root, host };
  };
  const rowNamed = (label: string) => [...document.querySelectorAll<HTMLElement>(".spaces-db-menurow")].find((r) => r.textContent?.includes(label));

  it("lists the table's templates with the default marked, and a pick reaches onNew", async () => {
    const { picks, root } = mount({ loadTemplates: async () => templates, onSetDefault: async () => undefined });
    await act(async () => document.querySelector<HTMLElement>('[aria-label="Templates"]')!.click());
    expect(rowNamed("Weekly 1:1")?.textContent).toContain("Default");
    expect(rowNamed("Bug report")?.textContent).toContain("Set as default");
    expect(rowNamed("Empty page")).toBeDefined();
    act(() => rowNamed("Bug report")!.click());
    expect(picks).toEqual([{ kind: "template", id: "t-bug" }]);
    act(() => root.unmount());
  });

  it("is closed, with its reason, in the in-memory preview (no dead click)", () => {
    const { root } = mount({ templatesOff: "Templates open once this template is in your workspace" });
    const chevron = document.querySelector<HTMLButtonElement>('[aria-label="Templates"]')!;
    expect(chevron.disabled).toBe(true);
    expect(chevron.title).toContain("Templates open");
    act(() => root.unmount());
  });
});
