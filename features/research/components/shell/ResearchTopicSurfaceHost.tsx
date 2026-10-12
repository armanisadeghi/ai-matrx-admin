"use client";

/**
 * ResearchTopicSurfaceHost — THE ONE `matrx-user/research` surface for one
 * topic: its read half (live topic + progress, built at trigger time) and its
 * write half (`ResearchTopicWriteTargets`). The topic workspace route
 * (`app/(core)/research/topics/[topicId]/ResearchTopicShell.tsx`) and a research
 * topic on the Board both mount this, so an agent gets the same values and
 * targets wherever the topic is open.
 *
 * Must sit inside the topic's `TopicProvider` — the topic store is where the
 * values come from and where the write path's refresh lives.
 */

import type { MutableRefObject, ReactNode } from "react";
import {
  ResearchReadingRecordProvider,
  type ResearchReadingRecord,
} from "@/features/research/agent-context/readingRecord";
import {
  useTopicData,
  useTopicProgress,
} from "@/features/research/context/ResearchContext";
import { ResearchTopicWriteTargets } from "@/features/research/components/shell/ResearchTopicWriteTargets";
import {
  buildResearchContextData,
  RESEARCH_CONTEXT_MENU_PROPS,
} from "@/features/research/agent-context/buildResearchContextData";
import { buildApplicationScopeFromMenuContext } from "@ai-matrx/context-menu/engine";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";

export function ResearchTopicSurfaceHost(props: {
  activeView: string;
  children: ReactNode;
}) {
  return (
    <ResearchReadingRecordProvider>
      {(readingRecordRef) => <ResearchTopicSurface {...props} readingRecordRef={readingRecordRef} />}
    </ResearchReadingRecordProvider>
  );
}

function ResearchTopicSurface({
  activeView,
  children,
  readingRecordRef,
}: {
  /** Which part of the topic is on screen (`overview`, `document`, `sources`…). */
  activeView: string;
  children: ReactNode;
  /** The record open in the annotated reader, published by its bridge. */
  readingRecordRef: MutableRefObject<ResearchReadingRecord | null>;
}) {
  const { topic } = useTopicData();
  const progress = useTopicProgress();

  const getScope = () =>
    buildApplicationScopeFromMenuContext({
      selectedText:
        typeof window !== "undefined"
          ? (window.getSelection()?.toString() ?? "")
          : "",
      selectionRange: null,
      contextData: buildResearchContextData({
        topic,
        progress,
        activeView,
        readingRecord: readingRecordRef.current,
      }),
    });

  return (
    // `isEditable` stays FALSE and is unrelated to the surface's write
    // targets. It governs one thing only: whether agents bound to the
    // `matrx-default/basic-editor` contract qualify here
    // (`qualifyingDefaultSurfaces`), and that contract's text_before /
    // text_after / selection values are meaningless on a workspace that is a
    // dashboard, not a text editor. Agent-writability is gated per target by
    // `applyPolicy`, which every research target sets to `ask`.
    <SurfaceRuntimeProvider
      surfaceName={RESEARCH_CONTEXT_MENU_PROPS.surfaceName}
      getScope={getScope}
      isEditable={false}
    >
      {/* Handlers for the manifest's `writeTargets`, inside the provider AND
          inside TopicProvider (the topic store owns the write path's refresh). */}
      <ResearchTopicWriteTargets />
      {children}
    </SurfaceRuntimeProvider>
  );
}
