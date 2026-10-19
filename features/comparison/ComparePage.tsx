"use client";

/**
 * /compare — the deterministic comparison engine's home (aidream `services/comparison`).
 *
 *   the LINEUP (one card per contender: a name and where it is → it looks itself up and becomes the real
 *   thing, or offers the nearest real matches) ← fed by the one-line ask (a list fills cards; a concept
 *   finds real candidates to add) → Compare (priced first) → honest per-item progress → the result stage.
 *
 * Drop-safe: the run id is the stream's first event and goes into the address (`?run=`). A dropped
 * connection, a refresh or a new tab follows the saved run (`GET /comparison/runs/{id}`) to its end.
 * No AI in this layer. A CONCEPT ("best bike shops in Bend") goes through discovery (branches A/C,
 * `./discovery.ts`): we find the list, say how, the person picks — then the same compare runs.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, RotateCcw, Share2, ShoppingBag, Store } from "lucide-react";
import { Button, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorNotice, ReadFailure } from "@ai-matrx/design-system";
import { announceComingSoon } from "@ai-matrx/kit/coming-soon";

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { useSeesDollars } from "@/components/cost/useCostDisplay";
import { CompareLayerInputs } from "@/features/provision-window/CompareLayerInputs";

import { useComparisonKinds, useComparisonOrganizationId } from "./hooks";
import { followRun, runComparison } from "./server";
import {
  applyProgress,
  ComparisonRefusal,
  mergeRunProgress,
  type ComparedItem,
  type ComparisonItemInput,
  type ComparisonKindInfo,
  type ComparisonResult,
  type ItemProgress,
  type LookupMatch,
} from "./contract";
import type { KindKey } from "./parse-input";
import { discover, discoveryRecord, inferMode, type DiscoverResult, type InputMode, type Scope } from "./discovery";
import {
  inLineup, isEmptyRow, MAX_ROWS, newRow, placePick, rowsFromText, startRows, type CompareRow,
} from "./rows";
import { AskBar } from "./components/AskBar";
import { ComparisonView } from "./components/ComparisonView";
import { Lineup } from "./components/Lineup";
import { PickList } from "./components/PickList";
import { ShareButton } from "./public/ShareButton";
import { RunProgress, type ProgressRowIdentity } from "./components/RunProgress";

export function ComparePage() {
  const organizationId = useComparisonOrganizationId();
  const kinds = useComparisonKinds(organizationId);
  return (
    <>
      <RecordPageHeader backHref="/data" record={{ name: "Compare" }} />
      <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
        <div className="h-full overflow-y-auto bg-textured" data-matrx-page-scroll="">
          <div className="mx-auto w-full max-w-5xl px-[var(--matrx-page-gutter,1rem)] pt-8 sm:pt-12">
            {!organizationId || kinds.isLoading ? (
              <RegionSkeleton shape="cards" count={4} aria-label="Loading" />
            ) : kinds.error || !kinds.data ? (
              <ReadFailure error={kinds.error} what="the comparison kinds" onRetry={() => void kinds.refetch()} />
            ) : (
              <CompareBody kinds={kinds.data} organizationId={organizationId} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

type Phase = "build" | "running" | "result" | "failed";

function setRunInAddress(runId: string | null) {
  const url = new URL(window.location.href);
  if (runId) url.searchParams.set("run", runId);
  else url.searchParams.delete("run");
  replaceAddressWithoutNavigating(url);
}

/** A map listing link that names one place exactly (the place reader's own form). */
const PLACE_LINK = /\/maps\/place\/.*data=.*!1s0x/;

const KIND_UI: Record<string, { label: string; icon: React.ReactNode; soonId?: string }> = {
  local_business: { label: "Local businesses", icon: <Store className="h-4 w-4" /> },
  companies_reviews: { label: "Companies", icon: <Building2 className="h-4 w-4" /> },
  products: { label: "Products", icon: <ShoppingBag className="h-4 w-4" />, soonId: "compare.products" },
  social_accounts: { label: "Social", icon: <Share2 className="h-4 w-4" />, soonId: "compare.social-accounts" },
};

/** The identity a compared item was sent with (`ComparedItem.item_id` is its link, else its label). */
const sentId = (m: LookupMatch) => m.item.url ?? m.item.label ?? m.name;

