/**
 * One definition of "what the Error Inspector lists" and "what its badge counts".
 *
 * The sidebar/header/floating badges count the LOUD tier (red); yellow is silent
 * by design and an orange-only store is a dot with no number. Before this module
 * the inspector always opened on "all", so a badge reading "2" opened a list of
 * five (L32, defect 61). Now the inspector opens on exactly the tier the badge
 * is counting, and the badge number and the listed rows are the same set.
 */
import type { CapturedError, CapturedErrorStats } from "@/lib/diagnostics/errorCaptureStore";
import type { ErrorTier } from "@/lib/diagnostics/errorTiers";

export type TierFilter = ErrorTier | "all";

/** The tier a badge built from `stats` is showing; "all" when it shows nothing. */
export function badgeTierFor(stats: Pick<CapturedErrorStats, "red" | "orange">): TierFilter {
  if (stats.red > 0) return "red";
  if (stats.orange > 0) return "orange";
  return "all";
}

/** The inspector list: tier filter + free-text query over the same store rows. */
export function filterInspectorErrors(
  errors: readonly CapturedError[],
  tier: TierFilter,
  query: string,
): CapturedError[] {
  const q = query.trim().toLowerCase();
  return errors.filter((e) => {
    if (tier !== "all" && e.tier !== tier) return false;
    if (!q) return true;
    return [e.message, e.code, e.relation, e.schema, e.operation, e.source, e.route, e.details, e.hint]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
}
