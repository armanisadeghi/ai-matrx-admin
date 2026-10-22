"use client";

// features/education/create/useEducationSources.ts
//
// THE Sources half of every Education Create page: the one Source input's set
// (`useSourceSet`), what is ready / still landing / waiting for the clean
// version, the reload-safe clean-up of picks that can no longer be read, the
// deck handed over in the link (`?deck=`), and `prepare()` — the one server
// read (`POST /sources/resolve`) turned into what a generator needs.
//
// THE one Sources half: flashcards, quizzes and practice tests, oral practice,
// mind maps, memory aids and audio study all ride it (with
// `EducationCreatePage`). A deck handed over in the link is named by reading
// that one deck, never by listing every deck. React Compiler is on: no manual
// memo.

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createSourceRef, type SourceSet } from "@ai-matrx/agents/sources";
import type { ResolvedSourceSet } from "@ai-matrx/agents/sources";
import { sourceSurfaceKey, useSourceSet } from "@/features/resource-manager/source-input/useSourceSet";
import { useSourceIntake } from "@/features/resource-manager/source-input/useSourceIntake";
import { isArchivedSource } from "@/features/resource-manager/source-input/components/ArchivedSource";
import { backfillFileIds, lineageSourcesOf } from "@/features/flashcards/data/generateDeckFromSources";
import { lateSourceIds, unreadableRestoredIds } from "@/features/flashcards/data/draftSourceHonesty";
import { sourceNamesOf, type DeckSourceName } from "@/features/flashcards/data/deckSourceSet";
import { fcService } from "@/features/flashcards/data/fcService";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { nameFromSources } from "@/features/education/onboard/kitTitle";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { resolveTopicAudioSource } from "@/features/education/media/audio/resolveAudioSource";
import { studyRunRequest } from "./createRunRequest";
import {
  deckIdsOf,
  focusWithTopic,
  chunksOfSources,
  groundedTextOf,
  groundedTextWithChunks,
  mediaSourceOf,
  notesOf,
  namerFloorOf,
  trustFromResolved,
  type PreparedMaterial,
} from "./groundedMaterial";

/** How often a held run re-reads whether its Sources are clean yet. */
const WAIT_POLL_MS = 5_000;
/** The fewest characters a topic alone needs. */
export const TOPIC_MIN_CHARS = 3;

/** What a link hands the page (`?deck=`, `?document=`, `?file=`, `?name=`, `?topic=`), picked once. */
export interface EducationSeed {
  /** A deck — picked like Use existing; named by reading that one deck unless `name` says. */
  deckId?: string | null;
  /** A processed document opened elsewhere. */
  documentId?: string | null;
  /** A file opened elsewhere. */
  fileId?: string | null;
  /** The handed-over record's name, when the link carries it. */
  name?: string | null;
  topic?: string | null;
}

/** The seed every create route reads from its link — one reading of the query. */
export function seedFromParams(params: { get: (key: string) => string | null }): EducationSeed {
  return {
    deckId: params.get("deck"),
    documentId: params.get("document") ?? params.get("documentId") ?? params.get("source"),
    fileId: params.get("file") ?? params.get("fileId"),
    name: params.get("name"),
    topic: params.get("topic")?.trim() || null,
  };
}

export interface UseEducationSourcesOptions {
  seed?: EducationSeed | null;
  /** The held run's Sources are clean: start now. */
  onRelease: () => void;
  /** Fewest characters a topic alone needs (default `TOPIC_MIN_CHARS`). */
  topicMinChars?: number;
  /** Sources are optional here (the page has its own subject): never "Add a source or a topic". */
  optional?: boolean;
  /** The mark a Source added after the run began carries ("Not in this deck"). */
  lateMark?: string;
}

/** The finish's one line when Sources were added while the run made `what` ("the map"). */
export function leftOutLine(n: number, what: string): string {
  return `${n === 1 ? "A source you added" : `${n} sources you added`} while ${what} was being made ${n === 1 ? "is" : "are"} not in it.`;
}

/** The picks of one run, fixed in the moment it began. */
export interface ChosenSources {
  chosen: SourceSet;
  names: Record<string, DeckSourceName>;
}

