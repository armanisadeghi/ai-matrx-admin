"use client";

/**
 * /compare — the deterministic comparison engine's home (aidream `services/comparison`).
 *
 *   type anything → "Here's what we found" (matched, candidates, add/remove, the quote) → Compare
 *   → honest per-item progress → the result stage (`components/ComparisonView`).
 *
 * Drop-safe: the run id is the stream's first event and goes into the address (`?run=`). A dropped
 * connection, a refresh or a new tab follows the saved run (`GET /comparison/runs/{id}`) to its end.
 * No AI in this layer. A CONCEPT ("best bike shops in Bend") goes through discovery (branches A/C,
 * `./discovery.ts`): we find the list, say how, the person picks — then the same compare runs.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorNotice, ReadFailure } from "@ai-matrx/design-system";

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { useSeesDollars } from "@/components/cost/useCostDisplay";
import { CompareLayerInputs } from "@/features/provision-window/CompareLayerInputs";

import { useComparisonKinds, useComparisonOrganizationId } from "./hooks";
import { followRun, lookupItems, runComparison } from "./server";
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
import { parseInput, type KindKey } from "./parse-input";
import { discover, discoveryRecord, inferMode, type DiscoverResult, type InputMode, type Scope } from "./discovery";
import { DiscoveryStep, rowsOf, type DiscoveryRow } from "./components/DiscoveryStep";
import { CompareInput } from "./components/CompareInput";
import { ComparisonView } from "./components/ComparisonView";
import { FoundStep, type FoundRow } from "./components/FoundStep";
import { FacetOptions } from "./components/FacetOptions";
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

type Phase = "input" | "found" | "discovered" | "running" | "result" | "failed";

function setRunInAddress(runId: string | null) {
  const url = new URL(window.location.href);
  if (runId) url.searchParams.set("run", runId);
  else url.searchParams.delete("run");
  replaceAddressWithoutNavigating(url);
}

/** A map listing link that names one place exactly (the place reader's own form). */
const PLACE_LINK = /\/maps\/place\/.*data=.*!1s0x/;

let rowSeq = 0;
const rowKey = () => `r${++rowSeq}`;

