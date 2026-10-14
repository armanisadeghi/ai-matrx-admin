"use client";

/**
 * Smart Add · the person "harder" path — find-you mode (PATHS.md `person_harder`; VISION Part 10).
 *
 * Shown when the anchor round's path decision runs `person_harder`. Four buckets, never ignoring a real result:
 * (a) a same-name directory page (LinkedIn /pub/dir/…) as ONE "Pick one / None of these" question at the top,
 *     its people from SerpAPI `site:linkedin.com/in` + the Bright Data LinkedIn search (polled, with progress);
 * (c) the top 10 non-social pages, early: "Is this about you?" Yes it's me / Not me / Skip;
 * (b) socials batched per platform: "Which of these Instagram accounts is you?" Pick one / None;
 * (d) aggregators dropped (a ZoomInfo snippet shows as a clue only).
 * Every "yes" teaches clues (server-read: employer, title, city, handle, site) that run targeted queries, until one
 * FIRM anchor is confirmed (an account, a personal site, an employer bio page or a licence record).
 * Server: aidream services/brand_intake/person_harder.py. Deeper pages run on click only.
 */

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Check, ChevronDown, SearchX, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { OpenLink } from "../SmartAddExtras";
import { pollLinkedinJob } from "../helpers/service";
import { onHelperAnswer } from "../helpers/store";
import type { HelperCandidate } from "../helpers/types";
import type { SweepFeed } from "@/features/builder-panel/components/BuilderDecisionsTab";
import { FocusList, SweepReview, focusKeyOf, sweepCandidate } from "./FindAnything";
import { runFindYou, runHarderRound } from "./service";
import type {
  Clue,
  FindLogEntry,
  FindYouPath,
  FindYouProvision,
  FindYouResult,
  FocusState,
  HarderAnswer,
  HarderCandidate,
  HarderResult,
  SweepAnswer,
  SweepRow,
  TierCount,
} from "./types";

const POLL_MS = 6_000;
const HARD_PATHS: readonly string[] = ["person_hard", "person_near_impossible"];

interface Sweep {
  path: FindYouPath;
  rows: SweepRow[];
  tiers: TierCount[];
  filters: FindYouResult["filters"];
  calls: FindYouResult["calls"];
  googleNext: number | null;
  platformsFirst: boolean;
  points: number | null;
  ms: number;
}

function withSweep(cur: Sweep | null, r: FindYouResult): Sweep {
  const byKey = new Map((cur?.rows ?? []).map((x) => [x.key, x]));
  for (const row of r.rows) if (!byKey.has(row.key)) byKey.set(row.key, row);
  const rows = [...byKey.values()];
  const order = ["strong", "mid", "low", "junk"];
  rows.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier) || b.score - a.score);
  return {
    path: r.sweep_path,
    rows,
    tiers: r.tiers.map((t) => ({ ...t, count: rows.filter((x) => x.tier === t.key).length })),
    filters: [...(cur?.filters ?? []), ...r.filters],
    calls: [...(cur?.calls ?? []), ...r.calls],
    googleNext: r.google_next_page,
    platformsFirst: r.platforms_first,
    points: cur?.points == null && cur ? null : r.points == null ? null : (cur?.points ?? 0) + r.points,
    ms: (cur?.ms ?? 0) + r.ms,
  };
}