export function useEducationSources(surfaceKey: string, options: UseEducationSourcesOptions) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const set = useSourceSet(surfaceKey);
  const intake = useSourceIntake(set, { attachTo: undefined });

  const ready = set.sources.filter((s) => s.status === "ready" && s.draft.ref);
  const landing = set.sources.filter((s) => s.status === "pending" || s.status === "resolving");
  const topic = set.topic.trim();
  const hasSources = ready.length > 0;
  const waitingForClean = ready.filter((s) => s.draft.waitForClean && s.manifest?.state !== "ready");
  const deckCount = ready.filter((s) => s.draft.ref?.resource_type === "fc_set").length;

  // ── What the link handed over, picked once ─────────────────────────────
  const seeded = useRef(false);
  const seed = options.seed ?? null;
  const seedDeckId = seed?.deckId ?? null;
  const pickSeed = useEffectEvent(async () => {
    if (!seed) return;
    if (seed.topic && !set.topic.trim()) set.setTopic(seed.topic);
    if (seed.documentId && !set.hasRef("processed_document", seed.documentId)) {
      set.addReady({
        kind: "your_sources",
        label: seed.name ?? "The document you opened",
        ref: createSourceRef("processed_document", seed.documentId),
        processedDocumentId: seed.documentId,
      });
    }
    if (seed.fileId && !set.hasRef("file", seed.fileId)) {
      set.addReady({
        kind: "files",
        label: seed.name ?? "The file you opened",
        ref: createSourceRef("file", seed.fileId),
        fileId: seed.fileId,
      });
    }
    if (seedDeckId && !set.hasRef("fc_set", seedDeckId)) {
      // The one deck, by id — never the whole deck list to find its name.
      const name = seed.name ?? (await fcService.getDeckNamesByIds([seedDeckId])).data?.[seedDeckId] ?? null;
      if (!set.hasRef("fc_set", seedDeckId)) {
        intake.addExisting({ token: "fc_set", id: seedDeckId, title: name ?? "The deck you opened" });
      }
    }
  });
  useEffect(() => {
    if (seeded.current || set.restoring) return;
    seeded.current = true;
    void pickSeed();
  }, [set.restoring]);

  // ── Picks kept from before a reload that cannot be read ─────────────────
  const restoredIds = useRef<ReadonlySet<string> | null>(null);
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const dropUnreadable = useEffectEvent(() => {
    if (restoredIds.current === null) {
      if (!set.restoring) restoredIds.current = new Set(set.sources.map((s) => s.id));
      return;
    }
    const goneIds = new Set(
      unreadableRestoredIds(
        set.sources.map((s) => ({
          id: s.id,
          status: s.status,
          archived: isArchivedSource(s.manifest),
          state: s.manifest?.state,
        })),
        restoredIds.current,
      ),
    );
    const gone = set.sources.filter((s) => goneIds.has(s.id));
    if (gone.length === 0) return;
    for (const s of gone) set.remove(s.id);
    const names = gone.map((s) => s.draft.label).join(", ");
    setDropNotice(`Taken out of your draft, nothing to read: ${names.length > 90 ? `${names.slice(0, 90)}…` : names}`);
  });
  useEffect(() => {
    dropUnreadable();
  }, [set.sources, set.restoring]);

  // ── "Wait for the clean version": hold, re-read, start when ready ───────
  const [holding, setHolding] = useState(false);
  const poll = useEffectEvent(() => void set.manifest());
  const waitingCount = waitingForClean.length;
  // The hold ends while rendering (state adjusted from a change); the release callback runs in an effect.
  const [releases, setReleases] = useState(0);
  if (holding && waitingCount === 0) {
    setHolding(false);
    setReleases((n) => n + 1);
  }
  const release = useEffectEvent(() => options.onRelease());
  useEffect(() => {
    if (releases > 0) release();
  }, [releases]);
  useEffect(() => {
    if (!holding) return;
    const t = setInterval(poll, WAIT_POLL_MS);
    return () => clearInterval(t);
  }, [holding]);

  /** Why Make cannot start yet, in the page's words, or null. */
  const topicMin = options.topicMinChars ?? TOPIC_MIN_CHARS;
  const blockedReason: string | null = set.restoring
    ? "Reading your saved sources…"
    : landing.length
      ? `Wait until ${landing.length === 1 ? "your new source has" : `${landing.length} new sources have`} finished adding.`
      : !options.optional && !hasSources && topic.length < topicMin
        ? "Add a source or a topic."
        : null;

  // ── The Sources one run is made from ────────────────────────────────────
  // Fixed in the moment the run begins: a Source added later is not in it — it
  // stays in the draft, marked, and the finish says so.
  const usedIds = useRef<ReadonlySet<string>>(new Set());
  const [inRun, setInRun] = useState<ReadonlySet<string> | null>(null);
  const [leftOutIds, setLeftOutIds] = useState<ReadonlySet<string>>(new Set());
  /** Fix this run's Sources (call once, as the run starts). */
  const begin = (): ChosenSources => {
    const used = new Set(ready.map((s) => s.id));
    usedIds.current = used;
    setInRun(used);
    setLeftOutIds(new Set());
    return { chosen: set.toSourceSet(), names: sourceNamesOf(set.sources) };
  };
  /** The run ended without a result: nothing is marked. */
  const endRun = () => setInRun(null);
  /**
   * Fix this run's Sources and read them through the server, with file ids
   * filled in (citations open the real file only through its file id) and a
   * sentence for each Source left out or stood in for.
   */
  const resolveChosen = async (
    /** `targetModelId`: read inside that model's real window (the server's budget). */
    resolveOptions?: { targetModelId?: string },
  ): Promise<ChosenSources & { resolved: ResolvedSourceSet; notes: string[] }> => {
    const picked = begin();
    const resolving = set.resolve(resolveOptions);
    resolving.catch(() => undefined);
    const resolved = await backfillFileIds(await resolving);
    return { ...picked, resolved, notes: notesOf(resolved) };
  };
  const lateMark = options.lateMark ?? "Not in this one";
  const marks: Record<string, string> = {};
  for (const s of set.sources) {
    if (leftOutIds.has(s.id) || (inRun && inRun.size > 0 && !inRun.has(s.id))) marks[s.id] = lateMark;
  }

  /**
   * Read the picks through the server and shape them for a generator. A topic
   * alone is the material itself, stated honestly as not grounded in the
   * person's own sources; a topic beside Sources only steers them (`focusLine`).
   */
  const prepare = async (): Promise<PreparedMaterial> => {
    if (!hasSources) {
      begin();
      const t = resolveTopicAudioSource(topic);
      return {
        content: t.content,
        plainContent: t.content,
        chunks: [],
        title: t.source.title,
        source: t.source,
        trust: t.trust,
        deckIds: [],
        lineageSources: [],
        chosen: null,
        names: null,
        notes: [],
        fromSources: false,
      };
    }
    const { chosen, names, resolved, notes } = await resolveChosen();
    const orgId = await ensureOrgId(undefined);
    const plainContent = groundedTextOf(resolved.sources);
    const content = groundedTextWithChunks(resolved.sources);
    if (!plainContent.trim()) {
      throw new Error("None of the sources had any text to work from. Check each source, or add another.");
    }
    // Several Sources are titled by THE kit namer (an equal share of each); one keeps its own name.
    const title = await nameFromSources(resolved.sources, { dispatch, store, orgId }, namerFloorOf(resolved.sources));
    return {
      content,
      plainContent,
      chunks: chunksOfSources(resolved.sources),
      title,
      source: mediaSourceOf(resolved.sources, title),
      trust: trustFromResolved(resolved.sources),
      deckIds: deckIdsOf(resolved.sources),
      lineageSources: lineageSourcesOf(resolved),
      chosen,
      names,
      notes,
      fromSources: true,
    };
  };

  /**
   * After the artifact is made: only the Sources it used leave the draft; one
   * added meanwhile stays, marked. Returns how many were left out. Reads the
   * draft as it is NOW — this runs long after the render that started the run.
   */
  const clearUsed = (): number => {
    const live = Object.values(
      store.getState().instanceResources.byConversationId[sourceSurfaceKey(surfaceKey)] ?? {},
    ).filter((r) => r.blockType === "source_ref");
    const late = new Set(lateSourceIds(live.map((r) => r.resourceId), usedIds.current));
    for (const r of live) if (!late.has(r.resourceId)) set.remove(r.resourceId);
    set.setTopic("");
    setInRun(null);
    setLeftOutIds(late);
    return late.size;
  };

  return {
    set,
    intake,
    clearUsed,
    ready,
    landing,
    topic,
    hasSources,
    deckCount,
    waitingForClean,
    holding,
    setHolding,
    dropNotice,
    dismissDropNotice: () => setDropNotice(null),
    blockedReason,
    /** Sources are optional on this screen. */
    optional: options.optional ?? false,
    marks,
    begin,
    endRun,
    resolveChosen,
    prepare,
    /** This draft as a tab-bound run request, with the page's style answers. */
    runRequest: (style: object) => studyRunRequest(set.toSourceSet(), sourceNamesOf(set.sources), topic, style),
    /** The topic as the focus line when Sources are picked. */
    focusLine: (focus: string) => (hasSources ? focusWithTopic(topic, focus) : focus.trim()),
  };
}

export type EducationSources = ReturnType<typeof useEducationSources>;
