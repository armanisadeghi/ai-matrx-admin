// features/education/create/madeFrom.ts
//
// After an Education Create page has saved its artifact: record what it was made
// from. (1) The Sources exactly as chosen ride on the artifact's `config`
// (`source_set` / `source_names`, the same keys a deck keeps), and (2) a `source`
// lineage edge links it to EVERY Source through the one writer — failures are
// announced with Retry, never silent.

import { deckSourceSetPatch } from "@/features/flashcards/data/deckSourceSet";
import { announceLineage } from "@/features/education/convert/announceLineage";
import { recordLineageForSources } from "@/features/education/convert/recordSourceLineage";
import type { ConvertResult } from "@/features/education/convert/types";
import type { PreparedMaterial } from "./groundedMaterial";

/** The config keys that record the chosen Sources (empty for a topic alone). */
export function madeFromConfig(prepared: PreparedMaterial): Record<string, unknown> {
  if (!prepared.chosen || !prepared.names) return {};
  return { ...deckSourceSetPatch(prepared.chosen, prepared.names) };
}

/** Link the saved artifact to every Source it was read from. No-op for a topic alone. */
export async function linkMadeFrom(
  prepared: PreparedMaterial,
  result: Pick<ConvertResult, "resourceType" | "artifactId" | "targetKind" | "title" | "href" | "detail">,
  orgId: string | undefined,
): Promise<void> {
  if (prepared.lineageSources.length === 0) return;
  const link = () => recordLineageForSources(result, prepared.lineageSources, orgId);
  announceLineage(await link(), link);
}
