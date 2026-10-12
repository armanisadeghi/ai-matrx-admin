/**
 * ONE COMMAND MAP, TWO PRESENTATIONS. The Microsoft 365 ribbon of each editor reaches every menu
 * row and every toolbar tool of the Google look, names nothing the model lacks, and running a
 * ribbon control runs the very same row object the menu bar runs.
 */
import { buildSheetMenus, buildSheetToolbar, type SheetChromeHost } from "@/features/workbooks/chrome/sheet-commands";
import { buildDocMenus, buildDocToolbar, type DocChromeHost } from "@/features/documents/chrome/doc-commands";
import { buildDeckMenus, buildDeckToolbar, type DeckChromeHost } from "@/features/presentations/deck-commands";
import { SHEET_RIBBON } from "@/features/workbooks/chrome/sheet-ribbon";
import { DOC_RIBBON } from "@/features/documents/chrome/doc-ribbon";
import { DECK_RIBBON } from "@/features/presentations/deck-ribbon";
import { flattenMenus, type EditorMenu } from "../editor-menu-model";
import type { EditorToolbarItem } from "../EditorToolbar";
import { resolveRibbon, ribbonCoverage, type RibbonTabSpec } from "../ribbon-model";

/** A host that answers anything (an editor API we never call here): every read is callable. */
function anything(): never {
  const fn = function () {} as unknown as object;
  const proxy: unknown = new Proxy(fn, {
    get: (_t, p) => {
      if (p === Symbol.toPrimitive) return () => 1;
      if (p === Symbol.iterator) return function* () {};
      if (p === "then") return undefined;
      return proxy;
    },
    apply: () => proxy,
  });
  return proxy as never;
}

function sheetHost(): SheetChromeHost {
  return {
    api: anything(),
    editable: true,
    print: () => {},
    formulaBarVisible: () => true,
    toggleFormulaBar: () => {},
    fullScreen: () => false,
    toggleFullScreen: () => {},
    notify: () => {},
  } as SheetChromeHost;
}

function docHost(): DocChromeHost {
  return new Proxy({ editable: true } as Record<string, unknown>, {
    get: (t, p) => (p in t ? t[p as string] : (anything() as unknown)),
  }) as unknown as DocChromeHost;
}

function deckHost(): DeckChromeHost {
  const noop = () => {};
  return {
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
    canRedo: true,
    notesShown: true,
    dispatch: noop,
    undo: noop,
    redo: noop,
    present: noop,
    toggleNotes: noop,
    uploadImage: noop,
    searchImage: noop,
    removeImage: noop,
    hasImage: true,
    showShortcuts: noop,
  } as DeckChromeHost;
}

const editors: Array<[string, RibbonTabSpec[], () => { menus: EditorMenu[]; toolbar: EditorToolbarItem[] }]> = [
  ["workbook", SHEET_RIBBON, () => {
    const h = sheetHost();
    return { menus: buildSheetMenus(h), toolbar: buildSheetToolbar(h) };
  }],
  ["document", DOC_RIBBON, () => {
    const h = docHost();
    return { menus: buildDocMenus(h), toolbar: buildDocToolbar(h) };
  }],
  ["presentation", DECK_RIBBON, () => {
    const h = deckHost();
    const menus = buildDeckMenus(h);
    return { menus, toolbar: buildDeckToolbar(h, menus) };
  }],
];

describe.each(editors)("%s ribbon", (_name, ribbon, build) => {
  it("reaches every menu row and every toolbar tool, and names nothing the model lacks", () => {
    const { menus, toolbar } = build();
    expect(flattenMenus(menus).length).toBeGreaterThan(5);
    expect(ribbonCoverage(ribbon, menus, toolbar)).toEqual({ missingActions: [], missingToolbar: [], unknownRefs: [] });
  });

  it("starts on Home and every tab has a group", () => {
    const { menus, toolbar } = build();
    const tabs = resolveRibbon(ribbon, menus, toolbar);
    expect(tabs[0]?.id).toBe("home");
    expect(tabs.map((t) => t.id)).toEqual(ribbon.map((t) => t.id));
    for (const t of tabs) expect(t.groups.length).toBeGreaterThan(0);
  });

  it("a ribbon action IS the menu bar's row (same run, same gate)", () => {
    const { menus, toolbar } = build();
    const rows = new Map(flattenMenus(menus).map((a) => [a.id, a]));
    const actions = resolveRibbon(ribbon, menus, toolbar).flatMap((t) => t.groups.flatMap((g) => g.controls)).filter((c) => c.kind === "action");
    expect(actions.length).toBeGreaterThan(0);
    for (const c of actions) {
      if (c.kind !== "action") continue;
      expect(c.action.run).toBe(rows.get(c.action.id)?.run);
    }
  });
});

it("a renamed command is caught (the guard can fail)", () => {
  const h = deckHost();
  const menus = buildDeckMenus(h);
  const broken: RibbonTabSpec[] = [{ id: "home", label: "Home", groups: [{ id: "g", label: "G", controls: ["slide.newer"] }] }];
  const cov = ribbonCoverage(broken, menus, buildDeckToolbar(h, menus));
  expect(cov.unknownRefs).toEqual(["slide.newer"]);
  expect(cov.missingActions.length).toBeGreaterThan(0);
});
