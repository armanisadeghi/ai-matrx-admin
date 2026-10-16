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

/** How long Create waits for the duplicate check before going on without it. */
export const CREATE_GATE_FIND_TIMEOUT_MS = 8000;

export async function gateCreate({
  probe,
  find,
  ask,
  answered,
  findTimeoutMs = CREATE_GATE_FIND_TIMEOUT_MS,
}: {
  probe: BrandProbe | null;
  find: (probe: BrandProbe) => Promise<BrandMatch[]>;
  ask: (q: CreateGateAsk) => Promise<boolean>;
  /** Brand ids the person already chose to keep separate. */
  answered: ReadonlySet<string>;
  findTimeoutMs?: number;
}): Promise<{ proceed: boolean; answered: ReadonlySet<string> }> {
  if (!probe) return { proceed: true, answered };
  // Bounded: a check that hangs never holds Create (MKT-182 sat 3.5 minutes with no message); no answer = no match.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<BrandMatch[]>((resolve) => {
    timer = setTimeout(() => resolve([]), findTimeoutMs);
  });
  const found = await Promise.race([find(probe).catch(() => [] as BrandMatch[]), timedOut]).finally(() => clearTimeout(timer));
  const open = found.filter((m) => !answered.has(m.brand.id));
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