function CompareBody({ kinds, organizationId }: { kinds: ComparisonKindInfo[]; organizationId: string }) {
  const seesDollars = useSeesDollars();
  const params = useSearchParams();
  const live = kinds.filter((k) => k.status === "live");
  const [kindKey, setKindKey] = useState<string>(
    live.find((k) => k.key === "local_business")?.key ?? live[0]?.key ?? "");
  const [rows, setRows] = useState<CompareRow[]>(startRows);
  const [text, setText] = useState(() => params.get("q") ?? ""); // a public-page hand-off arrives as ?q=
  const [near, setNear] = useState("");
  const runParam = params.get("run");
  const [phase, setPhase] = useState<Phase>(runParam ? "running" : "build");
  const [finding, setFinding] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<InputMode | null>(null);
  const [scope, setScope] = useState<Scope>("auto");
  const [discovered, setDiscovered] = useState<DiscoverResult | null>(null);
  const [progress, setProgress] = useState<ItemProgress[]>([]);
  const [identities, setIdentities] = useState<ProgressRowIdentity[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [recovering, setRecovering] = useState(Boolean(runParam));
  const [runKind, setRunKind] = useState<string>(kindKey);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  // The run THIS tab started: its own stream is already following it, so the address must not start a second reader.
  const ownRun = useRef<string | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const kind = kinds.find((k) => k.key === kindKey) ?? null;
  const runKindInfo = kinds.find((k) => k.key === runKind) ?? kind;
  const mode: InputMode = modeOverride ?? inferMode(text, kindKey as KindKey);

  // A page opened on ?run=<id> (a refresh, a new tab, a shared link) follows that saved run to its end.
  useEffect(() => {
    if (!runParam || runParam === ownRun.current) return;
    const ctrl = new AbortController();
    abort.current?.abort();
    abort.current = ctrl;
    setResult(null);
    setFailure(null);
    setRecovering(true);
    setPhase("running");
    followRun(runParam, {
      organizationId,
      signal: ctrl.signal,
      onRunState: (s) => {
        setRunKind(s.kind);
        setProgress((cur) => mergeRunProgress(cur, s.items));
        setIdentities(s.items.map((i) => ({ name: i.label, logoUrl: i.logoUrl, website: i.website })));
        if (s.created_at) setStartedAt(new Date(s.created_at).getTime());
      },
    }).then((r) => { setResult(r); setPhase("result"); })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setFailure(err instanceof ComparisonRefusal ? err.userMessage : "The comparison could not be read.");
        setPhase("failed");
      });
    return () => ctrl.abort();
    // the run id in the address, whenever it changes (a shared link, back/forward, a pasted address)
  }, [runParam]);

  function switchKind(next: string) {
    if (next === kindKey) return;
    setKindKey(next);
    setRows(startRows());
    setDiscovered(null);
    setAskError(null);
  }

  function onText(t: string) {
    setText(t);
    setAskError(null);
    if (!t.trim()) { setModeOverride(null); setScope("auto"); }
  }

  /** A list typed in one line fills the cards; each looks itself up, the person sees every match. */
  function fill() {
    const filled = rowsFromText(text, kindKey as KindKey, near).map((r) => ({ ...r, autoFind: true }));
    if (!filled.length) return;
    setRows((rs) => {
      const kept = rs.filter((r) => !isEmptyRow(r));
      const next = [...kept, ...filled].slice(0, MAX_ROWS);
      return next.length >= 2 ? next : [...next, ...startRows()].slice(0, 2);
    });
    onText("");
  }

  /** A concept: find the real candidates to pick from (nothing goes into the lineup by itself). */
  async function find() {
    setFinding(true);
    setStage(null);
    setAskError(null);
    try {
      const out = await discover({ text, kind: kindKey, area: near, scope }, { organizationId, onStage: setStage });
      if (out.kind !== kindKey && kinds.some((k) => k.key === out.kind && k.status === "live")) {
        setKindKey(out.kind);
        setRows(startRows());
      }
      if (out.reading.area && !near.trim() && out.kind === "local_business") setNear(out.reading.area);
      setDiscovered(out);
    } catch (err) {
      setAskError(err instanceof ComparisonRefusal ? err.userMessage : "That search did not answer. Try again.");
    } finally {
      setFinding(false);
      setStage(null);
    }
  }

  async function compare(matches: LookupMatch[]) {
    if (!kind || matches.length < 2) return;
    const ctrl = new AbortController();
    abort.current?.abort();
    abort.current = ctrl;
    const items: ComparisonItemInput[] = matches.map((m) => m.item);
    const record = discovered && discovered.kind === kind.key
      ? discoveryRecord(text || discovered.reading.summary, discovered, [
        ...discovered.items.map((i) => ({ match: i.match, rank: i.rank, picked: inLineup(rows, i.match) })),
        ...matches.filter((m) => !discovered.items.some((i) => sentId(i.match) === sentId(m)))
          .map((m) => ({ match: m, rank: null, picked: true })),
      ])
      : null;
    setRunKind(kind.key);
    setIdentities(matches.map((m) => ({ name: m.name, logoUrl: m.logo_url, website: m.website })));
    setProgress(matches.map((m, index) => ({ index, label: m.name, stage: "queued", stageLabel: "", current: null, total: null, done: false, error: null })));
    setStartedAt(Date.now());
    setRecovering(false);
    setResult(null);
    setFailure(null);
    setPhase("running");
    try {
      const out = await runComparison(kind.key, items, {
        organizationId,
        signal: ctrl.signal,
        discovery: record,
        onRunId: (runId) => { ownRun.current = runId; setRunInAddress(runId); },
        onProgress: (p) => setProgress((cur) => applyProgress(cur, p)),
        onRunState: (s) => setProgress((cur) => mergeRunProgress(cur, s.items)),
        onDropped: () => setRecovering(true),
      });
      setResult(out);
      setPhase("result");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setFailure(err instanceof ComparisonRefusal ? err.userMessage : "The comparison could not be run.");
      setPhase("failed");
    }
  }

  function startOver() {
    abort.current?.abort();
    ownRun.current = null;
    setRunInAddress(null);
    setResult(null);
    setFailure(null);
    setRows(startRows());
    setDiscovered(null);
    setModeOverride(null);
    setScope("auto");
    setText("");
    setPhase("build");
  }

  /** A result item that needs a pick goes back to the lineup with that place chosen. */
  function pick(item: ComparedItem, placeId: string) {
    const c = item.candidates.find((x) => x.pick === placeId);
    const match: LookupMatch = {
      item: c?.url && PLACE_LINK.test(c.url)
        ? { label: c.name || item.name, url: c.url }
        : { label: c?.name || item.name, inputs: { place_id: placeId } },
      name: c?.name || item.name, detail: c?.address ?? "", logo_url: null, website: null, url: c?.url ?? null,
      rating: c?.rating ?? null, reviews_count: c?.reviews_count ?? null,
    };
    const chosen = newRow({ name: match.name, state: "found", match, category: c?.category ?? "" });
    const sent = rows.filter((r) => r.state === "found" && r.match);
    if (sent.some((r) => r.match && sentId(r.match) === item.item_id)) {
      setRows(rows.map((r) => (r.match && sentId(r.match) === item.item_id ? { ...chosen, key: r.key } : r)));
    } else {
      // A page opened on a saved run has no lineup: rebuild it from the result.
      setRows((result?.items ?? []).filter((i) => !i.error).map((i) => (i.item_id === item.item_id ? chosen : newRow({
        name: i.name, state: "found", category: "",
        match: {
          item: { label: i.name, url: i.source_url ?? undefined, website: i.website ?? undefined, logo_url: i.logo_url ?? undefined },
          name: i.name, detail: i.website ?? "", logo_url: i.logo_url, website: i.website, url: i.source_url,
          rating: null, reviews_count: null,
        },
      }))));
    }
    ownRun.current = null;
    setRunInAddress(null);
    setPhase("build");
  }

  if (phase === "result" && result) {
    const savedRunId = params.get("run");
    return (
      <>
        <ComparisonView
          result={result}
          factsHref={(i) => (i.table_id ? `/data/${i.table_id}` : null)}
          onPick={pick}
          actions={<><ShareButton /><Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={startOver}>New comparison</Button></>}
        />
        {savedRunId ? (
          <div className="pt-4">
            <CompareLayerInputs runId={savedRunId} organizationId={organizationId} />
          </div>
        ) : null}
      </>
    );
  }

  if (phase === "running") {
    return (
      <RunProgress kind={runKind} kindLabel={runKindInfo?.label ?? "Comparison"} items={progress}
        identities={identities} startedAt={startedAt} recovering={recovering} />
    );
  }

  if (phase === "failed") {
    return (
      <div className="space-y-4">
        <ErrorNotice message={failure ?? "The comparison could not be run."} />
        <div className="flex gap-2">
          {rows.some((r) => r.state === "found") ? <Button variant="primary" onClick={() => setPhase("build")}>Back</Button> : null}
          <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={startOver}>New comparison</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Compare</h1>
        <div className="flex flex-wrap gap-2" role="group" aria-label="What to compare">
          {kinds.map((k) => {
            const meta = KIND_UI[k.key];
            const soon = k.status !== "live";
            return (
              <Button key={k.key} variant="outline" pressed={k.key === kindKey && !soon} icon={meta?.icon}
                meta={soon ? "Soon" : undefined}
                onClick={() => (soon ? void announceComingSoon(meta?.soonId ?? k.key) : switchKind(k.key))}>
                {meta?.label ?? k.label}
              </Button>
            );
          })}
        </div>
      </div>

      <AskBar kindKey={kindKey} text={text} onText={onText} near={near} mode={mode} onMode={setModeOverride}
        scope={scope} onScope={setScope} finding={finding} stage={stage} organizationId={organizationId}
        onFind={() => void find()} onFill={fill} />
      {askError ? <ErrorNotice message={askError} /> : null}

      {discovered ? (
        <PickList result={discovered} rows={rows}
          onAdd={(picks) => setRows((rs) => picks.reduce((acc, p) => placePick(acc, p.match, p.category), rs))}
          onClose={() => setDiscovered(null)} />
      ) : null}

      {kind ? (
        <Lineup kind={kind} rows={rows} onRows={setRows} near={near} onNear={setNear}
          organizationId={organizationId} seesDollars={seesDollars} onCompare={(m) => void compare(m)} />
      ) : null}
    </div>
  );
}
