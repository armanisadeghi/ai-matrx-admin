// features/education/onboard/useKitGeneration.ts
//
// The Study Kit orchestrator: the picked Sources → (resolve + anchor) → (naming)
// → (converter fan-out) → live per-target state. It owns NO generation logic of
// its own — ingest owns raw→text, the converter owns text→artifact. It sequences
// them, surfaces progress, and keeps the run alive across a reload.
//
// 🚨 THE SERVER BUILDS THE KIT (2026-10-11). The outputs — deck, quizzes,
// notes, summary, mind map, memory aids, audio — are made, merged and SAVED by
// one server run (`kitBuildService.ts` → aidream `education_kit_build`); this
// hook only starts it and watches it. Closing the tab or locking the phone no
// longer loses or orphans anything: the run finishes on its own, and any page
// (the kit page, another tab, another device) finds it by its kit.
//
// What stays here is the short front of the build, kept as a TAB-BOUND RUN
// (`useTabBoundRun`) with a JOURNAL so a reload continues it:
//   - the request (the Sources as a frozen SourceSet, the outputs,
//     depth/count/focus, the organization) — written before it starts;
//   - the Sources read and the kit's name (`kitTitle.ts`), and the kit itself
//     (`kits/kitScope.ts`), once known — a continued kit keeps all three;
//   - the server build's id and run — a continuation REJOINS that build (the
//     server returns the active run, or a new run of it adopts every output
//     already saved). A reload continues by itself (StartHero).

"use client";

import { useRef, useState } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { getGenerator } from "@/features/education/convert/registry";
import { resolveKitTitle, type KitTitle } from "./kitTitle";
import type {
  ConvertOptions,
  TargetKind,
} from "@/features/education/convert/types";
import { ALL_TARGET_KINDS } from "@/features/education/convert/types";
import { isCoverageDepth } from "@/features/education/convert/coverage";
import type { ResolvedSourceSet, SourceSet } from "@ai-matrx/agents/sources";
import { sourcesClient } from "@/features/resource-manager/source-input/sourceSetApi";
import { toast } from "@/lib/toast";
import { kitOutlineInputs, startKitOutline } from "@/features/education/kits/outline/outlineService";
import { useTabBoundRun } from "@/lib/wizard-draft/useTabBoundRun";
import { readKit, renameKit } from "@/features/education/kits/kitService";
import { addKitSource, createKitScope, KIT_TOKEN } from "@/features/education/kits/kitScope";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import { useFloatingWorkflowRun } from "@/features/workflow-runtime/floating/useFloatingWorkflowRun";
import {
  selectRunState,
  selectRunStatus,
} from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import { runIsOver } from "@/features/workflow-runtime/types";
import {
  KIT_BUILD_LABEL,
  kitTargetsFromRun,
  lookupKitBuildRun,
  startKitBuild,
} from "./kitBuildService";
import { useIngest } from "./useIngest";
import type {
  IngestProgress,
  KitTargetState,
  NormalizedIngest,
} from "./types";

export type KitPhase = "idle" | "ingesting" | "generating" | "done" | "error";

/** The run marker's key — one kit build per device at a time on /education/start. */
export const KIT_RUN_KEY = "education:start:kit";

/** What a kit build asked for — everything a continuation needs to ask again. */
export interface KitRunRequest {
  kinds: TargetKind[];
  options: ConvertOptions;
  orgId: string;
  /** The picked Sources, frozen — a continuation re-reads exactly these. */
  sourceSet: SourceSet;
  /** Epoch ms the FIRST attempt started — outputs saved since then belong to this kit. */
  startedAt: number;
}

/** What the run has done so far (JSON, kept in the run marker). */
export interface KitRunJournal {
  source?: Omit<NormalizedIngest, "text">;
  title?: KitTitle;
  /** The name the person typed over the derived one. */
  renamedTo?: string;
  /** The server build's identity — a continuation rejoins THIS build. */
  buildId?: string;
  /** The server run building the outputs (the page reattaches to it). */
  runId?: string;
}

