// menu-search.ts — the desktop sidebar's "Search menu" index and ranker.
//
// Pure data, no React. The palette (SidebarMenuSearch → MenuSearchPalette)
// flattens every menu the viewer can open — the main nav tree, Settings and,
// for admins, the Administration cascade — into one list of destinations, each
// carrying its breadcrumb trail ("Data › Tables"), then ranks them per query.
//
// Ranking is token-based: every word of the query must appear somewhere in the
// entry (label, trail, description or href). A hit in the label outranks a hit
// in the trail, which outranks the description/href; a whole-label or
// label-prefix hit gets a large bonus so "notes" puts Notes above "Note
// templates". Shallower entries win ties.

import type {
  ShellNavActionId,
  ShellNavChild,
  ShellNavItem,
  ShellNavPanelActionId,
} from "../constants/nav-data";

export interface MenuSearchEntry {
  /** Stable key: identity of the destination or action. */
  id: string;
  label: string;
  /** Ancestor labels, outermost first ("Data", "Tables"). Empty for a top-level row. */
  trail: string[];
  description?: string;
  href: string;
  iconName: string;
  /** "shell" names resolve through ShellIcon; "dynamic" through IconResolver (admin catalog). */
  iconSource: "shell" | "dynamic";
  external?: boolean;
  openInNewTab?: boolean;
  action?: ShellNavActionId;
  panelAction?: ShellNavPanelActionId;
  /** A create/add affordance rather than a place. */
  isCreate?: boolean;
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

export function tokenizeMenuQuery(query: string): string[] {
  return query
    .toLocaleLowerCase()
    .split(/[\s›>/·,]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

/** True when `token` starts a word inside `text` (both lower-cased). */
function startsWord(text: string, token: string): boolean {
  let index = text.indexOf(token);
  while (index !== -1) {
    if (index === 0 || /[^a-z0-9]/.test(text[index - 1])) return true;
    index = text.indexOf(token, index + 1);
  }
  return false;
}

/** Letters of `token` appear in order in `text` (typo-tolerant fallback). */
function isSubsequence(text: string, token: string): boolean {
  let at = 0;
  for (const ch of text) {
    if (ch === token[at]) at += 1;
    if (at === token.length) return true;
  }
  return false;
}

function scoreEntry(entry: MenuSearchEntry, tokens: string[], phrase: string, fuzzy: boolean): number {
  const label = entry.label.toLocaleLowerCase();
  const trail = entry.trail.join(" ").toLocaleLowerCase();
  const rest = `${entry.description ?? ""} ${entry.href}`.toLocaleLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (label === token) score += 100;
    else if (label.startsWith(token)) score += 80;
    else if (startsWord(label, token)) score += 60;
    else if (label.includes(token)) score += 40;
    else if (startsWord(trail, token)) score += 25;
    else if (trail.includes(token)) score += 15;
    else if (rest.includes(token)) score += 8;
    else if (fuzzy && token.length >= 3 && isSubsequence(label, token)) score += 5;
    else return 0;
  }
  if (label === phrase) score += 120;
  else if (label.startsWith(phrase)) score += 60;
  // Shallower entries and places (over create actions) win ties.
  score -= entry.trail.length * 3;
  if (entry.isCreate) score -= 4;
  return score;
}

/**
 * Ranked matches for `query`. Falls back to typo-tolerant (in-order letters)
 * matching on the label only when the strict pass finds nothing.
 */
export function rankMenuSearch(
  entries: readonly MenuSearchEntry[],
  query: string,
  limit = 60,
): MenuSearchEntry[] {
  const tokens = tokenizeMenuQuery(query);
  if (!tokens.length) return [];
  const phrase = tokens.join(" ");

  const run = (fuzzy: boolean) =>
    entries
      .map((entry, index) => ({ entry, index, score: scoreEntry(entry, tokens, phrase, fuzzy) }))
      .filter((hit) => hit.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.entry.label.length - b.entry.label.length ||
          a.index - b.index,
      )
      .slice(0, limit)
      .map((hit) => hit.entry);

  const strict = run(false);
  return strict.length ? strict : run(true);
}

/** Splits `text` into [plain, matched] runs for highlighting the query words. */
export function highlightMenuMatch(text: string, query: string): Array<{ text: string; match: boolean }> {
  const tokens = tokenizeMenuQuery(query).sort((a, b) => b.length - a.length);
  if (!tokens.length) return [{ text, match: false }];
  const lower = text.toLocaleLowerCase();
  const marks = new Array<boolean>(text.length).fill(false);
  for (const token of tokens) {
    let index = lower.indexOf(token);
    while (index !== -1) {
      for (let i = index; i < index + token.length; i += 1) marks[i] = true;
      index = lower.indexOf(token, index + token.length);
    }
  }
  const runs: Array<{ text: string; match: boolean }> = [];
  for (let i = 0; i < text.length; i += 1) {
    const last = runs[runs.length - 1];
    if (last && last.match === marks[i]) last.text += text[i];
    else runs.push({ text: text[i], match: marks[i] });
  }
  return runs;
}