export interface FindYouInput {
  name: string;
  city: string;
  occupation: string;
  company: string;
  extra: string;
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function asHarder(c: HelperCandidate, bucket: HarderCandidate["bucket"]): HarderCandidate {
  return { ...c, bucket, score: 0, reasons: [], anchor_kind: "social", firm: true, clues: [] };
}

function mergeInto(list: HarderCandidate[], incoming: HarderCandidate[]): HarderCandidate[] {
  const out = [...list];
  for (const c of incoming) {
    const i = out.findIndex((x) => x.key === c.key);
    if (i < 0) out.push(c);
    else out[i] = { ...c, ...out[i], sources: [...new Set([...out[i].sources, ...c.sources])] };
  }
  return out.sort((a, b) => b.score - a.score);
}

interface Buckets {
  directory: HarderResult["directory"];
  socials: Record<string, HarderCandidate[]>;
  web: HarderCandidate[];
  aggregators: string[];
  aggregatorClues: HarderCandidate[];
  more: Record<string, boolean>;
}

const EMPTY: Buckets = { directory: null, socials: {}, web: [], aggregators: [], aggregatorClues: [], more: {} };

function absorb(b: Buckets, r: HarderResult): Buckets {
  const socials = { ...b.socials };
  for (const [p, list] of Object.entries(r.socials)) socials[p] = mergeInto(socials[p] ?? [], list);
  const directory = r.directory
    ? {
        ...r.directory,
        pages: [...new Set([...(b.directory?.pages ?? []), ...r.directory.pages])],
        candidates: mergeInto(b.directory?.candidates ?? [], r.directory.candidates),
        job: r.directory.job ?? b.directory?.job ?? null,
      }
    : b.directory;
  return {
    directory,
    socials,
    web: mergeInto(b.web, r.web),
    aggregators: [...new Set([...b.aggregators, ...r.filtered_aggregators])],
    aggregatorClues: mergeInto(b.aggregatorClues, r.aggregator_clues),
    more: { ...b.more, ...r.more },
  };
}

export function PersonHarderStage({
  input,
  path = "person_harder",
  knownUrls = [],
  grounded,
  onConfirm,
  onLog,
  onEscalate,
  onProvision,
  onSweep,
}: {
  input: FindYouInput;
  /** The person's path: person_harder, or person_hard / person_near_impossible (adds the find-anything sweep). */
  path?: string;
  /** Pages already confirmed or answered on the screen: the sweep removes them and their look-alikes. */
  knownUrls?: string[];
  /** "Dig deeper": one rung down (harder → hard → close to impossible). The sweep runs once; deeper rungs reuse it. */
  onEscalate?: () => void;
  /** `person.find_you` for the next round's workflow inputs (the mandate provisions read it). */
  onProvision?: (p: FindYouProvision) => void;
  /** The sweep's calls, rows and filters for the Builder panel (admins). */
  onSweep?: (feed: SweepFeed | null, focus: Record<string, FocusState>) => void;
  /** One FIRM anchor is confirmed: find-you mode ends. */
  grounded: boolean;
  /** A "yes" on a result (the screen lands it: an account, the person's site, or a page anchor). */
  onConfirm: (c: HarderCandidate) => void;
  onLog: (entry: FindLogEntry) => void;
}) {
  const [buckets, setBuckets] = useState<Buckets>(EMPTY);
  const [answers, setAnswers] = useState<Record<string, HarderAnswer>>({});
  const [clues, setClues] = useState<Clue[]>([]);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<Record<string, number>>({});
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const done = useRef<string[]>([]);
  const started = useRef(false);
  const hard = HARD_PATHS.includes(path);
  const [sweep, setSweep] = useState<Sweep | null>(null);
  const [sweepAnswers, setSweepAnswers] = useState<Record<string, SweepAnswer>>({});
  const [focus, setFocus] = useState<Record<string, FocusState>>({});
  const [gaveUp, setGaveUp] = useState(false);
  const [history, setHistory] = useState<FindYouProvision["history"]>([]);
  const sweepStarted = useRef(false);

  /** The hard paths' sweep (Brave + Google, tiered) with the harder round inside; `googlePage` = one deeper page. */
  const sweepRound = async (opts: { first: boolean; googlePage?: number }) => {
    if (!HARD_PATHS.includes(path)) return;
    sweepStarted.current = true;
    setBusy((n) => n + 1);
    setError(null);
    try {
      const r = await runFindYou({
        name: input.name,
        city: input.city || null,
        occupation: input.occupation || null,
        company: input.company || null,
        extra: input.extra || null,
        clues,
        done_queries: done.current,
        page: 1,
        deepen: null,
        first: opts.first,
        path: path as FindYouPath,
        known_urls: knownUrls,
        google_page: opts.googlePage ?? 0,
      });
      done.current = [...done.current, ...r.queries.map((q) => q.query), ...r.calls.filter((c) => c.page === 1 && c.engine === "google").map((c) => c.query)];
      setBuckets((b) => absorb(b, r));
      setSweep((cur) => withSweep(cur, r));
      if (r.error) setError(r.error);
      for (const d of r.decisions) onLog({ at: Date.now(), kind: "round", text: d, points: null });
      onLog({ at: Date.now(), kind: "round", text: `Sweep cost: ${r.points ?? "?"} points in ${r.ms} ms`, points: r.points });
      if (r.directory?.job?.snapshot_id) void poll(r.directory.job.snapshot_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The search failed");
    } finally {
      setBusy((n) => n - 1);
    }
  };

  const round = async (opts: { first: boolean; clues?: Clue[]; page?: number; deepen?: string | null }) => {
    setBusy((n) => n + 1);
    setError(null);
    try {
      const r = await runHarderRound({
        name: input.name,
        city: input.city || null,
        occupation: input.occupation || null,
        company: input.company || null,
        extra: input.extra || null,
        clues: opts.clues ?? clues,
        done_queries: done.current,
        page: opts.page ?? 1,
        deepen: opts.deepen ?? null,
        first: opts.first,
      });
      done.current = [...done.current, ...r.queries.map((q) => q.query)];
      setBuckets((b) => absorb(b, r));
      if (r.error) setError(r.error);
      for (const d of r.decisions) onLog({ at: Date.now(), kind: "round", text: d, points: null });
      for (const q of r.queries) onLog({ at: Date.now(), kind: "round", text: `Query: ${q.query} (p${q.page}) → ${q.results} · ${q.why}` });
      onLog({ at: Date.now(), kind: "round", text: `Round cost: ${r.points ?? "?"} points in ${r.ms} ms`, points: r.points });
      if (r.directory?.job?.snapshot_id) void poll(r.directory.job.snapshot_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The search failed");
    } finally {
      setBusy((n) => n - 1);
    }
  };

  const poll = async (snapshot: string) => {
    setJobStatus("LinkedIn search running");
    for (let i = 0; i < 40; i++) {
      await new Promise((res) => setTimeout(res, POLL_MS));
      try {
        const job = await pollLinkedinJob(snapshot);
        if (job.status === "running") {
          setJobStatus(`LinkedIn search running · ${Math.round(((i + 1) * POLL_MS) / 1000)} s`);
          continue;
        }
        const found = job.candidates.filter((c) => c.platform === "linkedin").map((c) => asHarder(c, "directory"));
        setBuckets((b) => ({
          ...b,
          directory: { platform: "linkedin", pages: b.directory?.pages ?? [], job: b.directory?.job ?? null, candidates: mergeInto(b.directory?.candidates ?? [], found) },
        }));
        setJobStatus(job.status === "done" ? null : `LinkedIn search ${job.status}`);
        onLog({ at: Date.now(), kind: "round", text: `LinkedIn people search ${job.status}: ${found.length} people`, points: job.points });
        return;
      } catch (e) {
        setJobStatus(e instanceof Error ? `LinkedIn search: ${e.message}` : "LinkedIn search failed");
        return;
      }
    }
    setJobStatus("LinkedIn search still running");
  };

  const start = useEffectEvent(() => void (HARD_PATHS.includes(path) ? sweepRound({ first: true }) : round({ first: true })));
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, []);
  // Escalated mid-session (harder → hard): the sweep runs once, without repeating the searches already done.
  const escalated = useEffectEvent(() => void sweepRound({ first: false }));
  useEffect(() => {
    if (hard && started.current && !sweepStarted.current) escalated();
  }, [hard]);
  // A find in a focused window (any helper): that platform's session is done, with a find.
  const helperFound = useEffectEvent((c: HelperCandidate) => {
    const key = focusKeyOf(c.platform);
    setFocus((cur) => ({ ...cur, [key]: { status: "done", found: true } }));
    setHistory((h) => [...h, { query: `focused session: ${key}`, answer: "me", firm_anchor: true, bucket: `focus:${key}`, url: c.url }]);
    onLog({ at: Date.now(), kind: "anchor", text: `Found in the ${key} window: ${c.url}`, bucket: `focus:${key}`, url: c.url });
  });
  useEffect(() => onHelperAnswer((c, a) => (a === "me" ? helperFound(c) : undefined)), []);
  // person.find_you (the next round's workflow input) and the Builder feed, kept current every render.
  useEffect(() => {
    onProvision?.({
      path,
      clues,
      buckets: {
        tiers: (sweep?.tiers ?? []).map((t) => ({ key: t.key, label: t.label, rows: (sweep?.rows ?? []).filter((r) => r.tier === t.key) })),
        directory: buckets.directory?.candidates ?? [],
        socials: buckets.socials,
        web: buckets.web,
        filters: sweep?.filters ?? [],
      },
      history,
      focus,
    });
    onSweep?.(
      sweep
        ? {
            path: sweep.path,
            calls: sweep.calls,
            filters: sweep.filters,
            points: sweep.points,
            ms: sweep.ms,
            rows: sweep.rows.map((r) => ({
              url: r.url,
              title: r.title,
              tier: r.tier,
              tier_reason: r.tier_reason,
              score: r.score,
              engines: [...new Set(r.hits.map((h) => h.engine))].join(" + "),
              best_rank: Math.min(...r.hits.map((h) => h.rank)),
              answer: sweepAnswers[r.key] ?? null,
              raw: r.raw,
            })),
          }
        : null,
      focus,
    );
  });

  const answerSweep = (row: SweepRow, a: SweepAnswer | null) => {
    setSweepAnswers((cur) => {
      const next = { ...cur };
      if (a) next[row.key] = a;
      else delete next[row.key];
      return next;
    });
    if (!a) return;
    const tierLabel = sweep?.tiers.find((t) => t.key === row.tier)?.label ?? row.tier;
    setHistory((h) => [...h, { query: row.hits[0]?.query ?? "", answer: a, firm_anchor: a === "me" && row.firm, bucket: `sweep:${row.tier}`, url: row.url }]);
    if (a === "me") answer(sweepCandidate(row), "me", `Sweep · ${tierLabel}`);
    else onLog({ at: Date.now(), kind: "answer", text: `Sweep · ${tierLabel}: ${a} · ${row.title ?? row.url}`, bucket: `sweep:${row.tier}`, url: row.url });
  };

  const answer = (c: HarderCandidate, a: HarderAnswer, bucketLabel: string) => {
    setAnswers((cur) => ({ ...cur, [c.key]: a }));
    onLog({ at: Date.now(), kind: "answer", text: `${bucketLabel}: ${a} · ${c.name ?? c.url}`, bucket: c.bucket, url: c.url });
    if (a !== "me") return;
    onConfirm(c);
    if (c.firm) {
      onLog({ at: Date.now(), kind: "anchor", text: `FIRM anchor (${c.anchor_kind}) from ${bucketLabel}: ${c.url}`, bucket: c.bucket, url: c.url });
      return;
    }
    const known = new Set(clues.map((x) => `${x.kind}:${x.value.toLowerCase()}`));
    const fresh = c.clues.filter((x) => !known.has(`${x.kind}:${x.value.toLowerCase()}`));
    if (!fresh.length) return;
    const next = [...clues, ...fresh];
    setClues(next);
    for (const x of fresh) onLog({ at: Date.now(), kind: "clue", text: `Clue ${x.kind}: ${x.value}`, url: c.url });
    void round({ first: false, clues: next });
  };

  const pickNone = (list: HarderCandidate[], bucketLabel: string) => {
    setAnswers((cur) => ({ ...cur, ...Object.fromEntries(list.map((c) => [c.key, "not_me" as const])) }));
    onLog({ at: Date.now(), kind: "answer", text: `${bucketLabel}: none of these (${list.length})` });
  };

  const deeper = (bucket: string) => {
    const page = (pages[bucket] ?? 1) + 1;
    setPages((p) => ({ ...p, [bucket]: page }));
    void round({ first: false, page, deepen: bucket });
  };

  if (grounded) {
    return (
      <section data-testid="smart-add-find-you" className="rounded-xl border border-border bg-card p-3 text-sm text-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Check className="size-4 text-primary" aria-hidden /> Found you
        </span>
      </section>
    );
  }

  const meFound = Object.values(sweepAnswers).includes("me") || Object.values(answers).includes("me");
  const allSweepAnswered = Boolean(sweep?.rows.length) && sweep!.rows.every((r) => sweepAnswers[r.key]);
  const stuck = hard && Boolean(sweep) && busy === 0 && !meFound && (gaveUp || allSweepAnswered || !sweep!.rows.length);
  const openFocus = (key: string) => {
    setFocus((cur) => ({ ...cur, [key]: { status: "open", found: cur[key]?.found ?? false } }));
    onLog({ at: Date.now(), kind: "round", text: `Focused session opened: ${key}`, bucket: `focus:${key}` });
  };
  const doneFocus = (key: string) => {
    setFocus((cur) => ({ ...cur, [key]: { status: "done", found: cur[key]?.found ?? false } }));
    setHistory((h) => [...h, { query: `focused session: ${key}`, answer: "nothing", firm_anchor: false, bucket: `focus:${key}` }]);
    onLog({ at: Date.now(), kind: "answer", text: `Focused session done: ${key} (nothing found)`, bucket: `focus:${key}` });
  };
  const dir = buckets.directory;
  const webShown = buckets.web.filter((c) => answers[c.key] !== "skip").slice(0, 10 * (pages.web ?? 1));
  const searching = busy > 0;

  return (
    <section data-testid="smart-add-find-you" aria-label="Find you" className="flex w-full flex-col gap-4">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Let&apos;s find you</h2>
        <span className="text-xs text-muted-foreground" data-testid="smart-add-find-status">
          {searching
            ? hard && !sweep
              ? "Searching the web, up to 150 results…"
              : "Searching…"
            : stuck
              ? "Nothing matched yet"
              : clues.length
                ? `${clues.length} clues`
                : null}
        </span>
      </header>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {dir && (dir.candidates.length || jobStatus) ? (
        <PickOne
          testId="smart-add-pick-directory"
          title={`Which ${input.name} on ${platformLabel(dir.platform)} is you?`}
          status={jobStatus}
          list={dir.candidates}
          answers={answers}
          onPick={(c) => answer(c, "me", "Pick one")}
          onNone={() => pickNone(dir.candidates, "Pick one")}
        />
      ) : null}

      {hard && sweep && (sweep.platformsFirst || stuck) ? (
        <FocusList focus={focus} stuck={stuck} onOpen={openFocus} onDone={doneFocus} />
      ) : null}

      {hard && sweep ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Anything here about you?</h3>
            <span className="text-xs text-muted-foreground" data-testid="smart-add-sweep-count">
              {sweep.rows.length} results · {sweep.tiers.find((t) => t.key === "strong")?.count ?? 0} best
            </span>
          </div>
          {sweep.rows.length ? (
            <SweepReview name={input.name} rows={sweep.rows} tiers={sweep.tiers} answers={sweepAnswers} onAnswer={answerSweep} />
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {sweep.googleNext ? (
              <Button variant="quiet" icon={<ChevronDown aria-hidden />} disabled={searching} onClick={() => void sweepRound({ first: false, googlePage: sweep.googleNext ?? undefined })}>
                {`More from Google · page ${sweep.googleNext}`}
              </Button>
            ) : null}
            {!stuck ? (
              <Button variant="quiet" icon={<SearchX aria-hidden />} onClick={() => setGaveUp(true)} data-testid="smart-add-not-here">
                None of these are me
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {webShown.length ? (
        <div data-testid="smart-add-web-about" className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Is this about you?</h3>
          <ul className="flex flex-col gap-1.5">
            {webShown.map((c) => (
              <WebRow key={c.key} c={c} answer={answers[c.key] ?? null} onAnswer={(a) => answer(c, a, "Web")} />
            ))}
          </ul>
          {buckets.more.web ? (
            <Button variant="quiet" icon={<ChevronDown aria-hidden />} disabled={searching} onClick={() => deeper("web")}>
              More results
            </Button>
          ) : null}
        </div>
      ) : null}

      {Object.entries(buckets.socials)
        .filter(([, list]) => list.length)
        .map(([platform, list]) => (
          <PickOne
            key={platform}
            testId={`smart-add-pick-${platform}`}
            title={`Which of these ${platformLabel(platform)} accounts is you?`}
            list={list}
            answers={answers}
            onPick={(c) => answer(c, "me", platformLabel(platform))}
            onNone={() => pickNone(list, platformLabel(platform))}
            onMore={buckets.more[platform] ? () => deeper(platform) : undefined}
            busy={searching}
          />
        ))}

      {buckets.aggregators.length ? (
        <p className="text-xs text-muted-foreground">
          {buckets.aggregators.length} people-search sites hidden
          {buckets.aggregatorClues.length ? ` · clue: ${buckets.aggregatorClues[0].snippet ?? ""}` : ""}
        </p>
      ) : null}
      {!searching && !dir && !webShown.length && !Object.keys(buckets.socials).length && !sweep?.rows.length ? (
        <p className="text-sm text-muted-foreground">Nothing found yet</p>
      ) : null}
      {hard && sweep && !sweep.platformsFirst && !stuck ? (
        <FocusList focus={focus} stuck={false} onOpen={openFocus} onDone={doneFocus} />
      ) : null}
      {path !== "person_near_impossible" && onEscalate && !searching && (!hard || stuck) ? (
        <Button variant="quiet" icon={<SearchX aria-hidden />} className="self-start" onClick={onEscalate} data-testid="smart-add-dig-deeper">
          Still not you? Dig deeper
        </Button>
      ) : null}
    </section>
  );
}

function Avatar({ c }: { c: HarderCandidate }) {
  const platform = c.platform === "website" ? "website" : c.platform;
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
      {c.image_url ? <img src={c.image_url} alt="" className="size-full object-cover" /> : <PlatformMark platform={platform} size={18} />}
    </span>
  );
}

function PickOne({
  testId,
  title,
  status,
  list,
  answers,
  onPick,
  onNone,
  onMore,
  busy,
}: {
  testId: string;
  title: string;
  status?: string | null;
  list: HarderCandidate[];
  answers: Record<string, HarderAnswer>;
  onPick: (c: HarderCandidate) => void;
  onNone: () => void;
  onMore?: () => void;
  busy?: boolean;
}) {
  const picked = list.find((c) => answers[c.key] === "me");
  const none = list.length > 0 && list.every((c) => answers[c.key] === "not_me");
  return (
    <div data-testid={testId} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
      </div>
      <ul className="flex flex-col gap-1">
        {list.slice(0, 12).map((c) => {
          const on = picked?.key === c.key;
          return (
            <li key={c.key} className={`flex items-center gap-2 rounded-lg px-1.5 py-1 ${on ? "bg-primary/10 ring-1 ring-primary" : ""} ${picked && !on ? "opacity-50" : ""}`}>
              <Avatar c={c} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-foreground">
                  {c.name ?? c.handle ?? host(c.url)}
                  {c.handle ? <span className="text-muted-foreground"> · @{c.handle}</span> : null}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[c.headline, c.employer, c.location, c.followers != null ? `${formatCount(c.followers)} followers` : null]
                    .filter(Boolean)
                    .join(" · ") || c.snippet}
                </span>
              </div>
              <OpenLink url={c.url} />
              <Button variant={on ? "primary" : "outline"} icon={<Check aria-hidden />} aria-pressed={on} onClick={() => onPick(c)}>
                This one
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-1.5">
        <Button variant={none ? "primary" : "quiet"} icon={<X aria-hidden />} aria-pressed={none} onClick={onNone}>
          None of these
        </Button>
        {onMore ? (
          <Button variant="quiet" icon={<ChevronDown aria-hidden />} disabled={busy} onClick={onMore}>
            More
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function WebRow({ c, answer, onAnswer }: { c: HarderCandidate; answer: HarderAnswer | null; onAnswer: (a: HarderAnswer) => void }) {
  return (
    <li className={`flex items-start gap-2 rounded-lg border p-2 ${answer === "me" ? "border-primary ring-1 ring-primary" : "border-border"} ${answer === "not_me" ? "opacity-50" : ""}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-foreground">{c.name ?? host(c.url)}</span>
        <span className="truncate text-xs text-muted-foreground">{host(c.url)}</span>
        {c.snippet ? <span className="line-clamp-2 text-xs text-muted-foreground">{c.snippet}</span> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <OpenLink url={c.url} />
        <Button variant={answer === "me" ? "primary" : "outline"} icon={<Check aria-hidden />} aria-pressed={answer === "me"} onClick={() => onAnswer("me")}>
          Yes it&apos;s me
        </Button>
        <Button variant="quiet" aria-pressed={answer === "not_me"} onClick={() => onAnswer("not_me")}>
          Not me
        </Button>
        <Button variant="quiet" onClick={() => onAnswer("skip")}>
          Skip
        </Button>
      </div>
    </li>
  );
}
