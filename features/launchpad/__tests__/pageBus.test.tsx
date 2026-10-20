// THE PAGE BUS: a connection survives a save/reload round trip; only kind-compatible values can be connected;
// a removed widget takes its connections with it; a published value reaches exactly the bound input, shaped
// for it (`__kind` intact); and a publish re-renders ONLY the widgets wired to it — never the others.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { addWidget, compatibleSources, parseLaunchpadDoc, removeWidget, serializeLaunchpadDoc, setBinding, summarizeEdit, EMPTY_LAUNCHPAD_DOC } from "../doc";
import { canFeed, coercePageValue, parseBindings } from "../bus/ports";
import { createPageBus } from "../bus/store";
import { PageBusProvider, WidgetBusScope, useAppletPageValues, usePageInput, usePageOutput, type AppletPageValuesPort } from "../bus/react";
import type { LaunchpadDoc } from "@/features/shell/shell-layout/contract";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** table → tasks(filter), recent(notes) → app_page(record), plus an unconnected recent. */
function page(): LaunchpadDoc {
  let doc = EMPTY_LAUNCHPAD_DOC;
  doc = addWidget(doc, { type: "table", config: { tableId: "t1" }, id: "table" });
  doc = addWidget(doc, { type: "tasks", config: {}, id: "tasks" });
  doc = addWidget(doc, { type: "recent", config: { kind: "note" }, id: "notes" });
  doc = addWidget(doc, { type: "app_page", config: {}, id: "page" });
  doc = addWidget(doc, { type: "recent", config: { kind: "file" }, id: "files" });
  doc = setBinding(doc, { widgetId: "tasks", key: "filter" }, { widgetId: "table", key: "selected" });
  doc = setBinding(doc, { widgetId: "page", key: "record" }, { widgetId: "notes", key: "selected" });
  return doc;
}

describe("page bus — the doc", () => {
  it("round-trips bindings through save and reload; a doc without any stores exactly what it did", () => {
    const doc = page();
    expect(doc.bindings).toHaveLength(2);
    const again = parseLaunchpadDoc(serializeLaunchpadDoc(doc));
    expect(again.ok && again.doc.bindings).toEqual(doc.bindings);
    const plain = addWidget(EMPTY_LAUNCHPAD_DOC, { type: "tasks", config: {}, id: "a" });
    expect(JSON.parse(serializeLaunchpadDoc(plain))).not.toHaveProperty("bindings");
    expect(summarizeEdit(removeWidget(doc, "notes"), doc)).toContain("Connected widgets");
  });

  it("refuses a connection the ports cannot make, and keeps one connection per input", () => {
    const doc = page();
    // rows → text: incompatible kinds
    expect(setBinding(doc, { widgetId: "tasks", key: "filter" }, { widgetId: "table", key: "rows" })).toBe(doc);
    // a widget to itself, an unknown port
    expect(setBinding(doc, { widgetId: "notes", key: "search" }, { widgetId: "notes", key: "selected" })).toBe(doc);
    expect(setBinding(doc, { widgetId: "tasks", key: "nope" }, { widgetId: "table", key: "selected" })).toBe(doc);
    // re-pointing an input replaces its connection
    const moved = setBinding(doc, { widgetId: "tasks", key: "filter" }, { widgetId: "notes", key: "selected" });
    expect(moved.bindings?.filter((b) => b.to.widgetId === "tasks")).toEqual([
      { from: { widgetId: "notes", key: "selected" }, to: { widgetId: "tasks", key: "filter" } },
    ]);
    // disconnecting the last one drops the key entirely
    const none = setBinding(setBinding(doc, { widgetId: "tasks", key: "filter" }, null), { widgetId: "page", key: "record" }, null);
    expect(none.bindings).toBeUndefined();
  });

  it("removing a widget removes its connections; parse drops connections to widgets that are gone", () => {
    expect(removeWidget(page(), "table").bindings).toEqual([{ from: { widgetId: "notes", key: "selected" }, to: { widgetId: "page", key: "record" } }]);
    const stored = { ...page(), bindings: [...(page().bindings ?? []), { from: { widgetId: "ghost", key: "selected" }, to: { widgetId: "page", key: "x" } }] };
    expect(parseBindings(stored.bindings, new Set(stored.widgets.map((w) => w.id)))).toHaveLength(2);
  });

  it("offers only compatible values from other widgets in the Gets-from list", () => {
    const labels = compatibleSources(page(), { widgetId: "page", key: "record" }).map((s) => `${s.from.widgetId}.${s.from.key}`);
    expect(labels).toEqual(expect.arrayContaining(["table.selected", "tasks.selected", "notes.selected", "files.selected"]));
    expect(labels).not.toContain("table.rows");
    expect(labels).not.toContain("page.record");
  });
});

describe("page bus — kinds", () => {
  it("feeds a text input from a record's words, a file input from a file record, and keeps __kind", () => {
    expect(canFeed("record", "text")).toBe(true);
    expect(canFeed("rows", "text")).toBe(false);
    expect(coercePageValue({ token: "note", id: "n1", label: "Plan" }, "record", "text")).toBe("Plan");
    expect(coercePageValue({ token: "file", id: "f1", label: "a.pdf" }, "record", "file")).toEqual({ file_id: "f1", label: "a.pdf" });
    expect(coercePageValue({ token: "note", id: "n1", label: "Plan" }, "record", "file")).toBeUndefined();
    const kinded = { __kind: "flashcard_set", token: "x", id: "1", label: "Deck" };
    expect(coercePageValue(kinded, "record", "record")).toBe(kinded);
    expect(coercePageValue(null, "record", "text")).toBeUndefined();
  });

  it("the store notifies only one address's listeners and never for a value equal to the last", () => {
    const bus = createPageBus();
    const heard: string[] = [];
    bus.subscribe("a", "selected", () => heard.push("a"));
    bus.subscribe("b", "selected", () => heard.push("b"));
    bus.publish("a", "selected", { id: "1" });
    bus.publish("a", "selected", { id: "1" });
    bus.publish("a", "selected", null);
    expect(heard).toEqual(["a", "a"]);
  });
});

