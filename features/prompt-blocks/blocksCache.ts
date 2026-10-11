import { listBlocks } from "./service";
import type { PromptBlockRow } from "./types";

/** The picker's list, loaded once and shared; `invalidateBlocks()` after any create/edit/archive. */
let cache: Promise<PromptBlockRow[]> | null = null;

export function loadBlocks(): Promise<PromptBlockRow[]> {
  if (!cache) {
    cache = listBlocks().catch((e) => {
      cache = null;
      throw e;
    });
  }
  return cache;
}

export function invalidateBlocks(): void {
  cache = null;
}

/** For the name `name`, which of `rows` runs for this person: personal (mine) > organization > system. */
export function winningRowId(
  rows: readonly Pick<PromptBlockRow, "id" | "name" | "organization_id" | "visibility" | "created_by">[],
  name: string,
  meId: string | null,
  systemOrgId: string,
  runOrgId: string | null,
): string | null {
  const same = rows.filter((r) => r.name === name);
  const personal = same.find((r) => r.visibility === "personal" && r.created_by === meId);
  if (personal) return personal.id;
  const org = same.find((r) => r.organization_id !== systemOrgId && r.visibility !== "personal" && (!runOrgId || r.organization_id === runOrgId));
  if (org) return org.id;
  return same.find((r) => r.organization_id === systemOrgId)?.id ?? null;
}
