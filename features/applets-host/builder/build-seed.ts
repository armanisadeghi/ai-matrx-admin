// features/applets-host/builder/build-seed.ts — the builder's seeded address (`/applets/build?seed=…`) and the
// table reference a page outside the builder seeds it with ("Build an Applet on this database", a Space
// database's menu). Kept free of the builder's runtime (build-references.ts reaches the chat package), so a
// Space page links to the ONE builder without carrying any of it.
import type { BuildReference } from "./build-references";

/**
 * A table she started the build from ("Build an Applet on this database", a Space database's menu): the catalog
 * lists it first with `attached: true`, and the build runs in the table's organization so it can bind it.
 */
export interface TableReference {
  id: string;
  kind: "table";
  label: string;
  table_id: string;
  organization_id: string;
}

export function tableReference(input: { tableId: string; organizationId: string; label: string }): TableReference {
  return { id: `table:${input.tableId}`, kind: "table", label: input.label, table_id: input.tableId, organization_id: input.organizationId };
}

/** The builder's address, seeded with what she chose (a job, a layout): `/applets/build?seed=…`. */
export function buildSeedHref(references: readonly BuildReference[]): string {
  return `/applets/build?seed=${encodeURIComponent(JSON.stringify(references))}`;
}