describe("page bus — in React", () => {
  it("a publish reaches the bound input and re-renders nobody else", () => {
    const doc = page();
    const renders: Record<string, number> = {};
    let pick: ((v: { token: string; id: string; label: string } | null) => void) | null = null;
    const count = (id: string) => (renders[id] = (renders[id] ?? 0) + 1);
    const seen: Record<string, unknown> = {};
    function TableBody() {
      count("table");
      const out = usePageOutput<{ token: string; id: string; label: string }>("selected");
      pick = out.publish;
      return null;
    }
    function TasksBody() {
      count("tasks");
      seen.tasks = usePageInput("filter", "text");
      return null;
    }
    function PageBody() {
      count("page");
      seen.page = usePageInput("record", "record");
      return null;
    }
    function FilesBody() {
      count("files");
      return null;
    }
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() =>
      root.render(
        <PageBusProvider busKey="test-pad" doc={doc}>
          <WidgetBusScope widgetId="table">
            <TableBody />
          </WidgetBusScope>
          <WidgetBusScope widgetId="tasks">
            <TasksBody />
          </WidgetBusScope>
          <WidgetBusScope widgetId="page">
            <PageBody />
          </WidgetBusScope>
          <WidgetBusScope widgetId="files">
            <FilesBody />
          </WidgetBusScope>
        </PageBusProvider>,
      ),
    );
    const before = { ...renders };
    act(() => pick!({ token: "record", id: "r1", label: "Acme renewal" }));
    expect(seen.tasks).toBe("Acme renewal");
    expect(seen.page).toBeUndefined();
    // Only the subscriber of table.selected redrew: the input it feeds, and the table itself (its own value).
    expect(renders.tasks).toBe(before.tasks! + 1);
    expect(renders.table).toBe(before.table! + 1);
    expect(renders.page).toBe(before.page);
    expect(renders.files).toBe(before.files);
    // The same value again redraws nobody.
    const after = { ...renders };
    act(() => pick!({ token: "record", id: "r1", label: "Acme renewal" }));
    expect(renders).toEqual(after);
    // The value lives for this tab's session: a fresh bus for the same launchpad reads it back.
    expect(createPageBus("test-pad").read("table", "selected")).toEqual({ token: "record", id: "r1", label: "Acme renewal" });
    act(() => root.unmount());
  });
});

describe("page bus — the Applet bridge", () => {
  it("an Applet reads its inputs, publishes its outputs, and reads its own outputs back after a reload", () => {
    let doc = EMPTY_LAUNCHPAD_DOC;
    doc = addWidget(doc, { type: "recent", config: { kind: "note" }, id: "notes" });
    doc = addWidget(doc, { type: "applet", config: { appId: "a1" }, id: "app" });
    doc = addWidget(doc, { type: "app_page", config: {}, id: "page" });
    doc = setBinding(doc, { widgetId: "app", key: "in_record" }, { widgetId: "notes", key: "selected" });
    doc = setBinding(doc, { widgetId: "page", key: "record" }, { widgetId: "app", key: "out_record" });
    const mount = () => {
      let port: AppletPageValuesPort | null = null;
      let pick: ((v: { token: string; id: string; label: string } | null) => void) | null = null;
      const seen: Record<string, unknown> = {};
      function Notes() {
        pick = usePageOutput<{ token: string; id: string; label: string }>("selected").publish;
        return null;
      }
      function Applet() {
        port = useAppletPageValues();
        return null;
      }
      function Page() {
        seen.page = usePageInput("record", "record");
        return null;
      }
      const host = document.createElement("div");
      const root = createRoot(host);
      act(() =>
        root.render(
          <PageBusProvider busKey="bridge-pad" doc={doc}>
            <WidgetBusScope widgetId="notes"><Notes /></WidgetBusScope>
            <WidgetBusScope widgetId="app"><Applet /></WidgetBusScope>
            <WidgetBusScope widgetId="page"><Page /></WidgetBusScope>
          </PageBusProvider>,
        ),
      );
      return { port: () => port!, pick: (v: { token: string; id: string; label: string }) => act(() => pick!(v)), seen, unmount: () => act(() => root.unmount()) };
    };
    const first = mount();
    const heard: string[] = [];
    first.port().subscribe((name) => heard.push(name));
    first.pick({ token: "note", id: "n1", label: "Plan" });
    expect(first.port().read("in_record")).toEqual({ token: "note", id: "n1", label: "Plan" });
    expect(heard).toContain("in_record");
    const fixed = { __kind: "note_ref", token: "note", id: "n2", label: "Photosynthesis" };
    act(() => first.port().publish("out_record", fixed));
    expect(first.seen.page).toEqual(fixed);
    // Not a published key of this widget: refused.
    act(() => first.port().publish("in_record", { token: "x", id: "y", label: "z" }));
    expect(first.port().read("in_record")).toEqual({ token: "note", id: "n1", label: "Plan" });
    first.unmount();
    // Reload: a fresh page in the same tab — the Applet reads back what it sent, as the page still shows it.
    const again = mount();
    expect(again.seen.page).toEqual(fixed);
    expect(again.port().read("out_record")).toEqual(fixed);
    expect(again.port().read("in_record")).toEqual({ token: "note", id: "n1", label: "Plan" });
    again.unmount();
  });
});
