"use client";

/**
 * The dock's signal, on its review page: per kind, how often an item reached the owner card in the
 * last 7 days and how often he acted (acted / shown); the card against its budget; and every item
 * agents are preparing, with the reason it is not on his card. Reads `platform.attention_report`
 * and `platform.attention_card` (super admin).
 */

import { useQuery } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { pgErrorToError } from "@ai-matrx/data";
import { AppLink } from "@/components/navigation/AppLink";
import { asClause } from "@ai-matrx/kit/text";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { fetchAttentionTriage } from "./triage-service";

interface KindSignal {
  source: string;
  kind: string;
  shown: number;
  acted: number;
  muted: number;
  expired: number;
  signal_rate: number | null;
  audience: string | null;
}

interface AttentionReport {
  shown: number;
  acted: number;
  signal_rate: number | null;
  by_kind: KindSignal[];
  card: { on_card: number; budget: number; prepared_by_agents: number };
}

interface UntypedRpc {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: PostgrestError | null }>;
}

async function fetchReport(): Promise<AttentionReport> {
  const db = createClient().schema("platform") as unknown as UntypedRpc;
  const { data, error } = await db.rpc("attention_report", { p_days: 7 });
  if (error) throw pgErrorToError(error);
  return data as AttentionReport;
}

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const words = (s: string) => s.replace(/[._-]+/g, " ");
const noIds = (s: string) => s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "(unnamed)");

export function AttentionSignalPanel() {
  const report = useQuery({ queryKey: ["admin-attention", "report"], queryFn: fetchReport, retry: 1 });
  const triage = useQuery({ queryKey: ["admin-attention", "triage"], queryFn: fetchAttentionTriage, retry: 1 });
  const preparing = triage.data
    ? [...triage.data.verdicts.values()].filter((v) => v.routedTo === "agent_fix" || v.routedTo === "over_budget")
    : [];

  return (
    <section id="attention-triage" className="space-y-2" data-surface-value="attention_signal">
      <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Attention signal · 7 days</h2>
      {report.isError ? (
        <p className="text-xs text-destructive">
          Signal could not be read: {asClause(String(report.error))}.
          <ErrorAlchemyMenu error={String(report.error)} />
        </p>
      ) : !report.data ? (
        <div className="h-16 rounded-lg border border-border bg-card" aria-busy />
      ) : (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <p className="tabular-nums">
            On the card {report.data.card.on_card} of {report.data.card.budget} · being prepared by agents{" "}
            {report.data.card.prepared_by_agents} · acted on {report.data.acted} of {report.data.shown} shown (
            {pct(report.data.signal_rate)})
          </p>
          {report.data.by_kind.length > 0 && (
            <ul className="mt-1.5 divide-y divide-border/60">
              {report.data.by_kind.map((k) => (
                <li key={`${k.source}:${k.kind}`} className="flex items-center justify-between gap-2 py-1">
                  <span className="min-w-0 truncate">{words(k.kind)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    shown {k.shown} · acted {k.acted} · muted {k.muted} · ignored {k.expired} · {pct(k.signal_rate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {triage.isSuccess && preparing.length > 0 && (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <p className="text-muted-foreground">Being prepared by agents · {preparing.length}</p>
          <ul className="mt-1 divide-y divide-border/60">
            {preparing.map((v) => (
              <li key={v.itemKey} className="flex items-center justify-between gap-2 py-1">
                <span className="min-w-0 truncate">{v.title ? noIds(v.title) : words(v.kind)}</span>
                <span className="shrink-0 truncate text-muted-foreground">
                  {v.notReadyReason ?? (v.routedTo === "over_budget" ? "Over the card budget" : "Agent fix")}
                </span>
              </li>
            ))}
          </ul>
          <AppLink
                  target="_blank"
                  rel="noopener" href="/administration/billing/alarms" className="mt-1 inline-block text-[11px] text-muted-foreground hover:text-primary hover:underline">
            Spend alarms
          </AppLink>
        </div>
      )}
    </section>
  );
}
