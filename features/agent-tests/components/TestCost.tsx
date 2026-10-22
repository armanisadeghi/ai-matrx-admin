"use client";

import { CostDoor } from "@/components/cost/CostDoor";
import type { AgentTestSeat } from "../types";

/**
 * A cost stored in cents, behind the click-to-see door (owner ruling 2026-10-22: a run's cost never
 * prints in a row). Points for people; an admin also sees dollars inside the door, tagged.
 */
export function TestCost({
  cents,
  inline = false,
}: {
  cents: number | null;
  /** Kept for existing callers; the door is the same for every seat. */
  seat?: AgentTestSeat;
  /** A labelled "Usage" door (a result's facts) instead of the icon-only table-cell door. */
  inline?: boolean;
}) {
  const usd = cents === null ? null : cents / 100;
  return inline ? <CostDoor usd={usd} label="Usage" /> : <CostDoor usd={usd} iconOnly />;
}
