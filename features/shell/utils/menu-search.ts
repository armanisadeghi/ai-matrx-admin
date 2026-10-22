// menu-search.ts — the desktop sidebar's "Search menu" index and ranker.
//
// Pure data, no React. The palette (SidebarMenuSearch → MenuSearchPalette)
// flattens every menu the viewer can open — the main nav tree, Settings and,
// for admins, the Administration cascade — into one list of destinations, each
// carrying its breadcrumb trail ("Data › Tables"), then ranks them per query.
//
// Ranking lives in the shared engine (frame/searchEngine.ts), re-exported below.

import type {
  ShellNavActionId,
  ShellNavChild,
  ShellNavItem,
  ShellNavPanelActionId,
} from "../constants/nav-data";
import type { SearchableEntry } from "../frame/searchEngine";

export interface MenuSearchEntry extends SearchableEntry {
  iconName: string;
  /** "shell" names resolve through ShellIcon; "dynamic" through IconResolver (admin catalog). */
  iconSource: "shell" | "dynamic";
  external?: boolean;
  openInNewTab?: boolean;
  action?: ShellNavActionId;
  panelAction?: ShellNavPanelActionId;
}

function entryKey(entry: Pick<MenuSearchEntry, "href" | "label" | "action" | "panelAction">): string {
  return `${entry.panelAction ?? entry.action ?? entry.href}::${entry.label.toLocaleLowerCase()}`;
}

function childToEntry(child: ShellNavChild, trail: string[]): MenuSearchEntry {
  return {
    id: entryKey(child),
    label: child.label,
    trail,
    description: child.description,
    href: child.href,
    iconName: child.iconName,
    iconSource: "shell",
    external: child.external,
    openInNewTab: child.openInNewTab,
    action: child.action,
    panelAction: child.panelAction,
    isCreate: Boolean(child.actionItem || child.action),
  };
}

/**
 * Flattens nav items (and their children, every level) into search entries.
 * A destination reachable from two places keeps its first (shallowest) home.
 */
export function buildMenuSearchIndex(
  items: readonly ShellNavItem[],
  extra: readonly MenuSearchEntry[] = [],
): MenuSearchEntry[] {
  const out: MenuSearchEntry[] = [];
  const seen = new Set<string>();
  const push = (entry: MenuSearchEntry) => {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    out.push(entry);
  };

  const visit = (children: readonly ShellNavChild[], trail: string[]) => {
    for (const child of children) {
      // A child that repeats its parent (the group's own landing row, e.g.
      // Settings › Settings) is the parent itself — skip the duplicate.
      const parentLabel = trail[trail.length - 1];
      if (!(parentLabel && child.label === parentLabel && !child.action && !child.panelAction)) {
        push(childToEntry(child, trail));
      }
      if (child.children?.length) visit(child.children, [...trail, child.label]);
    }
  };

  for (const item of items) {
    push({
      id: entryKey(item),
      label: item.label,
      trail: [],
      description: item.description,
      href: item.href,
      iconName: item.iconName,
      iconSource: "shell",
      external: item.external,
      openInNewTab: item.openInNewTab,
    });
    visit(item.children ?? [], [item.label]);
  }
  for (const entry of extra) push(entry);
  return out;
}

// The tokenizer, ranker and highlighter are the frame's shared engine (frame/searchEngine.ts).
export { highlightMenuMatch, rankMenuSearch, tokenizeMenuQuery } from "../frame/searchEngine";
