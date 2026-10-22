"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FLEET_READINESS_LABEL,
  type FleetReadiness,
} from "@/features/surfaces/utils/fleet-readiness";

/**
 * Presentation for EARNED readiness (surface declarations D2): the derived
 * fleet readiness (`deriveFleetReadiness`), never the typed manifest field.
 * One home for the badge, the header toggles and the filter bar.
 */
export const READINESS_META: Record<
  FleetReadiness,
  {
    label: string;
    className: string;
    iconClassName: string;
    description: string;
  }
> = {
  ready: {
    label: FLEET_READINESS_LABEL.ready,
    className: "border-success/40 text-success",
    iconClassName: "text-success",
    description: "Probe passed, every value supplied, every write handled",
  },
  partial: {
    label: FLEET_READINESS_LABEL.partial,
    className: "border-warning/40 text-warning",
    iconClassName: "text-warning",
    description: "Some values supplied; gaps remain",
  },
  unproven: {
    label: FLEET_READINESS_LABEL.unproven,
    className: "bg-muted text-muted-foreground border-border",
    iconClassName: "text-muted-foreground",
    description: "Nothing supplied or probed yet",
  },
};

export const READINESS_ORDER: readonly FleetReadiness[] = ["ready", "partial", "unproven"];

/**
 * Compact derived-readiness badge. `gaps` (from `readinessGaps`) become the
 * hover title; null readiness = the fleet metric has not loaded.
 */
export function SurfaceReadinessBadge({
  readiness,
  gaps,
  className,
}: {
  readiness: FleetReadiness | null;
  gaps?: readonly string[];
  className?: string;
}) {
  if (!readiness) return null;
  const meta = READINESS_META[readiness];
  return (
    <Badge
      variant="outline"
      className={cn("text-xs", meta.className, className)}
      title={gaps && gaps.length > 0 ? gaps.join(" · ") : meta.description}
    >
      {meta.label}
    </Badge>
  );
}
