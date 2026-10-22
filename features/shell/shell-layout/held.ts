// features/shell/shell-layout/held.ts — the held layouts (the slice, or the server's seed) → what the shell draws.
//
// ONE function for both halves, so the server's first frame and the client's first render are the same
// tree: `(core)/layout.tsx` calls it with the seed it just read, `useResolvedShellLayout` calls it with the
// slice the seed became. Pure; parses the raw body text, then `resolveShellLayout` (person > the
// organization's > default; the Standard view switch and guests → default).

import type { StoredShellLayout } from "./contract";
import { bodyShellLook, bodyShowsDock, resolveShellLayout, shellAccentOf, type ResolvedShellLayout } from "./resolve";
import type { ShellLookId } from "./looks";
import { parseShellLayoutBody } from "./validate";
import type { ShellAccentRef, ShellLayoutBody } from "./contract";

export interface HeldShellLayouts {
  enabled: boolean;
  person: StoredShellLayout | null;
  organizations: Record<string, StoredShellLayout>;
  organizationId: string | null;
  standardView: boolean;
  /** The organization lets members use their own layout (knob `shell.members_may_customize`). Absent = true. */
  personAllowed?: boolean;
  /** The open editor's draft: shown in place of every stored layout while it is set (live preview). */
  previewBody?: string | null;
}

export interface ShellViewer {
  isAdmin: boolean;
  isGuest: boolean;
}

const warned = new Set<string>();

function bodyOf(stored: StoredShellLayout | null | undefined, whose: string): ShellLayoutBody | null {
  if (!stored) return null;
  const parsed = parseShellLayoutBody(stored.body);
  if (parsed.problems.length > 0) {
    const key = `${stored.recordId}@${stored.version}`;
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[shell-layout] the ${whose} layout (record ${stored.recordId} v${stored.version}) was repaired:`, parsed.problems);
    }
  }
  return parsed.body;
}

/** The layout the viewer sees. `enabled: false` (every route group but (core)) is the built-in default. */
export function resolveHeldShellLayout(held: HeldShellLayouts, viewer: ShellViewer): ResolvedShellLayout {
  const active = held.enabled && !viewer.isGuest;
  if (active && held.previewBody) {
    // The editor's live preview wins over everything (Standard view and the lock included) while it is open.
    return resolveShellLayout({
      person: parseShellLayoutBody(held.previewBody).body,
      organization: null,
      standardView: false,
      isAdmin: viewer.isAdmin,
      isGuest: false,
    });
  }
  const organization = active && held.organizationId ? held.organizations[held.organizationId] : null;
  return resolveShellLayout({
    person: active ? bodyOf(held.person, "person") : null,
    organization: bodyOf(organization, "organization"),
    standardView: held.standardView,
    isAdmin: viewer.isAdmin,
    isGuest: viewer.isGuest || !held.enabled,
    personAllowed: held.personAllowed !== false,
  });
}

/**
 * Only the Look of `resolveHeldShellLayout` (same order: the editor's preview, then guests / other route
 * groups / Standard view → none, then the person's body if allowed, else the organization's). The server
 * stamps it on `.shell-root` without resolving a menu; held/look.test.ts proves the two always agree.
 * Nothing stored = no parse at all.
 */
export function heldShellLook(held: HeldShellLayouts, viewer: Pick<ShellViewer, "isGuest">): ShellLookId | null {
  const active = held.enabled && !viewer.isGuest;
  if (!active) return null;
  if (held.previewBody) return bodyShellLook(parseShellLayoutBody(held.previewBody).body);
  if (held.standardView) return null;
  const own = held.personAllowed !== false && held.person ? parseShellLayoutBody(held.person.body).body : null;
  if (own) return bodyShellLook(own);
  const organization = held.organizationId ? held.organizations[held.organizationId] : null;
  return organization ? bodyShellLook(parseShellLayoutBody(organization.body).body) : null;
}

/**
 * Only the accent of `resolveHeldShellLayout` (same order as `heldShellLook`; the accent alone resolves per
 * field: the person's, else the organization's brand color). The server stamps it on `.shell-root` without
 * resolving a menu; __tests__/accent.test.tsx proves the two always agree. Nothing stored = no parse.
 */
export function heldShellAccent(held: HeldShellLayouts, viewer: Pick<ShellViewer, "isGuest">): ShellAccentRef | null {
  const active = held.enabled && !viewer.isGuest;
  if (!active) return null;
  if (held.previewBody) return parseShellLayoutBody(held.previewBody).body?.accent ?? null;
  if (held.standardView) return null;
  const own = held.personAllowed !== false && held.person ? parseShellLayoutBody(held.person.body).body : null;
  const stored = held.organizationId ? held.organizations[held.organizationId] : null;
  const organization = stored ? parseShellLayoutBody(stored.body).body : null;
  return shellAccentOf(own, organization);
}

/**
 * Only whether the winning body carries its own Dock (same order as `heldShellLook`). The server stamps
 * `data-show-dock` on `.shell-root` from it, so a person's customized phone dock is on the first frame;
 * nobody else's phone changes (the dock stays hidden by default).
 */
export function heldShellShowsDock(held: HeldShellLayouts, viewer: Pick<ShellViewer, "isGuest">): boolean {
  const active = held.enabled && !viewer.isGuest;
  if (!active) return false;
  if (held.previewBody) return bodyShowsDock(parseShellLayoutBody(held.previewBody).body);
  if (held.standardView) return false;
  const own = held.personAllowed !== false && held.person ? parseShellLayoutBody(held.person.body).body : null;
  if (own) return bodyShowsDock(own);
  const organization = held.organizationId ? held.organizations[held.organizationId] : null;
  return organization ? bodyShowsDock(parseShellLayoutBody(organization.body).body) : false;
}
