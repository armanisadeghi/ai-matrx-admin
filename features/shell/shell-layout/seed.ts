// features/shell/shell-layout/seed.ts — the `shell` key of `iam.core_boot_seed()` (and the whole answer of
// `iam.shell_layout_seed`), read into the frozen `ShellBootSeed` shape. Pure; never throws.
//
// `null` is the common answer: nobody on the seeded page has a layout. A value that is present but not the
// shape is refused WHOLE with a console warning naming what was wrong — the default layout renders, never a
// half-read one.

import type { ShellBootSeed, StoredShellLayout } from "./contract";

function readStored(raw: unknown): StoredShellLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.recordId !== "string" ||
    typeof r.organizationId !== "string" ||
    typeof r.version !== "number" ||
    typeof r.updatedAt !== "string" ||
    typeof r.body !== "string"
  ) {
    return null;
  }
  return { recordId: r.recordId, organizationId: r.organizationId, version: r.version, updatedAt: r.updatedAt, body: r.body };
}

/** `raw` → the seed. `undefined`/`null` → null silently; anything else malformed → null, loudly. */
export function parseShellBootSeed(raw: unknown, where = "iam.core_boot_seed().shell"): ShellBootSeed | null {
  if (raw === undefined || raw === null) return null;
  const refuse = (why: string): null => {
    console.warn(`[shell-layout] ${where} is not a layout seed (${why}); the default layout renders`);
    return null;
  };
  if (typeof raw !== "object" || Array.isArray(raw)) return refuse("not an object");
  const r = raw as Record<string, unknown>;
  let person: StoredShellLayout | null = null;
  if (r.person !== null && r.person !== undefined) {
    person = readStored(r.person);
    if (!person) return refuse("person row malformed");
  }
  const organizations: Record<string, StoredShellLayout> = {};
  const orgs = r.organizations ?? {};
  if (typeof orgs !== "object" || Array.isArray(orgs) || orgs === null) return refuse("organizations is not an object");
  for (const [orgId, value] of Object.entries(orgs as Record<string, unknown>)) {
    const stored = readStored(value);
    if (!stored) return refuse(`organization ${orgId} row malformed`);
    organizations[orgId] = stored;
  }
  if (!person && Object.keys(organizations).length === 0) return null;
  return { person, organizations };
}

/** The seed back to the wire shape (camelCase is the wire shape; this is a defensive copy). */
export function shellBootSeedToRaw(seed: ShellBootSeed | null): Record<string, unknown> | null {
  if (!seed) return null;
  return { person: seed.person, organizations: seed.organizations };
}
