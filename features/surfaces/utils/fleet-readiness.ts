/**
 * Derived readiness (surface declarations D2): EARNED from the fleet metric,
 * never read from the typed `readiness` column.
 *
 * - ready    every declared-on value was supplied (30-day runs or the last
 *            probe), every write target has a handler, the page sets its OWN
 *            situation (an inherited module sentence never counts), and the
 *            latest probe (`last_check.status`) passed
 * - partial  at least one declared-on value was supplied, but not all of the above
 * - unproven nothing declared-on was supplied (or nothing is declared on), or
 *            the latest probe was inconclusive (refused page, nothing loaded):
 *            it proved nothing, so its supply never lifts the surface to
 *            partial; `readinessGaps` names the reason. Three states only.
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
  if (m.probe_result === "inconclusive") return "unproven";
  const allSupplied = m.values_supplied >= m.values_declared_on;
  const allHandled = m.write_targets === 0 || m.handled_targets === m.write_targets;
  const ownSituation = m.situation_source === "own";
  const probePassed = m.probe_result === "pass";
  return allSupplied && allHandled && ownSituation && probePassed ? "ready" : "partial";
}

/**
 * What still stands between a surface and Ready, one short line each, in the order the
 * rule names them. Empty exactly when deriveFleetReadiness says "ready".
 */
export function readinessGaps(m: ReadinessInputs | undefined): string[] {
  if (!m) return ["No fleet metric for this surface"];
  const gaps: string[] = [];
  if (m.probe_result !== "pass") {
    // An inconclusive probe (refused page, nothing loaded) proved nothing: unproven, never "failed".
    gaps.push(
      m.probe_result === "inconclusive"
        ? "Last probe inconclusive"
        : m.probe_result
          ? "Last probe failed"
          : "Never probed",
    );
  }
  if (m.values_declared_on === 0) gaps.push("No values declared on");
  else if (m.values_supplied < m.values_declared_on) {
    gaps.push(`${m.values_declared_on - m.values_supplied} of ${m.values_declared_on} on values not supplied`);
  }
  if (m.write_targets > 0 && m.handled_targets === null) gaps.push("Write handlers not measurable");
  else if (m.write_targets > 0 && m.handled_targets !== m.write_targets) {
    gaps.push(`${m.write_targets - (m.handled_targets ?? 0)} of ${m.write_targets} write targets without a handler`);
  }
  if (m.situation_source !== "own") {
    gaps.push(m.situation_source === "inherited" ? "Situation is inherited, not its own" : "No situation");
  }
  return gaps;
}
