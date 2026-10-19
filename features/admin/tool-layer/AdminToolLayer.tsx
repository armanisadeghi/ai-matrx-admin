"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { RecordId } from "@ai-matrx/design-system";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { formatRelativeTime } from "@/utils/datetime";
import {
  loadToolDetail,
  loadToolPricing,
  saveToolOrder,
  turnOffEndpoint,
  verifyEndpoint,
  type EndpointPrice,
} from "@/features/admin/tool-control/service";
import { TOOL_CONTROL_QUERY_KEY } from "@/features/admin/tool-control/paths";
import { UptimeStrip } from "@/features/admin/tool-control/UptimeStrip";
import type { ControlLogEntry, EndpointRow, ScorecardRow } from "@/features/admin/tool-control/types";
import { actorWords, historyLine, reasonWords, speedLabel, stateWords, successLabel } from "@/features/admin/tool-control/words";

const KEY = [...TOOL_CONTROL_QUERY_KEY, "layer"] as const;
const ago = (t: string | null | undefined) => (t ? formatRelativeTime(t) : "Never");
const TONE = { success: "text-success", warning: "text-warning", danger: "text-destructive", muted: "text-muted-foreground" } as const;

/** Effective list order: the saved priority (lower first); ties keep a stable id order. */
function byPriority(a: EndpointRow, b: EndpointRow) {
  const pa = a.priority ?? Number.MAX_SAFE_INTEGER;
  const pb = b.priority ?? Number.MAX_SAFE_INTEGER;
  return pa === pb ? a.id.localeCompare(b.id) : pa - pb;
}

function vendorCost(p: EndpointPrice | undefined): { text: string; sub: string | null; tone?: string } {
  if (!p) return { text: "—", sub: null };
  if (p.free) return { text: "Free", sub: null };
  if (p.unit_usd === null) return { text: "No price", sub: "not in the price book", tone: "text-destructive" };
  return { text: `$${p.unit_usd}`, sub: p.unit ? p.unit.replace(/^USD\s*/i, "") : null };
}

function lastReason(log: ControlLogEntry[] | undefined): string {
  const e = (log ?? []).find((x) => x.kind !== "order" && x.to !== "verifying");
  if (!e) return "";
  return e.reason === "manual" || !e.reason ? `${actorWords(e)}${e.note ? `: ${e.note}` : ""}` : reasonWords(e);
}

/**
 * Admin layer of a Tool: every source with its real name, the vendor's price, what a member pays, how it is
 * doing, and the knobs (default order, kill switch) with the change log. Mounted by the Tools screens when the
 * viewer is an admin with the admin view on. Champions: Stripe dashboard (dense, exact numbers) and Cloudflare
 * (a switch beside each thing, an audit log under it).
 */