/** The stored request back, or null when it is not one this code can continue. */
export function restoreKitRunRequest(raw: Record<string, unknown>): KitRunRequest | null {
  const kinds = Array.isArray(raw.kinds)
    ? raw.kinds.filter((k): k is TargetKind => ALL_TARGET_KINDS.includes(k as TargetKind))
    : [];
  const set = raw.sourceSet as SourceSet | undefined;
  if (kinds.length === 0) return null;
  if (typeof raw.orgId !== "string" || !raw.orgId) return null;
  if (!set || typeof set !== "object" || !Array.isArray(set.sources) || set.sources.length === 0)
    return null;
  if (typeof raw.startedAt !== "number") return null;
  const o = (raw.options ?? {}) as Record<string, unknown>;
  const options: ConvertOptions = {
    ...(typeof o.focus === "string" && o.focus ? { focus: o.focus } : {}),
    ...(isCoverageDepth(o.depth) ? { depth: o.depth } : {}),
    ...(typeof o.count === "number" && o.count > 0 ? { count: o.count } : {}),
  };
  return { kinds, options, orgId: raw.orgId, sourceSet: set, startedAt: raw.startedAt };
}

function readJournal(raw: Record<string, unknown>): KitRunJournal {
  // Written only by this file, as JSON — read back as the same shape.
  return raw as KitRunJournal;
}

export interface UseKitGeneration {
  phase: KitPhase;
  /** Epoch ms the run started — the UI's elapsed clock reads from this. */
  startedAt: number | null;
  /** Epoch ms ingest finished (text in hand); null while still ingesting. */
  ingestFinishedAt: number | null;
  /** Live ingest progress line (upload/extract/scrape). */
  ingestProgress: IngestProgress | null;
  /** Per-target live state (pending → running → success/error). */
  targets: KitTargetState[];
  /** The normalized source, once ingest completes. */
  source: NormalizedIngest | null;
  /**
   * The kit's ONE name, resolved after ingest and carried by every artifact.
   * Null until ingest completes. `named: false` means the namer was unavailable
   * and this is the cleaned-up filename.
   */
  kitTitle: KitTitle | null;
  /** Top-level error (ingest failure sinks the whole run). */
  error: string | null;
  /** The thrown value behind `error`, for the error display. */
  errorCause: unknown;
  /** True when this run continues one that stopped with its page. */
  continued: boolean;
  /** Titles of picked Sources the kit could not file (the kit itself was made). */
  sourcesNotFiled: string[];
  busy: boolean;
  /**
   * Start a kit build. Resolves true once the material was read and every
   * output settled (so the caller can meter `ingest_document`), false on an
   * empty selection or a failed read.
   *
   * `orgId` is REQUIRED and resolved by the caller BEFORE the run starts (the
   * org gate's hold-at-the-button contract).
   */
  run: (
    sourceSet: SourceSet,
    kinds: TargetKind[],
    options: ConvertOptions | undefined,
    orgId: string,
  ) => Promise<boolean>;
  /** A build that stopped with its page (reload, closed tab), or null. */
  stopped: {
    request: KitRunRequest;
    stoppedAt: number;
    /** The server was already building it — the page left, the build did not. */
    building: boolean;
    title: string | null;
  } | null;
  /** Another open tab is building a kit right now. */
  runningElsewhere: boolean;
  /** Continue the stopped build: same kit, nothing saved is made again. */
  continueStopped: () => Promise<boolean>;
  dismissStopped: () => void;
  /** Rename the kit (now, or when it finishes when it is still building). */
  renameTitle: (title: string) => Promise<void>;
  /** Settle a streamed child after its own durable runner reports success. */
  markTargetReady: (kind: TargetKind) => void;
  reset: () => void;
}