function CompareBody({ kinds, organizationId }: { kinds: ComparisonKindInfo[]; organizationId: string }) {
  const seesDollars = useSeesDollars();
  const params = useSearchParams();
  const live = kinds.filter((k) => k.status === "live");
  const [kindKey, setKindKey] = useState<string>(live[0]?.key ?? "");
  const [text, setText] = useState(() => params.get("q") ?? ""); // a public-page hand-off arrives as ?q=
  const [area, setArea] = useState("");
  // A page opened on ?run=<id> (a refresh, a new tab, a shared link) starts on that saved run.
  const runParam = params.get("run");
  const [phase, setPhase] = useState<Phase>(runParam ? "running" : "input");
  const [finding, setFinding] = useState(false);
  const [rows, setRows] = useState<FoundRow[]>([]);
  const [lookupPoints, setLookupPoints] = useState(0);
  const [adding, setAdding] = useState(false);
  const [progress, setProgress] = useState<ItemProgress[]>([]);
  const [identities, setIdentities] = useState<ProgressRowIdentity[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [recovering, setRecovering] = useState(Boolean(runParam));
  const [runKind, setRunKind] = useState<string>(kindKey);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<InputMode | null>(null);
  const [scope, setScope] = useState<Scope>("auto");
  const [stage, setStage] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<DiscoverResult | null>(null);
  const [discoveryRows, setDiscoveryRows] = useState<DiscoveryRow[]>([]);
  const abort = useRef<AbortController | null>(null);
  // The run THIS tab started: its own stream is already following it, so the address must not start a second reader.
  const ownRun = useRef<string | null>(null);

  // Leaving the page stops this tab's reading (the run itself carries on on the server).
  useEffect(() => () => abort.current?.abort(), []);

  const kind = kinds.find((k) => k.key === kindKey) ?? null;
  const runKindInfo = kinds.find((k) => k.key === runKind) ?? kind;

  // …and follows it to its end.
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

  async function find() {
    if (!kind) return;
    const parsed = parseInput(text, kindKey as KindKey, area);
    const useKind = parsed.suggestedKind && kinds.some((k) => k.key === parsed.suggestedKind && k.status === "live")
      ? parsed.suggestedKind : kindKey;
    if (useKind !== kindKey) setKindKey(useKind);
    setFinding(true);
    setLookupError(null);
    try {
      const out = await lookupItems(useKind, parsed.items.map((i) => i.input), { organizationId });
      setRows(out.items.map((it) => ({ ...it, key: rowKey(), query: parsed.items[it.index]?.text ?? it.query })));
      setLookupPoints(out.points);
      setPhase("found");
    } catch (err) {
      setLookupError(err instanceof ComparisonRefusal ? err.userMessage : "We could not look those up. Try again.");
    } finally {
      setFinding(false);
    }
  }

  const mode: InputMode = modeOverride ?? inferMode(text, kindKey as KindKey);

  function onText(t: string) {
    setText(t);
    if (!t.trim()) { setModeOverride(null); setScope("auto"); }
  }

  /** Branch A/C: find the list for a concept, then show it to pick from. */
  async function runDiscover() {
    setFinding(true);
    setStage(null);
    setLookupError(null);
    try {
      const out = await discover({ text, kind: kindKey, area, scope }, { organizationId, onStage: setStage });
      if (kinds.some((k) => k.key === out.kind)) setKindKey(out.kind);
      setDiscovered(out);
      setDiscoveryRows(rowsOf(out, () => rowKey()));
      setPhase("discovered");
    } catch (err) {
      setLookupError(err instanceof ComparisonRefusal ? err.userMessage : "That search did not answer. Try again.");
    } finally {
      setFinding(false);
      setStage(null);
    }
  }

  /** "Add your own" on a found list: looked up like any typed item, added ticked. */
  async function addToDiscovery(textToAdd: string) {
    if (!discovered) return;
    const parsed = parseInput(textToAdd, discovered.kind as KindKey, area);
    if (!parsed.items.length) return;
    setAdding(true);
    setLookupError(null);
    try {
      const out = await lookupItems(discovered.kind, parsed.items.map((i) => i.input), { organizationId });
      const added: DiscoveryRow[] = [];
      for (const it of out.items) {
        if (it.status === "found" && it.match) added.push({ key: rowKey(), match: it.match, rank: null, note: "", picked: true });
        else if (it.status === "choose") added.push(...it.candidates.map((c) => ({ key: rowKey(), match: c, rank: null, note: "Pick one", picked: false })));
        else setLookupError(it.message ?? "We could not find that.");
      }
      setDiscoveryRows((rs) => [...rs, ...added]);
      setLookupPoints((p) => p + out.points);
    } catch (err) {
      setLookupError(err instanceof ComparisonRefusal ? err.userMessage : "We could not look that up.");
    } finally {
      setAdding(false);
    }
  }

  async function addOne(textToAdd: string) {
    const parsed = parseInput(textToAdd, kindKey as KindKey, area);
    if (!parsed.items.length) return;
    setAdding(true);
    try {
      const out = await lookupItems(kindKey, parsed.items.map((i) => i.input), { organizationId });
      setRows((rs) => [...rs, ...out.items.map((it) => ({ ...it, key: rowKey(), query: parsed.items[it.index]?.text ?? it.query }))]);
      setLookupPoints((p) => p + out.points);
    } catch (err) {
      setLookupError(err instanceof ComparisonRefusal ? err.userMessage : "We could not look that up.");
    } finally {
      setAdding(false);
    }
  }

  async function compare(matches: LookupMatch[], discovery: Record<string, unknown> | null = null) {
    if (!kind || matches.length < 2) return;
    const ctrl = new AbortController();
    abort.current?.abort();
    abort.current = ctrl;
    const items: ComparisonItemInput[] = matches.map((m) => m.item);
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
        discovery,
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
    setRows([]);
    setDiscovered(null);
    setDiscoveryRows([]);
    setModeOverride(null);
    setScope("auto");
    setText("");
    setLookupPoints(0);
    setPhase("input");
  }

  /** A result item that needs a pick goes back to "found" with that place chosen. */
  function pick(item: ComparedItem, placeId: string) {
    const c = item.candidates.find((x) => x.pick === placeId);
    const match: LookupMatch = {
      // The place's own map link reads exactly that place; a bare place_id is refused by the reader (2026-10-18).
      item: c?.url && PLACE_LINK.test(c.url)
        ? { label: c?.name ?? item.name, url: c.url }
        : { label: c?.name ?? item.name, inputs: { place_id: placeId } },
      name: c?.name ?? item.name, detail: c?.address ?? "", logo_url: null, website: null, url: c?.url ?? null,
      rating: c?.rating ?? null, reviews_count: c?.reviews_count ?? null,
    };
    // Keep every original row (its candidates, rating, logo) and swap only the picked one. The
    // result lists the compared rows in the order they were sent: the found rows with a match.
    const sent = rows.filter((r) => r.status === "found" && r.match);
    const at = (result?.items ?? []).findIndex((i) => i.item_id === item.item_id);
    const target = at >= 0 ? sent[at] : undefined;
    if (target) {
      setRows(rows.map((r) => (r.key === target.key
        ? { ...r, status: "found", match, open: false, candidates: r.candidates.length ? r.candidates : [match] }
        : r)));
    } else {
      // A page opened on a saved run has no found rows: rebuild them from the result.
      setRows((result?.items ?? []).filter((i) => !i.error).map((i, index): FoundRow => i.item_id === item.item_id
        ? { key: rowKey(), index, query: i.name, status: "found", match, candidates: [match], message: null }
        : { key: rowKey(), index, query: i.name, status: "found", candidates: [], message: null,
            match: {
              item: { label: i.name, url: i.source_url ?? undefined, website: i.website ?? undefined, logo_url: i.logo_url ?? undefined },
              name: i.name, detail: i.website ?? "", logo_url: i.logo_url, website: i.website, url: i.source_url,
              rating: null, reviews_count: null,
            } }));
    }
    ownRun.current = null;
    setRunInAddress(null);
    setPhase("found");
  }

  if (phase === "result" && result) {
    const savedRunId = params.get("run");
    return (
      <>
        <ComparisonView
          result={result}
          seesDollars={seesDollars}
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
          {discovered ? <Button variant="primary" onClick={() => setPhase("discovered")}>Back</Button>
            : rows.length ? <Button variant="primary" onClick={() => setPhase("found")}>Back</Button> : null}
          <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={startOver}>New comparison</Button>
        </div>
      </div>
    );
  }

  if (phase === "found" && kind) {
    return (
      <div className="space-y-4">
        {lookupError ? <ErrorNotice message={lookupError} /> : null}
        <FacetOptions kind={kind} itemCount={rows.filter((r) => r.status === "found").length} />
        <FoundStep kind={kind} rows={rows} organizationId={organizationId} seesDollars={seesDollars}
          lookupPoints={lookupPoints} adding={adding} onRows={setRows} onAdd={(t) => void addOne(t)}
          onBack={() => setPhase("input")} onCompare={(m) => void compare(m)} starting={false} />
      </div>
    );
  }

  const discoveredKind = discovered ? kinds.find((k) => k.key === discovered.kind) ?? null : null;
  if (phase === "discovered" && discovered && discoveredKind) {
    return (
      <div className="space-y-4">
        {lookupError ? <ErrorNotice message={lookupError} /> : null}
        <DiscoveryStep kind={discoveredKind} result={discovered} rows={discoveryRows} organizationId={organizationId}
          seesDollars={seesDollars} adding={adding} onRows={setDiscoveryRows} onAdd={(t) => void addToDiscovery(t)}
          onBack={() => setPhase("input")}
          onCompare={(m) => void compare(m, discoveryRecord(text, discovered, discoveryRows))} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Compare</h1>
      <CompareInput kinds={kinds} kindKey={kindKey} onKind={setKindKey} text={text} onText={onText}
        area={area} onArea={setArea} onFind={() => void find()} finding={finding}
        mode={mode} onMode={setModeOverride} scope={scope} onScope={setScope}
        onDiscover={() => void runDiscover()} organizationId={organizationId} stage={stage} />
      {lookupError ? <ErrorNotice message={lookupError} /> : null}
    </div>
  );
}
