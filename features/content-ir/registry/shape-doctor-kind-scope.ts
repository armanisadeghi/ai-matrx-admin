/**
 * ONE KIND'S NEIGHBOURHOOD — the exact inputs the shape doctor reads to build
 * ONE kind's row (SHAPES-BUGS 2.1, 2026-10-14). The per-kind admin page used to
 * run the whole-catalog doctor (seven RPCs, ~10 MB over every kind) on every
 * load and 500'd when one of them timed out. A row depends only on:
 *  - the kind itself, and the kinds that EMBED it (nested-only-child classing),
 *  - its own examples, components and surfaces,
 *  - the skills that teach it (`attributeSkillsToKinds`),
 *  - the prompt blocks whose template names it.
 * The server reads a SUPERSET with cheap filters; this pure function cuts it to
 * exactly what the doctor reads, and `shape-doctor-kind-scope.test.ts` proves
 * the row equals the whole-catalog row for every kind of a fixture.
 */

import {
  attributeSkillsToKinds,
  type DoctorContentBlock,
  type DoctorKindComponent,
  type DoctorKindDefinition,
  type DoctorKindEdge,
  type DoctorKindExample,
  type DoctorKindSurface,
  type DoctorRenderBlockSkill,
} from "./shape-doctor";

export interface KindScopeInputs<
  K extends DoctorKindDefinition = DoctorKindDefinition,
  E extends DoctorKindExample = DoctorKindExample,
  C extends DoctorKindComponent = DoctorKindComponent,
  S extends DoctorKindSurface = DoctorKindSurface,
  R extends DoctorRenderBlockSkill = DoctorRenderBlockSkill,
  B extends DoctorContentBlock = DoctorContentBlock,
> {
  kinds: K[];
  examples: E[];
  components: C[];
  surfaces: S[];
  edges: DoctorKindEdge[];
  renderBlockSkills: R[];
  contentBlocks: B[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The doctor's own test for "this block template names the kind". */
export function blockNamesKind(template: string, slug: string): boolean {
  return new RegExp(`"__kind"\\s*:\\s*"${escapeRegExp(slug)}"`).test(template);
}

/** Cut a (superset) gather down to exactly what `slug`'s doctor row reads. Null when the kind is absent. */
export function scopeDoctorInputsToKind<
  K extends DoctorKindDefinition,
  E extends DoctorKindExample,
  C extends DoctorKindComponent,
  S extends DoctorKindSurface,
  R extends DoctorRenderBlockSkill,
  B extends DoctorContentBlock,
>(all: KindScopeInputs<K, E, C, S, R, B>, slug: string): KindScopeInputs<K, E, C, S, R, B> | null {
  const target = all.kinds.find((k) => k.kind === slug);
  if (!target) return null;
  const edges = all.edges.filter((e) => e.childDefinitionId === target.id);
  const parentIds = new Set(edges.map((e) => e.parentDefinitionId));
  const only = new Set([slug]);
  const teaching = new Set(
    attributeSkillsToKinds(all.renderBlockSkills, only).map((t) => t.skillId),
  );
  return {
    kinds: all.kinds.filter((k) => k.id === target.id || parentIds.has(k.id)),
    examples: all.examples.filter((e) => e.kindDefinitionId === target.id),
    components: all.components.filter((c) => c.kindDefinitionId === target.id),
    surfaces: all.surfaces.filter((s) => s.kindDefinitionId === target.id),
    edges,
    renderBlockSkills: all.renderBlockSkills.filter((s) => teaching.has(s.skillId)),
    contentBlocks: all.contentBlocks.filter((b) => blockNamesKind(b.template, slug)),
  };
}
