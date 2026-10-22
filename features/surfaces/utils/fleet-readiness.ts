/**
 * Derived readiness (surface declarations D2): EARNED from the fleet metric,
 * never read from the typed `readiness` column.
 *
 * - ready    every declared-on value was supplied (30-day runs or the last
 *            probe), every write target has a handler, the page sets its OWN
 *            situation (an inherited module sentence never counts), and the
 *            latest probe (`last_check.status`) passed
 * - partial  at least one declared-on value was supplied, but not all of the above
 * - unproven nothing declared-on was supplied (or nothing is declared on)
 *
 * A write target whose handler cannot be measured (database/applet surfaces)
 * never counts as handled, so such a surface with write targets is at most
 * partial.
 */
import type { SurfaceFleetMetric } from "@/features/surfaces/services/surface-fleet-metric";

export type FleetReadiness = "ready" | "partial" | "unproven";

/** The rule, as shown in the page's info popover. Keep in step with deriveFleetReadiness. */
export const FLEET_READINESS_RULE =
  "Ready only when the last probe passed, all on values were supplied, every write target is handled and the page has its own situation.";

export const FLEET_READINESS_LABEL: Record<FleetReadiness, string> = {
  ready: "Ready",
  partial: "Partial",
  unproven: "Unproven",
};

export const FLEET_READINESS_SORT: Record<FleetReadiness, number> = {
  ready: 0,
  partial: 1,
  unproven: 2,
};

type ReadinessInputs = Pick<
  SurfaceFleetMetric,
  | "values_declared_on"
  | "values_supplied"
  | "write_targets"
  | "handled_targets"
  | "situation_present"
  | "situation_source"
  | "probe_result"
>;

export function deriveFleetReadiness(m: ReadinessInputs | undefined): FleetReadiness {
  if (!m || m.values_declared_on === 0 || m.values_supplied === 0) return "unproven";
  const allSupplied = m.values_supplied >= m.values_declared_on;
  const allHandled = m.write_targets === 0 || m.handled_targets === m.write_targets;
  const ownSituation = m.situation_source === "own";
  const probePassed = m.probe_result === "pass";
  return allSupplied && allHandled && ownSituation && probePassed ? "ready" : "partial";
}