export function useKitGeneration(): UseKitGeneration {
  const { normalizeSources } = useIngest();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const tabRun = useTabBoundRun<KitRunRequest>(KIT_RUN_KEY, restoreKitRunRequest);

  const [kitTitle, setKitTitle] = useState<KitTitle | null>(null);
  const [phase, setPhase] = useState<KitPhase>("idle");
  const [ingestProgress, setIngestProgress] = useState<IngestProgress | null>(null);
  const [targets, setTargets] = useState<KitTargetState[]>([]);
  const [source, setSource] = useState<NormalizedIngest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCause, setErrorCause] = useState<unknown>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ingestFinishedAt, setIngestFinishedAt] = useState<number | null>(null);
  const [continued, setContinued] = useState(false);
  const [sourcesNotFiled, setSourcesNotFiled] = useState<string[]>([]);
  // The running build's journal and its writer — a rename typed mid-build goes
  // into it, so the run applies it at the end and a continuation keeps it.
  const live = useRef<{ journal: KitRunJournal; write: () => void } | null>(null);
  // The server run building the outputs: adopted for its live state, and
  // handed to its floating window when this page is left while it runs.
  const [runId, setRunId] = useState<string | null>(null);
  const [buildStartedAt, setBuildStartedAt] = useState(0);
  useWorkflowRun(runId);
  const runState = useAppSelector(selectRunState(runId ?? ""));
  useFloatingWorkflowRun({ runId, workflowName: KIT_BUILD_LABEL });

  const reset = () => {
    setPhase("idle");
    setKitTitle(null);
    setIngestProgress(null);
    setTargets([]);
    setSource(null);
    setError(null);
    setErrorCause(null);
    setStartedAt(null);
    setIngestFinishedAt(null);
    setContinued(false);
    setSourcesNotFiled([]);
    setRunId(null);
  };

  const patchTarget = (kind: TargetKind, patch: Partial<KitTargetState>) => {
    setTargets((prev) =>
      prev.map((t) => (t.targetKind === kind ? { ...t, ...patch } : t)),
    );
  };

  const markTargetReady = (kind: TargetKind) => {
    patchTarget(kind, { stillGenerating: false, finishedAt: Date.now() });
  };

  /** Apply a name to the kit this run made. */
  const applyRename = async (kitId: string, title: string) => {
    const kit = await readKit(KIT_TOKEN, kitId);
    if (kit && kit.title !== title) await renameKit(kit, title);
  };

  /** Resolves once the build run is over (its live state, with a slow lookup as the floor). */
  const untilBuildEnds = (id: string, kitId: string, orgId: string) =>
    new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        unsubscribe();
        clearInterval(poll);
        resolve();
      };
      const check = () => {
        if (runIsOver(selectRunStatus(id)(store.getState()))) finish();
      };
      const unsubscribe = store.subscribe(check);
      const poll = setInterval(() => {
        lookupKitBuildRun(dispatch, kitId, orgId)
          .then((found) => {
            if (found && found.runId === id && !found.active) finish();
          })
          .catch((e: unknown) => console.error("[useKitGeneration] could not check the build:", e));
      }, 15_000);
      check();
    });

  /** Start (or rejoin) the server build of this kit, then watch it to the end. */
  const watchBuild = async (
    request: KitRunRequest,
    journal: KitRunJournal,
    write: () => void,
    kitId: string,
    title: string,
  ) => {
    setPhase("generating");
    const began = Date.now();
    setBuildStartedAt(began);
    setTargets((prev) => prev.map((t) => ({ ...t, status: "running" as const, startedAt: began })));
    journal.buildId = journal.buildId ?? crypto.randomUUID();
    write();
    const started = await startKitBuild(dispatch, {
      kitId,
      organizationId: request.orgId,
      buildId: journal.buildId,
      sourceSet: request.sourceSet,
      targets: request.kinds,
      options: request.options,
      title,
    });
    journal.runId = started.runId;
    write();
    setRunId(started.runId);
    await untilBuildEnds(started.runId, kitId, request.orgId);
  };

  const execute = async (
    request: KitRunRequest,
    prior: KitRunJournal,
    note: (journal: Record<string, unknown>) => void,
    isContinuation: boolean,
  ): Promise<boolean> => {
    const journal: KitRunJournal = { ...prior };
    // A COPY goes to the store, never the object this run keeps writing to:
    // the journal is mutated as the run goes, and a mutated store object is
    // a state mutation (in dev, the invariant check throws on the next
    // dispatch — the run died mid-name and its marker went with it).
    const write = () => note(structuredClone(journal) as Record<string, unknown>);
    live.current = { journal, write };
    // Set once every output settled — a late name then renames the kit itself.
    let finished = false;
    // The kit's Sources being filed (started once the kit exists, awaited at the end).
    let linking: Promise<void> = Promise.resolve();
    const { kinds, options, orgId } = request;

    setError(null);
    setErrorCause(null);
    setSource(null);
    setKitTitle(null);
    setContinued(isContinuation);
    setSourcesNotFiled([]);
    setPhase("ingesting");
    setIngestProgress(null);
    setStartedAt(Date.now());
    setIngestFinishedAt(null);
    setTargets(
      kinds.map((k) => ({
        targetKind: k,
        label: getGenerator(k)?.label ?? k,
        status: "pending" as const,
      })),
    );

    // A build the server already runs: rejoin it — nothing is read or named
    // again; the kit, its name and its Sources are all already saved.
    const kept = journal.source;
    if (isContinuation && journal.buildId && kept?.ref.kitId && journal.title) {
      setSource({ ...kept, text: "" });
      setIngestFinishedAt(Date.now());
      setKitTitle(journal.renamedTo ? { ...journal.title, title: journal.renamedTo } : journal.title);
      await watchBuild(request, journal, write, kept.ref.kitId, journal.renamedTo ?? journal.title.title);
      if (journal.renamedTo) {
        await applyRename(kept.ref.kitId, journal.renamedTo).catch((e: unknown) =>
          console.error("[useKitGeneration] the kit's new name was not applied:", e),
        );
      }
      setPhase("done");
      return true;
    }

    let normalized: NormalizedIngest;
    try {
      normalized = await normalizeSources(
        (): Promise<ResolvedSourceSet> =>
          sourcesClient.resolve(request.sourceSet, { organizationId: orgId }),
        setIngestProgress,
        journal.source?.ref,
        // The kit holds each Source itself — no merged `.md` copy.
        { copyAnchor: false },
      );
      setSource(normalized);
      setIngestFinishedAt(Date.now());
      const { text: _text, ...kept } = normalized;
      journal.source = kept;
      write();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that source.");
      setErrorCause(e);
      setPhase("error");
      return false;
    }

    // NAME THE KIT ONCE, here, between ingest and fan-out (`kitTitle.ts`). A
    // continued kit keeps the name it already has.
    if (!journal.title) setIngestProgress({ phase: "ready", message: "Naming your kit" });
    const resolvedTitle =
      journal.title ??
      (await resolveKitTitle(dispatch, store, {
        text: normalized.text,
        rawTitle: normalized.title,
        sourceTitles: normalized.meta.sourceTitles,
        sourceSamples: normalized.meta.sourceSamples,
        focus: options.focus,
        orgId,
      }));
    const { late, ...titleNow } = resolvedTitle as KitTitle & {
      late?: Promise<KitTitle | null>;
    };
    journal.title = titleNow;
    write();

    // THE KIT, made once: its own record holding every picked Source
    // (`kits/kitScope.ts`). A continued run keeps the kit it already made.
    if (!normalized.ref.kitId) {
      setIngestProgress({ phase: "ready", message: "Making your kit" });
      const scope = await createKitScope(orgId, journal.renamedTo ?? titleNow.title);
      normalized = { ...normalized, ref: { ...normalized.ref, kitId: scope.id } };
      setSource(normalized);
      const { text: _kept, ...kept } = normalized;
      journal.source = kept;
      write();
      // THE SOURCES ARE FILED BESIDE THE BUILD, NEVER IN FRONT OF IT
      // (2026-10-08). They were awaited one by one before the fan-out: one
      // slow `assoc_add` (28 s, then a 57014 timeout behind a long-held row
      // lock) held every output back and then threw, sinking a kit that
      // already existed. Now they file while the outputs build (one after
      // another, so the kit lists them in the order picked); one that fails is
      // named on the board, and the kit goes on.
      const kitSources = normalized.ref.kitSources ?? [];
      linking = (async () => {
        const missed: string[] = [];
        for (const kitSource of kitSources) {
          try {
            await addKitSource(scope, kitSource);
          } catch (e) {
            console.error("[useKitGeneration] a Source was not filed in the kit:", e);
            missed.push(kitSource.title);
          }
        }
        if (missed.length > 0) setSourcesNotFiled(missed);
      })();
      // THE OUTLINE STARTS BESIDE THE AIDS (living-kit W1): a server run, so it
      // survives this page closing; the kit page reattaches to it by subject.
      // Never awaited — the aids do not wait on it.
      void kitOutlineInputs(kitSources)
        .then((inputs) =>
          startKitOutline(dispatch, { kitId: scope.id, organizationId: orgId, sources: inputs.sources }),
        )
        .catch((e: unknown) => {
          console.error("[useKitGeneration] the kit outline did not start:", e);
          toast.warning("The outline did not start. Build it from the kit page.");
        });
    }
    setKitTitle(journal.renamedTo ? { ...titleNow, title: journal.renamedTo } : titleNow);
    // A name that arrives after the deadline still names the kit (applied at
    // the end with `renameKit`) — unless the person already typed one.
    void late?.then((named) => {
      if (!named || journal.renamedTo) return;
      journal.title = named;
      journal.renamedTo = named.title;
      write();
      setKitTitle(named);
      const kitId = normalized.ref.kitId;
      if (finished && kitId) {
        applyRename(kitId, named.title).catch((e: unknown) =>
          console.error("[useKitGeneration] the kit's late name was not applied:", e),
        );
      }
    });

    // THE OUTPUTS ARE BUILT ON THE SERVER (kitBuildService.ts): one run makes
    // and saves every output into the kit; this page only watches it. The
    // build's id is kept in the journal, so a continuation rejoins the SAME
    // build — an active run is returned as is, and a fresh run of it adopts
    // every output already saved instead of paying again.
    const kitId = normalized.ref.kitId;
    if (!kitId) throw new Error("The kit was not made, so nothing can be built into it.");
    await watchBuild(request, journal, write, kitId, journal.renamedTo ?? resolvedTitle.title);

    await linking;
    finished = true;
    const rename = journal.renamedTo;
    if (rename) {
      try {
        await applyRename(kitId, rename);
      } catch (e) {
        console.error("[useKitGeneration] the kit's new name was not applied:", e);
      }
    }
    setPhase("done");
    return true;
  };

  /** A run that breaks says so on the board — it never sits on its last line. */
  const guarded = async (work: () => Promise<boolean>): Promise<boolean> => {
    try {
      return await work();
    } catch (e) {
      console.error("[useKitGeneration] the kit build broke:", e);
      setError(e instanceof Error ? e.message : "The kit build stopped.");
      setErrorCause(e);
      setPhase("error");
      return false;
    }
  };

  const run: UseKitGeneration["run"] = async (sourceSet, kinds, options, orgId) => {
    if (kinds.length === 0) {
      setError("Pick at least one thing to create.");
      setErrorCause(null);
      setPhase("error");
      return false;
    }
    const request: KitRunRequest = {
      kinds,
      options: options ?? {},
      orgId,
      sourceSet,
      startedAt: Date.now(),
    };
    return tabRun.track(request as unknown as Record<string, unknown>, (_settle, _saving, _attach, note) =>
      guarded(() => execute(request, {}, note, false)),
    );
  };

  const continueStopped = async (): Promise<boolean> => {
    const stopped = tabRun.stopped;
    if (!stopped) return false;
    const prior = readJournal(stopped.journal);
    return tabRun.track(
      stopped.request as unknown as Record<string, unknown>,
      (_settle, _saving, _attach, note) => guarded(() => execute(stopped.request, prior, note, true)),
      { continues: stopped.conversationIds, journal: stopped.journal },
    );
  };

  const renameTitle = async (title: string) => {
    const clean = title.trim();
    if (!clean || !kitTitle) return;
    setKitTitle({ ...kitTitle, title: clean });
    const anchorId = source?.ref.kitId;
    if (phase === "done") {
      if (anchorId) await applyRename(anchorId, clean);
      return;
    }
    // Still building: the run applies it when it finishes.
    if (live.current) {
      live.current.journal.renamedTo = clean;
      live.current.write();
    }
  };

  const stoppedJournal = tabRun.stopped ? readJournal(tabRun.stopped.journal) : null;
  return {
    phase,
    startedAt,
    ingestFinishedAt,
    ingestProgress,
    targets: runId
      ? kitTargetsFromRun(runState, targets, buildStartedAt, runIsOver(runState?.status ?? null))
      : targets,
    source,
    kitTitle,
    error,
    errorCause,
    continued,
    sourcesNotFiled,
    busy: phase === "ingesting" || phase === "generating",
    run,
    stopped: tabRun.stopped
      ? {
          request: tabRun.stopped.request,
          stoppedAt: tabRun.stopped.stoppedAt,
          building: Boolean(stoppedJournal?.runId),
          title: stoppedJournal?.renamedTo ?? stoppedJournal?.title?.title ?? null,
        }
      : null,
    runningElsewhere: tabRun.runningElsewhere,
    continueStopped,
    dismissStopped: tabRun.dismiss,
    renameTitle,
    markTargetReady,
    reset,
  };
}
