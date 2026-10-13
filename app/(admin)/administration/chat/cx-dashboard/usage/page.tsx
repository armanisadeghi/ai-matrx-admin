// app/(admin)/administration/chat/cx-dashboard/usage/page.tsx — the CX dashboard's Usage & Cost tab.
//
// The tab's cuts are the built-in Saved views of AI model calls (`ai_calls`); `chat.cx_usage_analytics`
// stays their parity oracle. It mounts that explorer HERE, inside the dashboard, instead of sending the
// person to /administration/usage — a tab that leaves its own tab bar reads as broken. An address with
// no open view opens "by model"; the old tab's window and person carry over: timeframe day / week /
// month / quarter → 24h / 7d / 30d / 90d (all → all time), a custom start/end → that range,
// user_id → the person.

import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AiCallsExplorer } from "@/features/admin/usage-drill/UsageGrainExplorers";

const PATH = "/administration/chat/cx-dashboard/usage";
const TIMEFRAME: Record<string, string> = { day: "24h", week: "7d", month: "30d", quarter: "90d" };

export default async function CxUsagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  if (typeof p.view !== "string") {
    const one = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : null);
    const params = new URLSearchParams({ view: "builtin:cx_by_model" });
    const start = one("start_date");
    const end = one("end_date");
    const timeframe = one("timeframe") ?? "month";
    if (timeframe === "custom" && start && end) params.set("w", `${start}..${end}`);
    else if (TIMEFRAME[timeframe]) params.set("w", TIMEFRAME[timeframe]!);
    const person = one("user_id");
    if (person) params.set("f.person", person);
    redirect(`${PATH}?${params.toString()}`);
  }
  return (
    <div className="p-3">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted/50" />}>
        <AiCallsExplorer />
      </Suspense>
    </div>
  );
}
