"use client";

/**
 * AgentContentBlocks
 *
 * Renders server-generated content blocks (audio, images, search results, etc.)
 * BELOW the markdown text area. Never replaces text — always additive.
 *
 * Accepts ContentBlockPayload[] directly from Redux (activeRequests during streaming,
 * or turn.contentBlocks after commit). The `data` field on ContentBlockPayload is
 * equivalent to the `serverData` field used by BlockRenderer.
 */

import React, { lazy, Suspense } from "react";
import type { ContentBlockPayload } from "@/types/python-generated/stream-events";

const AudioOutputBlock = lazy(
  () => import("@/components/mardown-display/blocks/audio/AudioOutputBlock"),
);
const SearchResultsBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/SearchResultsBlock"),
);
const SearchErrorBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/SearchErrorBlock"),
);
const FunctionResultBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/FunctionResultBlock"),
);
const WorkflowStepBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/WorkflowStepBlock"),
);
const CategorizationResultBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/CategorizationResultBlock"),
);
const FetchResultsBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/FetchResultsBlock"),
);
const PodcastCompleteBlock = lazy(() =>
  import("@/components/mardown-display/blocks/data-events/PodcastBlock").then(
    (m) => ({
      default: m.PodcastCompleteBlock,
    }),
  ),
);
const PodcastStageBlock = lazy(() =>
  import("@/components/mardown-display/blocks/data-events/PodcastBlock").then(
    (m) => ({
      default: m.PodcastStageBlock,
    }),
  ),
);
const ScrapeBatchCompleteBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/ScrapeBatchCompleteBlock"),
);
const StructuredInputWarningBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/StructuredInputWarningBlock"),
);
const DisplayQuestionnaireBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/DisplayQuestionnaireBlock"),
);
const UnknownDataEventBlock = lazy(
  () =>
    import("@/components/mardown-display/blocks/data-events/UnknownDataEventBlock"),
);

interface AgentContentBlocksProps {
  blocks: ContentBlockPayload[] | Array<Record<string, unknown>>;
}

function renderBlock(
  block: ContentBlockPayload,
  index: number,
): React.ReactNode {
  const d = (block.data ?? {}) as Record<string, unknown>;

  switch (block.type) {
    case "audio_output": {
      const url = d.url as string | undefined;
      if (!url) return null;
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <AudioOutputBlock
            url={url}
            mimeType={d.mime_type as string | undefined}
          />
        </Suspense>
      );
    }

    case "image_output": {
      // Rendered inline by MarkdownStream when content is markdown with image syntax;
      // here we handle the standalone image block case.
      const url = d.url as string | undefined;
      if (!url) return null;
      return (
        <div key={block.blockId ?? index} className="my-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Generated image"
            className="rounded-lg max-w-full"
          />
        </div>
      );
    }

    case "video_output": {
      const url = d.url as string | undefined;
      if (!url) return null;
      return (
        <div key={block.blockId ?? index} className="my-2">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={url} controls className="rounded-lg max-w-full" />
        </div>
      );
    }

    case "search_results":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <SearchResultsBlock
            results={(d.results as Record<string, unknown>[]) ?? []}
            metadata={(d.metadata as Record<string, unknown>) ?? {}}
          />
        </Suspense>
      );

    case "search_error":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <SearchErrorBlock
            error={(d.error as string) ?? "Unknown search error"}
            metadata={(d.metadata as Record<string, unknown>) ?? undefined}
          />
        </Suspense>
      );

    case "function_result":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <FunctionResultBlock
            functionName={(d.function_name as string) ?? "unknown"}
            success={(d.success as boolean) ?? false}
            result={d.result}
            error={(d.error as string | null) ?? null}
            durationMs={(d.duration_ms as number | null) ?? null}
          />
        </Suspense>
      );

    case "workflow_step":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <WorkflowStepBlock
            stepName={(d.step_name as string) ?? "unknown"}
            status={(d.status as string) ?? "unknown"}
            data={(d.data as Record<string, unknown>) ?? undefined}
          />
        </Suspense>
      );

    case "categorization_result":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <CategorizationResultBlock
            promptId={(d.prompt_id as string) ?? ""}
            category={(d.category as string) ?? ""}
            tags={(d.tags as string[]) ?? []}
            description={(d.description as string) ?? undefined}
            dryRun={(d.dry_run as boolean) ?? undefined}
            metadata={(d.metadata as Record<string, unknown>) ?? undefined}
          />
        </Suspense>
      );

    case "fetch_results":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <FetchResultsBlock
            results={(d.results as Record<string, unknown>[]) ?? []}
            metadata={(d.metadata as Record<string, unknown>) ?? {}}
          />
        </Suspense>
      );

    case "podcast_complete":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <PodcastCompleteBlock
            showId={(d.show_id as string) ?? ""}
            success={(d.success as boolean) ?? false}
            episodeCount={(d.episode_count as number) ?? undefined}
            error={(d.error as string | null) ?? null}
          />
        </Suspense>
      );

    case "podcast_stage":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <PodcastStageBlock
            stage={(d.stage as string) ?? ""}
            success={(d.success as boolean) ?? false}
            error={(d.error as string | null) ?? null}
            resultKeys={(d.result_keys as string[]) ?? []}
          />
        </Suspense>
      );

    case "scrape_batch_complete":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <ScrapeBatchCompleteBlock
            totalScraped={(d.total_scraped as number) ?? 0}
          />
        </Suspense>
      );

    case "structured_input_warning":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <StructuredInputWarningBlock
            blockType={(d.block_type as string) ?? "unknown"}
            failures={(d.failures as Record<string, unknown>[]) ?? []}
          />
        </Suspense>
      );

    case "display_questionnaire":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <DisplayQuestionnaireBlock
            introduction={(d.introduction as string) ?? ""}
            questions={(d.questions as Record<string, unknown>[]) ?? []}
          />
        </Suspense>
      );

    case "unknown_data_event":
      return (
        <Suspense key={block.blockId ?? index} fallback={null}>
          <UnknownDataEventBlock
            dataType={(d._dataType as string) ?? "unknown"}
            data={d}
          />
        </Suspense>
      );

    default:
      // Silently skip types handled elsewhere (reasoning, text, tool_call, etc.)
      return null;
  }
}

export function AgentContentBlocks({ blocks }: AgentContentBlocksProps) {
  if (!blocks || blocks.length === 0) return null;

  const rendered = (blocks as ContentBlockPayload[]).map((block, i) =>
    renderBlock(block, i),
  );

  const hasVisible = rendered.some((r) => r !== null);
  if (!hasVisible) return null;

  return <div className="mt-2 space-y-2">{rendered}</div>;
}
