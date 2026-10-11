// features/notes/homes/homeModel.ts
//
// ITEM HOMES (common-docs systems/data/scopes-context/VISION.md, 2026-10-10): every note
// lives in exactly ONE home, and a home is a scope. The note's organization IS the home's
// organization. Every organization has one built-in "General" scope (scope type slug
// `general`) — that organization's "nothing". Pure functions only: the hook, the picker, the
// sidebar and the move thunk all read these.

import type { ScopeTypeWithScopes } from "@ai-matrx/records/scopes";

/** The slug of the built-in General scope type every organization carries. */
export const GENERAL_SCOPE_TYPE_SLUG = "general";

export interface NoteHome {
  scopeId: string;
  /** The scope's own name ("General" for an organization's General). */
  name: string;
  organizationId: string;
  organizationName: string;
  scopeTypeId: string;
  /** The scope type's singular label ("Client", "Case", "General"). */
  scopeTypeLabel: string;
  isGeneral: boolean;
}

/** The slice of a scope-tree organization a home list needs. */
export interface HomeOrganization {
  id: string;
  name: string;
  scope_types: readonly ScopeTypeWithScopes[];
}

export function isGeneralScopeType(type: Pick<ScopeTypeWithScopes, "slug">): boolean {
  return type.slug === GENERAL_SCOPE_TYPE_SLUG;
}

/** Every home a person can put a note in: each organization's General, then its scopes. */
export function buildHomes(organizations: readonly HomeOrganization[]): NoteHome[] {
  const homes: NoteHome[] = [];
  for (const org of organizations) {
    for (const type of org.scope_types) {
      const isGeneral = isGeneralScopeType(type);
      for (const scope of type.scopes) {
        homes.push({
          scopeId: scope.id,
          name: scope.name,
          organizationId: org.id,
          organizationName: org.name,
          scopeTypeId: type.id,
          scopeTypeLabel: isGeneral ? "General" : type.label_singular,
          isGeneral,
        });
      }
    }
  }
  return homes;
}

/**
 * The name a home shows. Organizations are invisible except where the organization IS the
 * meaning: a General is labelled "General · <Org>" when the person's notes span more than one
 * organization, and two same-named scopes from different organizations carry theirs.
 */
export function homeDisplayName(
  home: NoteHome,
  options: { notesSpanManyOrganizations: boolean; collidingNames?: ReadonlySet<string> },
): string {
  if (home.isGeneral) {
    return options.notesSpanManyOrganizations ? `General · ${home.organizationName}` : "General";
  }
  if (options.collidingNames?.has(home.name.toLocaleLowerCase())) {
    return `${home.name} · ${home.organizationName}`;
  }
  return home.name;
}

/** Lower-cased names held by scopes in more than one organization (Generals excluded). */
export function collidingHomeNames(homes: readonly NoteHome[]): Set<string> {
  const orgsByName = new Map<string, Set<string>>();
  for (const home of homes) {
    if (home.isGeneral) continue;
    const key = home.name.toLocaleLowerCase();
    let orgs = orgsByName.get(key);
    if (!orgs) {
      orgs = new Set();
      orgsByName.set(key, orgs);
    }
    orgs.add(home.organizationId);
  }
  const colliding = new Set<string>();
  for (const [name, orgs] of orgsByName) if (orgs.size > 1) colliding.add(name);
  return colliding;
}

export interface HomeSection {
  /** "General", or a scope type's singular label. */
  label: string;
  homes: NoteHome[];
}

/** General first, then one section per scope type label (merged across organizations). */
export function homeSections(homes: readonly NoteHome[]): HomeSection[] {
  const general: NoteHome[] = [];
  const byType = new Map<string, NoteHome[]>();
  for (const home of homes) {
    if (home.isGeneral) {
      general.push(home);
      continue;
    }
    let bucket = byType.get(home.scopeTypeLabel);
    if (!bucket) {
      bucket = [];
      byType.set(home.scopeTypeLabel, bucket);
    }
    bucket.push(home);
  }
  const sections: HomeSection[] = [];
  if (general.length > 0) {
    sections.push({
      label: "General",
      homes: general.sort((a, b) => a.organizationName.localeCompare(b.organizationName)),
    });
  }
  for (const label of Array.from(byType.keys()).sort((a, b) => a.localeCompare(b))) {
    sections.push({
      label,
      homes: byType.get(label)!.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }
  return sections;
}

/** What `platform.set_home` answers. */
export interface HomeReceipt {
  homeScopeId: string;
  organizationId: string;
  organizationChanged: boolean;
  version: number;
  keptFields: string[];
  unchanged: boolean;
}

/** Read the receipt; a malformed one is a failure, never a guess. */
export function homeReceiptFrom(data: unknown): HomeReceipt {
  const row = (data && typeof data === "object" && !Array.isArray(data) ? data : null) as
    | Record<string, unknown>
    | null;
  if (
    !row ||
    typeof row.home_scope_id !== "string" ||
    typeof row.organization_id !== "string" ||
    typeof row.version !== "number"
  ) {
    throw new Error("The move answered without a receipt. Reload and check where the note is.");
  }
  return {
    homeScopeId: row.home_scope_id,
    organizationId: row.organization_id,
    organizationChanged: row.organization_changed === true,
    version: row.version,
    keptFields: Array.isArray(row.kept_fields)
      ? row.kept_fields.filter((field): field is string => typeof field === "string")
      : [],
    unchanged: row.unchanged === true,
  };
}

/** The database's own refusal sentence; a stand-in only when it sent none. */
export function homeRefusalMessage(error: { code?: string | null; message?: string | null }): string {
  const message = error.message?.trim();
  if (message) return message;
  if (error.code === "40001") return "This was changed somewhere else. Reload it and move it again.";
  if (error.code === "42501") return "You cannot move this note there.";
  return "The note could not be moved.";
}
