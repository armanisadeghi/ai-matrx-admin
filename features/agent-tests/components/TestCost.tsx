"use client";

import { Cost } from "@/components/cost/Cost";
import { AdminCost } from "@/components/cost/AdminCost";
import type { AgentTestSeat } from "../types";

/** A cost stored in cents: points for people, dollars with points for the admin seat. */
export function TestCost({
  cents,
  seat,
}: {
  cents: number | null;
  seat: AgentTestSeat;
}) {
  const usd = cents === null ? null : cents / 100;
  return seat === "admin" ? <AdminCost usd={usd} /> : <Cost usd={usd} short />;
}