export function AdminToolLayer({ toolId }: { toolId: string }) {
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: [...KEY, "detail", toolId], queryFn: () => loadToolDetail(toolId) });
  const pricing = useQuery({ queryKey: [...KEY, "pricing", toolId], queryFn: () => loadToolPricing(toolId) });
  const [order, setOrder] = useState<string[] | null>(null);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const endpoints = useMemo(() => (detail.data?.endpoints ?? []).filter((e) => e.state !== "retired").sort(byPriority), [detail.data]);
  const savedIds = useMemo(() => endpoints.map((e) => e.id), [endpoints]);
  useEffect(() => setOrder(null), [savedIds.join(",")]);
  const ids = order ?? savedIds;
  const dirty = order !== null && order.join(",") !== savedIds.join(",");
  const byId = new Map(endpoints.map((e) => [e.id, e]));
  const names = new Map((detail.data?.providers ?? []).map((p) => [p.slug, p]));
  const prices = new Map((pricing.data?.endpoints ?? []).map((p) => [p.endpoint_id, p]));

  const move = (i: number, d: -1 | 1) => {
    const next = [...ids];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  const refresh = async () => {
    await Promise.all([detail.refetch(), pricing.refetch(), queryClient.invalidateQueries({ queryKey: ["admin-attention"] })]);
  };
  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } catch (err) {
      toast.error("That did not happen", { description: extractErrorMessage(err) });
    } finally {
      setBusy(null);
      await refresh();
    }
  };

  const save = () =>
    run("order", async () => {
      const r = await saveToolOrder(toolId, ids, why.trim());
      toast.success(r.message);
      setWhy("");
    });

  const flipOff = (ep: EndpointRow, name: string) =>
    run(`off:${ep.id}`, async () => {
      if (!(await confirm({ title: `Turn off ${name}?`, description: `${ep.vendor_op}. Calls stop using this source until a check passes.`, confirmLabel: "Turn off" }))) return;
      const r = await turnOffEndpoint(ep.id, "paused", why.trim() || undefined);
      toast.success(`Now ${r.state}`);
      setWhy("");
    });
  const flipOn = (ep: EndpointRow, name: string) =>
    run(`on:${ep.id}`, async () => {
      if (!(await confirm({ title: `Check ${name}?`, description: `${ep.vendor_op}. Makes one real call. If it works, the source turns on.`, confirmLabel: "Run check" }))) return;
      const r = await verifyEndpoint(ep.id);
      if (r.passed) toast.success(r.message);
      else toast.error(r.message);
    });

  const log = useMemo(() => {
    const rows: { at: string; subject: string; entry: ControlLogEntry }[] = [];
    for (const ep of detail.data?.endpoints ?? []) {
      const p = names.get(ep.provider_slug);
      const subject = `${p?.admin_name ?? ep.provider_slug} · ${ep.vendor_op}`;
      for (const e of ep.metadata?.control_log ?? []) if (e.to !== "verifying") rows.push({ at: e.at, subject, entry: e });
    }
    return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data]);

  const loading = (detail.isFetching && !detail.data) || (pricing.isFetching && !pricing.data);
  const error = detail.error ?? pricing.error;
  const cell = "px-2 py-1 align-middle whitespace-nowrap";

  return (
    <section className="flex flex-col gap-2 rounded-md border border-border bg-card" aria-label="Admin view of this Tool">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">Sources and default order</h3>
        {pricing.data ? (
          <span className="text-xs text-muted-foreground">
            {pricing.data.points_per_usd} points = $1 · margin {pricing.data.margin_pct}%
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <input
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="Why (saved to the log)"
            maxLength={500}
            aria-label="Why"
            className="h-7 w-56 rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground"
          />
          <Button variant="outline" disabled={!dirty || busy !== null} onClick={() => setOrder(null)}>
            Reset
          </Button>
          <Button variant="primary" disabled={!dirty || busy !== null} onClick={() => void save()}>
            {busy === "order" ? <Spinner size="xs" /> : null}
            Save order
          </Button>
          <Button variant="outline" onClick={() => void refresh()} disabled={detail.isFetching} aria-label="Refresh">
            {detail.isFetching ? <Spinner size="xs" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {error ? <p className="px-3 py-2 text-sm text-destructive">{extractErrorMessage(error)}</p> : null}
      {loading ? <p className="px-3 py-2 text-sm text-muted-foreground">Loading…</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              {["Order", "Source", "Members see", "Vendor cost", "Member pays", "Success 7d", "Typical", "Slowest 5%", "Last worked", "48 hours", "State"].map((h) => (
                <th key={h} className={`${cell} font-medium`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((id, i) => {
              const ep = byId.get(id);
              if (!ep) return null;
              const prov = names.get(ep.provider_slug);
              const name = `${prov?.admin_name ?? ep.provider_slug}${ep.via === "treg" ? " (aggregator)" : ""}`;
              const card: ScorecardRow | undefined = detail.data?.cards7.find((c) => c.endpoint_id === id);
              const card30 = detail.data?.cards30.find((c) => c.endpoint_id === id);
              const price = prices.get(id);
              const cost = vendorCost(price);
              const word = stateWords(ep.state);
              const reason = ep.state === "live" ? "" : lastReason(ep.metadata?.control_log);
              const working = busy?.endsWith(id) ?? false;
              return (
                <tr key={id} className="border-b border-border/60 last:border-0">
                  <td className={cell}>
                    <span className="inline-flex items-center gap-0.5">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" aria-label="Move down" disabled={i === ids.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-right tabular-nums text-foreground">{i + 1}</span>
                    </span>
                  </td>
                  <td className={cell}>
                    <div className="font-medium text-foreground">{name}</div>
                    <div className="text-muted-foreground">{ep.vendor_op}</div>
                  </td>
                  <td className={cell}>{prov?.display === "leader" ? prov.admin_name : "Matrx"}</td>
                  <td className={cell} title={price?.basis ?? undefined}>
                    <div className={`tabular-nums ${cost.tone ?? "text-foreground"}`}>{cost.text}</div>
                    {cost.sub ? <div className="text-muted-foreground">{cost.sub}</div> : null}
                  </td>
                  <td className={`${cell} tabular-nums`}>{price ? (price.points === null ? "—" : price.free ? "Free" : `${price.points} pts`) : "—"}</td>
                  <td className={cell}>{successLabel(card)}</td>
                  <td className={`${cell} tabular-nums`}>{speedLabel(card?.p50_ms)}</td>
                  <td className={`${cell} tabular-nums`}>{speedLabel(card?.p95_ms)}</td>
                  <td className={cell}>{ago(card30?.last_success_at)}</td>
                  <td className={cell}>
                    <UptimeStrip rows={(detail.data?.strips ?? []).filter((s) => s.endpoint_id === id)} />
                  </td>
                  <td className={cell}>
                    <div className="flex items-center gap-2">
                      <div className="min-w-14">
                        <span className={TONE[word.tone ?? "muted"]}>{word.label}</span>
                        {reason ? <div className="max-w-40 truncate text-muted-foreground" title={reason}>{reason}</div> : null}
                      </div>
                      {ep.state === "live" ? (
                        <Button variant="outline" disabled={working || busy !== null} onClick={() => void flipOff(ep, name)}>
                          Turn off
                        </Button>
                      ) : ep.state === "verifying" ? null : (
                        <Button variant="primary" disabled={working || busy !== null} onClick={() => void flipOn(ep, name)}>
                          {working ? <Spinner size="xs" /> : null}
                          Check and turn on
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border">
        <h4 className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Change log</h4>
        {log.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Nothing has changed yet.</p>
        ) : (
          <ul className="max-h-56 overflow-y-auto px-3 pb-2 text-xs">
            {log.map((r, i) => (
              <li key={`${r.at}:${i}`} className="flex flex-wrap items-center gap-x-2 border-b border-border/50 py-1 last:border-0">
                <span className="w-24 shrink-0 text-muted-foreground">{formatRelativeTime(r.at)}</span>
                <span className="w-56 shrink-0 truncate font-medium text-foreground" title={r.subject}>{r.subject}</span>
                <span className="text-foreground">{historyLine(r.entry)}</span>
                {r.entry.by ? <RecordId value={r.entry.by} label="Admin" token="user" /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
