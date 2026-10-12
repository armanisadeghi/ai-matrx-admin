import { flattenMenus, boundActions } from "@/components/editor-chrome/editor-menu-model";
import { buildDeckMenus, buildDeckToolbar, type DeckChromeHost } from "../deck-commands";
import type { DeckAction } from "../deck-model";

function fakeHost(over: Partial<DeckChromeHost> = {}) {
  const calls: DeckAction[] = [];
  const events: string[] = [];
  const host: DeckChromeHost = {
    canEdit: true,
    slideCount: 3,
    current: 1,
    currentLayout: "bullets",
    presetKey: "classic",
    presets: [
      { key: "classic", name: "Classic" },
      { key: "ocean", name: "Ocean" },
    ],
    canUndo: true,
    canRedo: false,
    notesShown: true,
    dispatch: (a) => calls.push(a),
    undo: () => events.push("undo"),
    redo: () => events.push("redo"),
    present: (fromStart) => events.push(fromStart ? "present-start" : "present"),
    toggleNotes: () => events.push("notes"),
    uploadImage: () => events.push("upload"),
    searchImage: () => events.push("search"),
    removeImage: () => events.push("remove-image"),
    hasImage: false,
    showShortcuts: () => events.push("shortcuts"),
    ...over,
  };
  return { host, calls, events };
}

const find = (host: DeckChromeHost, id: string) => {
  const hit = flattenMenus(buildDeckMenus(host)).find((a) => a.id === id);
  if (!hit) throw new Error(`no command ${id}`);
  return hit;
};

describe("presentation menu commands run the real deck actions", () => {
  it("menu bar is Google Slides' (minus Arrange/Format), File is the shared menu", () => {
    expect(buildDeckMenus(fakeHost().host).map((m) => m.label)).toEqual(["Edit", "View", "Insert", "Slide", "Help"]);
  });
  it.each([
    ["slide.new", { type: "addSlide", after: 1 }],
    ["slide.duplicate", { type: "duplicateSlide", index: 1 }],
    ["slide.delete", { type: "deleteSlide", index: 1 }],
    ["slide.move.up", { type: "moveSlide", from: 1, to: 0 }],
    ["slide.move.down", { type: "moveSlide", from: 1, to: 2 }],
    ["slide.move.start", { type: "moveSlide", from: 1, to: 0 }],
    ["slide.move.end", { type: "moveSlide", from: 1, to: 2 }],
    ["slide.layout.quote", { type: "setLayout", index: 1, layout: "quote" }],
    ["slide.theme.ocean", { type: "setPreset", preset: "ocean" }],
    ["insert.slide.stat", { type: "addSlide", after: 1, layout: "stat" }],
  ])("%s dispatches its action", (id, action) => {
    const { host, calls } = fakeHost();
    void find(host, id).run();
    expect(calls).toEqual([action]);
  });
  it("view and help rows reach the host", () => {
    const { host, events } = fakeHost();
    for (const id of ["view.present", "view.present-start", "view.notes", "insert.image.upload", "insert.image.search", "help.shortcuts", "edit.undo"]) {
      void find(host, id).run();
    }
    expect(events).toEqual(["present", "present-start", "notes", "upload", "search", "shortcuts", "undo"]);
  });
  it("a viewer can present but not edit", () => {
    const { host } = fakeHost({ canEdit: false });
    expect(find(host, "slide.new").disabled?.()).toBe(true);
    expect(find(host, "slide.theme.ocean").disabled?.()).toBe(true);
    expect(find(host, "view.present").disabled?.()).toBeFalsy();
  });
  it("move up is off on the first slide, redo off with no future", () => {
    expect(find(fakeHost({ current: 0 }).host, "slide.move.up").disabled?.()).toBe(true);
    expect(find(fakeHost().host, "edit.redo").disabled?.()).toBe(true);
  });
  it("binds Google Slides' shortcuts", () => {
    const keys = boundActions(buildDeckMenus(fakeHost().host)).map((a) => `${a.id}:${a.shortcut?.key}`);
    expect(keys).toEqual(expect.arrayContaining(["slide.new:m", "edit.duplicate:d", "view.present:Enter", "slide.move.up:ArrowUp", "edit.undo:z"]));
  });
  it("toolbar shows the current layout and theme by name", () => {
    const { host } = fakeHost();
    const items = buildDeckToolbar(host, buildDeckMenus(host));
    const texts = items.flatMap((i) => (i.kind === "menu" && i.text ? [i.text] : []));
    expect(texts).toEqual(["Title and body", "Classic"]);
  });
});
