/**
 * The Microsoft 365 look's ribbon — a SECOND PRESENTATION of the editor's ONE command map.
 *
 * A ribbon layout is pure data: tabs → groups → controls, where each control names something that
 * already exists in the editor's model by id —
 *   - a toolbar item (`tb.bold`, `tb.font`, …) from the same `EditorToolbarItem[]` the Google
 *     toolbar draws,
 *   - a menu row (`view.freeze`, `data.filter`, …) from the same `EditorMenu[]` the Google menu
 *     bar draws (an action runs; a submenu opens as a dropdown),
 *   - a whole menu (`menu:help`) as one dropdown.
 * Nothing here runs anything itself, so the two looks cannot drift: `ribbonCoverage` proves every
 * command of the model is reachable from the ribbon (forcing test per editor).
 *
 * Pure (no React) so the mapping is testable with a fake editor host.
 */

import type { ComponentType } from "react";
import type {
  EditorMenu,
  EditorMenuAction,
  EditorMenuEntry,
  EditorMenuSubmenu,
} from "./editor-menu-model";
import type { EditorToolbarItem } from "./EditorToolbar";

type IconType = ComponentType<{ className?: string }>;

/**
 * - `large`: icon over a label, a whole column (Office's Paste, Freeze Panes).
 * - `small`: icon + label in a row, three stacked per column.
 * - `icon`: an icon (or value dropdown) in a row of tools (Office's Font group).
 */
export type RibbonSize = "large" | "small" | "icon";

export type RibbonControlSpec = {
  /** A toolbar item id, a menu entry id, or `menu:<menuId>` for a whole menu. */
  ref: string;
  size?: RibbonSize;
  /** Office's own word for the same command ("Freeze Panes" for Freeze). */
  label?: string;
  /** An icon for a row that has none in the model (a large control needs one). */
  icon?: IconType;
};

export type RibbonGroupSpec = {
  id: string;
  label: string;
  controls: Array<string | RibbonControlSpec>;
  /** Icon rows hold this many tools before wrapping to the next row (default 6). */
  perRow?: number;
};

export type RibbonTabSpec = { id: string; label: string; groups: RibbonGroupSpec[] };

export type ResolvedRibbonControl =
  | { kind: "toolbar"; key: string; size: RibbonSize; label?: string; icon?: IconType; item: Exclude<EditorToolbarItem, { kind: "separator" }> }
  | { kind: "action"; key: string; size: RibbonSize; label?: string; icon?: IconType; action: EditorMenuAction }
  | { kind: "submenu"; key: string; size: RibbonSize; label?: string; icon?: IconType; submenu: Pick<EditorMenuSubmenu, "id" | "label" | "icon" | "items"> };

export type ResolvedRibbonGroup = { id: string; label: string; perRow: number; controls: ResolvedRibbonControl[] };
export type ResolvedRibbonTab = { id: string; label: string; groups: ResolvedRibbonGroup[] };

type Indexed =
  | { kind: "toolbar"; item: Exclude<EditorToolbarItem, { kind: "separator" }> }
  | { kind: "action"; action: EditorMenuAction }
  | { kind: "submenu"; submenu: Pick<EditorMenuSubmenu, "id" | "label" | "icon" | "items"> };

/** Every addressable command of one editor: toolbar ids, menu entry ids, `menu:<id>`. */
export function indexCommands(menus: EditorMenu[], toolbar: EditorToolbarItem[]): Map<string, Indexed> {
  const out = new Map<string, Indexed>();
  const walk = (entries: EditorMenuEntry[]) => {
    for (const e of entries) {
      if (e.kind === "separator") continue;
      if (e.kind === "submenu") {
        if (!out.has(e.id)) out.set(e.id, { kind: "submenu", submenu: e });
        walk(e.items);
      } else if (!out.has(e.id)) out.set(e.id, { kind: "action", action: e });
    }
  };
  for (const m of menus) {
    out.set(`menu:${m.id}`, { kind: "submenu", submenu: { id: `menu:${m.id}`, label: m.label, items: m.items } });
    walk(m.items);
  }
  for (const t of toolbar) if (t.kind !== "separator") out.set(t.id, { kind: "toolbar", item: t });
  return out;
}

const spec = (c: string | RibbonControlSpec): RibbonControlSpec => (typeof c === "string" ? { ref: c } : c);

