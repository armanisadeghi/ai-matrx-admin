"use client";

// features/education/create/useEducationSources.ts
//
// THE Sources half of every Education Create page: the one Source input's set
// (`useSourceSet`), what is ready / still landing / waiting for the clean
// version, the reload-safe clean-up of picks that can no longer be read, the
// deck handed over in the link (`?deck=`), and `prepare()` — the one server
// read (`POST /sources/resolve`) turned into what a generator needs.
//
// Same behaviors `CreateDeckPage` has for flashcards, held once for mind maps,
// memory aids and audio study. React Compiler is on: no manual memo.

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSourceSet } from "@/features/resource-manager/source-input/useSourceSet";
import { useSourceIntake } from "@/features/resource-manager/source-input/useSourceIntake";
import { isArchivedSource } from "@/features/resource-manager/source-input/components/ArchivedSource";
import { backfillFileIds, lineageSourcesOf } from "@/features/flashcards/data/generateDeckFromSources";
import { unreadableRestoredIds } from "@/features/flashcards/data/draftSourceHonesty";
import { sourceNamesOf } from "@/features/flashcards/data/deckSourceSet";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { resolveTopicAudioSource } from "@/features/education/media/audio/resolveAudioSource";
import {
  deckIdsOf,
  focusWithTopic,
  groundedTextOf,
  mediaSourceOf,
  notesOf,
  sourceTitleOf,
  trustFromResolved,
  type PreparedMaterial,
} from "./groundedMaterial";

/** How often a held run re-reads whether its Sources are clean yet. */
const WAIT_POLL_MS = 5_000;
/** The fewest characters a topic alone needs. */
export const TOPIC_MIN_CHARS = 3;

export interface UseEducationSourcesOptions {
  /** A deck handed over in the link (`?deck=<id>`) — picked like Use existing. */
  seedDeck?: { id: string; name?: string | null } | null;
  /** A topic handed over in the link (`?source=topic`, `?topic=`). */
  seedTopic?: string | null;
  /** False while what the seed needs (the deck's name) is still loading. */
  seedReady?: boolean;
  /** The held run's Sources are clean: start now. */
  onRelease: () => void;
}

export function useEducationSources(surfaceKey: string, options: UseEducationSourcesOptions) {
  const set = useSourceSet(surfaceKey);
  const intake = useSourceIntake(set, { attachTo: undefined });

  const ready = set.sources.filter((s) => s.status === "ready" && s.draft.ref);
  const landing = set.sources.filter((s) => s.status === "pending" || s.status === "resolving");
  const topic = set.topic.trim();
  const hasSources = ready.length > 0;
  const waitingForClean = ready.filter((s) => s.draft.waitForClean && s.manifest?.state !== "ready");
  const deckCount = ready.filter((s) => s.draft.ref?.resource_type === "fc_set").length;

  // ── A deck / topic handed over in the link, picked once ─────────────────
  const seeded = useRef(false);
  const seedDeckId = options.seedDeck?.id ?? null;
  const seedDeckName = options.seedDeck?.name ?? null;
  const seedTopic = options.seedTopic ?? null;
  const seedReady = options.seedReady ?? true;
  useEffect(() => {
    if (seeded.current || set.restoring || !seedReady) return;
    seeded.current = true;
    if (seedDeckId && !set.hasRef("fc_set", seedDeckId)) {
      intake.addExisting({ token: "fc_set", id: seedDeckId, title: seedDeckName ?? "Your deck" });
    }
    if (seedTopic && !set.topic.trim()) set.setTopic(seedTopic);
  }, [set, intake, set.restoring, seedReady, seedDeckId, seedDeckName, seedTopic]);

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
  const release = useEffectEvent(() => {
    setHolding(false);
    options.onRelease();
  });
  const waitingCount = waitingForClean.length;
  useEffect(() => {
    if (!holding) return;
    if (waitingCount === 0) {
      release();
      return;
    }
    const t = setInterval(poll, WAIT_POLL_MS);
    return () => clearInterval(t);
  }, [holding, waitingCount]);

  /** Why Make cannot start yet, in the page's words, or null. */
  const blockedReason: string | null = landing.length
    ? `Wait until ${landing.length === 1 ? "your new source has" : `${landing.length} new sources have`} finished adding.`
    : !hasSources && topic.length < TOPIC_MIN_CHARS
      ? "Add a source or a topic."
      : null;

  /**
   * Read the picks through the server and shape them for a generator. A topic
   * alone is the material itself, stated honestly as not grounded in the
   * person's own sources; a topic beside Sources only steers them (`focusLine`).
   */
  const usedIds = useRef<ReadonlySet<string>>(new Set());
  const prepare = async (): Promise<PreparedMaterial> => {
    usedIds.current = new Set(ready.map((s) => s.id));
    if (!hasSources) {
      const t = resolveTopicAudioSource(topic);
      return {
        content: t.content,
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
    const chosen = set.toSourceSet();
    const names = sourceNamesOf(set.sources);
    const resolving = set.resolve();
    resolving.catch(() => undefined);
    await ensureOrgId(undefined);
    // Citations open the real file only through its file id.
    const resolved = await backfillFileIds(await resolving);
    const content = groundedTextOf(resolved.sources);
    if (!content.trim()) {
      throw new Error("None of the sources had any text to work from. Check each source, or add another.");
    }
    return {
      content,
      title: sourceTitleOf(resolved.sources.filter((s) => s.text.trim()).map((s) => s.label)),
      source: mediaSourceOf(resolved.sources),
      trust: trustFromResolved(resolved.sources),
      deckIds: deckIdsOf(resolved.sources),
      lineageSources: lineageSourcesOf(resolved),
      chosen,
      names,
      notes: notesOf(resolved),
      fromSources: true,
    };
  };

  /** After the artifact is made: only the Sources it used leave the draft; one added meanwhile stays. */
  const clearUsed = () => {
    for (const id of usedIds.current) set.remove(id);
    set.setTopic("");
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
    prepare,
    /** The topic as the focus line when Sources are picked. */
    focusLine: (focus: string) => (hasSources ? focusWithTopic(topic, focus) : focus.trim()),
  };
}

export type EducationSources = ReturnType<typeof useEducationSources>;
