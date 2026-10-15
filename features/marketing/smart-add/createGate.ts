/**
 * Smart Add · the one-time step at Create when a brand the person already has matches (BRAND-MATCH in FEATURE.md).
 * Pure over its inputs (the live read and the dialog are passed in) so a test can drive it: a strong match not yet
 * answered asks ONCE; "Create separate brand" answers it for good, "Not yet" stops the Create. It offers, and
 * never blocks: a failed check lets Create go on.
 */
import type { BrandMatch, BrandProbe } from "./brandMatch";

export interface CreateGateAsk {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
}

export async function gateCreate({
  probe,
  find,
  ask,
  answered,
}: {
  probe: BrandProbe | null;
  find: (probe: BrandProbe) => Promise<BrandMatch[]>;
  ask: (q: CreateGateAsk) => Promise<boolean>;
  /** Brand ids the person already chose to keep separate. */
  answered: ReadonlySet<string>;
}): Promise<{ proceed: boolean; answered: ReadonlySet<string> }> {
  if (!probe) return { proceed: true, answered };
  const open = (await find(probe).catch(() => [] as BrandMatch[])).filter((m) => !answered.has(m.brand.id));
  if (!open.length) return { proceed: true, answered };
  const names = open.slice(0, 2).map((m) => m.brand.name).join(" and ");
  const ok = await ask({
    title: "Create another brand?",
    description: `You already have ${names}${open.length > 2 ? " and more" : ""}. This makes a separate one.`,
    confirmLabel: "Create separate brand",
    cancelLabel: "Not yet",
  });
  if (!ok) return { proceed: false, answered };
  return { proceed: true, answered: new Set([...answered, ...open.map((m) => m.brand.id)]) };
}
