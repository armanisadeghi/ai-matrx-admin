"use client";

/**
 * One Smart Add helper ("focused session"): one people-search method on the current round's name,
 * city, occupation and company. Candidates render as the anchor cards (raw photo, exact handle, Open
 * with referral params, This is me / Not me / Namesake); answers go to the Smart Add round through
 * the helper store. Admins get a fact block: source, endpoint, cost, measured time, raw requests.
 */

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { Badge, Button, Field, PropertyRow } from "@ai-matrx/design-system/controls";
import { formatDurationMs, formatUsd } from "@ai-matrx/kit/format";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/selectors/userSelectors";
import { AnchorCard } from "../AnchorCards";
import { platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { candidateItem } from "./candidateItem";
import { listHelperMethods } from "./service";
import {
  answerCandidate,
  cancelHelper,
  moreGoogle,
  setHelperInput,
  startHelper,
  useHelperAnswer,
  useHelperSession,
  type HelperSession,
} from "./store";
import { PAGED_METHODS, type HelperCandidate, type HelperInput, type HelperMethod, type HelperMethodInfo, type HelperResult } from "./types";

let methodInfo: Promise<HelperMethodInfo[]> | null = null;
function useMethodInfo(method: HelperMethod): HelperMethodInfo | null {
  const [info, setInfo] = useState<HelperMethodInfo | null>(null);
  useEffect(() => {
    let live = true;
    methodInfo ??= listHelperMethods().catch((e: unknown) => {
      methodInfo = null;
      throw e;
    });
    methodInfo.then((all) => live && setInfo(all.find((m) => m.method === method) ?? null)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [method]);
  return info;
}

function seconds(ms: number | null | undefined): string {
  return formatDurationMs(ms, { style: "compact" });
}

function usd(v: number | null | undefined): string {
  return formatUsd(v, { digits: "adaptive", unknown: "unpriced" });
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{formatDurationMs(now - since, { style: "clock" })}</span>;
}

function HelperCard({ candidate }: { candidate: HelperCandidate }) {
  const answer = useHelperAnswer(candidate.key);
  return <AnchorCard item={candidateItem(candidate)} answer={answer} onAnswer={(a) => answerCandidate(candidate, a)} />;
}

function CandidateList({ list }: { list: HelperCandidate[] }) {
  return (
    <ul className="grid gap-2">
      {list.map((c) => (
        <HelperCard key={c.key} candidate={c} />
      ))}
    </ul>
  );
}

const GROUP_ORDER = ["linkedin", "instagram", "facebook", "x", "tiktok", "threads", "youtube", "pinterest", "web"];

function Results({ method, result }: { method: HelperMethod; result: HelperResult }) {
  if (method === "google" && Object.keys(result.groups).length) {
    const keys = Object.keys(result.groups)
      .filter((k) => result.groups[k]?.length)
      .sort((a, b) => (GROUP_ORDER.indexOf(a) + 99) % 99 - (GROUP_ORDER.indexOf(b) + 99) % 99);
    return (
      <div className="flex flex-col gap-4">
        {keys.map((k) => (
          <section key={k} className="flex flex-col gap-2" aria-label={k}>
            <h3 className="text-xs font-medium text-muted-foreground">
              {k === "web" ? "Web pages" : platformLabel(k)} · {result.groups[k]!.length}
            </h3>
            <CandidateList list={result.groups[k]!} />
          </section>
        ))}
      </div>
    );
  }
  return result.candidates.length ? (
    <CandidateList list={result.candidates} />
  ) : (
    <p className="text-sm text-muted-foreground">No one found for this name.</p>
  );
}

function AdminBlock({ info, session }: { info: HelperMethodInfo | null; session: HelperSession }) {
  const r = session.result;
  return (
    <section data-testid="smart-add-helper-admin" className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <div className="flex items-center gap-2">
        <Badge>Admin</Badge>
        <span className="text-xs text-muted-foreground">{info?.label ?? ""}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <PropertyRow label="Source" value={info?.provider} />
        <PropertyRow label="Endpoint" value={info?.endpoint} mono />
        <PropertyRow label="Typical time" value={info?.typical_time} />
        <PropertyRow
          label="Estimate per run"
          value={info ? `${info.estimate_points ?? "?"} pts · ${usd(info.estimate_usd)} · ${info.estimate_units}` : null}
        />
        <PropertyRow
          label="Measured time"
          value={r || session.elapsedMs != null ? `${seconds(session.elapsedMs)} in browser · ${seconds(r?.ms)} server` : null}
          missing="Not run"
        />
        <PropertyRow
          label="This run cost"
          value={
            r?.costs.length
              ? r.costs
                  .map((c) => `${c.points ?? "?"} pts · ${usd(c.usd)} · ${c.units} ${c.unit_label} (${c.provider}${c.replayed ? ", test cache" : ""})`)
                  .join(" + ")
              : null
          }
          missing="Not run"
        />
        {r?.filtered_aggregators.length ? (
          <PropertyRow label="Aggregators dropped" value={r.filtered_aggregators.join(", ")} />
        ) : null}
        {r?.queries.length ? <PropertyRow label="Queries" data={r.queries} expanded={<pre className="whitespace-pre-wrap text-xs">{r.queries.join("\n")}</pre>} /> : null}
      </div>
      {r?.requests.length ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Requests · also in the Builder panel</span>
          {r.requests.map((q, i) => (
            <PropertyRow
              key={`${q.seq}:${i}`}
              label={`${q.provider} · ${q.status ?? q.error ?? "?"} · ${seconds(q.ms)}${q.replayed_from_test_cache ? " · test cache" : ""}`}
              value={q.label ?? q.kind}
              expanded={
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">
                  {JSON.stringify({ request: q.request, response: q.response, error: q.error }, null, 2)}
                </pre>
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

const FIELDS: { key: keyof HelperInput; label: string; placeholder: string }[] = [
  { key: "name", label: "Name", placeholder: "First Last" },
  { key: "city", label: "City", placeholder: "City" },
  { key: "occupation", label: "Occupation", placeholder: "Occupation" },
  { key: "company", label: "Company", placeholder: "Company" },
];

export function HelperPanel({ method }: { method: HelperMethod }) {
  const session = useHelperSession(method);
  const info = useMethodInfo(method);
  const isAdmin = useAppSelector(selectIsAdmin);
  const busy = session.status === "running" || session.status === "polling";

  const run = async () => {
    if (info?.confirm_required) {
      const ok = await confirm({
        title: `Run ${info.label}?`,
        description: `This search is expensive: about ${info.estimate_points ?? "?"} points per run (${info.estimate_units}).`,
        confirmLabel: "Run it",
      });
      if (!ok) return;
    }
    await startHelper(method, Boolean(info?.confirm_required));
  };

  const r = session.result;
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-testid={`smart-add-helper-${method}`}>
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void run();
        }}
      >
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
            <Field
              // ui-exception: a raw search value (name, city, job, company)
              value={session.input[f.key]}
              placeholder={f.placeholder}
              aria-label={f.label}
              disabled={busy}
              onChange={(e) => setHelperInput(method, { ...session.input, [f.key]: e.target.value })}
            />
          </label>
        ))}
        <div className="flex items-center gap-2 sm:col-span-2">
          <Button type="submit" variant="primary" icon={<Play aria-hidden />} disabled={busy || !session.input.name.trim()}>
            {r ? "Search again" : "Search"}
          </Button>
          {session.status === "polling" ? (
            <Button variant="outline" icon={<Square aria-hidden />} onClick={() => void cancelHelper(method)}>
              Cancel
            </Button>
          ) : null}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            {busy && session.startedAt ? (
              <>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {session.status === "polling" ? "LinkedIn search running" : "Searching"} · <Elapsed since={session.startedAt} />
              </>
            ) : r ? (
              `${r.candidates.length} found · ${seconds(session.elapsedMs ?? r.ms)}${r.points != null ? ` · ${r.points} pts` : ""}`
            ) : info ? (
              `About ${info.estimate_points ?? "?"} pts · ${info.typical_time}`
            ) : null}
          </span>
        </div>
      </form>

      {session.error ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          {session.error}
          <ErrorAlchemyMenu error={session.error} />
        </p>
      ) : null}
      {session.status === "cancelled" ? <p className="text-xs text-muted-foreground">Cancelled.</p> : null}
      {isAdmin ? <AdminBlock info={info} session={session} /> : null}
      {r ? <Results method={method} result={r} /> : null}
      {PAGED_METHODS.includes(method) && r?.more && !busy ? (
        <Button variant="outline" className="self-start" onClick={() => void moreGoogle(method)} data-testid={`smart-add-helper-${method}-more`}>
          {`More results · page ${r.page + 1}`}
        </Button>
      ) : null}
    </div>
  );
}
