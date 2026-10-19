// features/shell/shell-layout/held.ts — the held layouts (the slice, or the server's seed) → what the shell draws.
//
// ONE function for both halves, so the server's first frame and the client's first render are the same
// tree: `(core)/layout.tsx` calls it with the seed it just read, `useResolvedShellLayout` calls it with the
// slice the seed became. Pure; parses the raw body text, then `resolveShellLayout` (person > the
// organization's > default; the Standard view switch and guests → default).

import type { StoredShellLayout } from "./contract";
import { resolveShellLayout, type ResolvedShellLayout } from "./resolve";
import { parseShellLayoutBody } from "./validate";
import type { ShellLayoutBody } from "./contract";

export interface HeldShellLayouts {
  enabled: boolean;
  person: StoredShellLayout | null;
  organizations: Record<string, StoredShellLayout>;
  organizationId: string | null;
  standardView: boolean;
  /** The organization lets members use their own layout (knob `shell.members_may_customize`). Absent = true. */
  personAllowed?: boolean;
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