/**
 * The layout bound to the live model. A control whose id the model does not hold right now (a
 * row that exists only in some states, e.g. "Remove image") is left out; empty groups and tabs go.
 */
export function resolveRibbon(
  tabs: RibbonTabSpec[],
  menus: EditorMenu[],
  toolbar: EditorToolbarItem[],
): ResolvedRibbonTab[] {
  const index = indexCommands(menus, toolbar);
  const out: ResolvedRibbonTab[] = [];
  for (const tab of tabs) {
    const groups: ResolvedRibbonGroup[] = [];
    for (const g of tab.groups) {
      const controls: ResolvedRibbonControl[] = [];
      for (const raw of g.controls) {
        const c = spec(raw);
        const hit = index.get(c.ref);
        if (!hit) continue;
        const base = { key: `${tab.id}/${g.id}/${c.ref}`, size: c.size ?? "small", label: c.label, icon: c.icon };
        if (hit.kind === "toolbar") controls.push({ ...base, kind: "toolbar", item: hit.item });
        else if (hit.kind === "action") controls.push({ ...base, kind: "action", action: hit.action });
        else controls.push({ ...base, kind: "submenu", submenu: hit.submenu });
      }
      if (controls.length) groups.push({ id: g.id, label: g.label, perRow: g.perRow ?? 6, controls });
    }
    if (groups.length) out.push({ id: tab.id, label: tab.label, groups });
  }
  return out;
}

function actionIdsIn(entries: EditorMenuEntry[], into: Set<string>) {
  for (const e of entries) {
    if (e.kind === "separator") continue;
    if (e.kind === "submenu") actionIdsIn(e.items, into);
    else into.add(e.id);
  }
}

/**
 * What the ribbon can reach vs. what the model holds. `missingActions`: menu rows no ribbon
 * control leads to; `missingToolbar`: toolbar tools absent from the ribbon; `unknownRefs`: layout
 * ids the model does not have (a typo, or a renamed command).
 */
export function ribbonCoverage(tabs: RibbonTabSpec[], menus: EditorMenu[], toolbar: EditorToolbarItem[]) {
  const index = indexCommands(menus, toolbar);
  const reached = new Set<string>();
  const placedToolbar = new Set<string>();
  const unknownRefs: string[] = [];
  for (const tab of tabs)
    for (const g of tab.groups)
      for (const raw of g.controls) {
        const c = spec(raw);
        const hit = index.get(c.ref);
        if (!hit) {
          unknownRefs.push(c.ref);
          continue;
        }
        if (hit.kind === "action") reached.add(hit.action.id);
        else if (hit.kind === "submenu") actionIdsIn(hit.submenu.items, reached);
        else {
          placedToolbar.add(hit.item.id);
          if (hit.item.kind === "menu") actionIdsIn(hit.item.items, reached);
        }
      }
  const all = new Set<string>();
  for (const m of menus) actionIdsIn(m.items, all);
  // A toolbar button that is the same command as a reached menu row (same name or same shortcut —
  // Undo, ⌘K) is reachable through that row; it need not be placed twice.
  const flat: EditorMenuAction[] = [];
  const collect = (entries: EditorMenuEntry[]) => {
    for (const e of entries) {
      if (e.kind === "submenu") collect(e.items);
      else if (e.kind === "action") flat.push(e);
    }
  };
  for (const m of menus) collect(m.items);
  const reachedRows = flat.filter((a) => reached.has(a.id));
  const sameShortcut = (a?: EditorMenuAction["shortcut"], b?: EditorMenuAction["shortcut"]) =>
    !!a && !!b && a.key.toLowerCase() === b.key.toLowerCase() && !!a.mod === !!b.mod && !!a.shift === !!b.shift && !!a.alt === !!b.alt;
  const viaRow = (t: EditorToolbarItem) =>
    t.kind === "button" &&
    reachedRows.some((a) => a.label.toLowerCase() === t.label.toLowerCase() || sameShortcut(a.shortcut, t.shortcut));
  return {
    missingActions: [...all].filter((id) => !reached.has(id)),
    missingToolbar: toolbar
      .filter((t) => t.kind !== "separator" && t.kind !== "node" && !placedToolbar.has(t.id) && !viaRow(t))
      .map((t) => (t as { id: string }).id),
    unknownRefs,
  };
}
