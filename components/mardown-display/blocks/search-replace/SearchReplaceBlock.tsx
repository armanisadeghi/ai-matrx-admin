/**
 * SearchReplaceBlock — Content Block for SEARCH/REPLACE instructions
 *
 * Rendered when the server sends a `content_block` event with type "search_replace".
 *
 * Supports two render modes:
 *   1. Server-processed: `serverData` carries pre-parsed { search, replace, … }
 *   2. Streaming/fallback: raw `content` string is delegated to StreamingDiffBlock
 *
 * When `isStreamActive` is true:
 *   - Phase 1 (search buffering): shows "Analyzing code…" loader
 *   - Phase 2 (replace streaming): shows replacement code with GENERATING badge
 *   - Phase 3 (both complete): collapses into a diff view
 * When `isStreamActive` is false (history / stored message):
 *   - Renders final collapsed diff view immediately
 */

'use client';

import React from 'react';
import { SearchReplaceDiffRenderer } from '@/components/mardown-display/chat-markdown/diff-blocks/renderers/SearchReplaceDiffRenderer';
import { StreamingDiffBlock } from '@/components/mardown-display/chat-markdown/diff-blocks/StreamingDiffBlock';
import { DiffLoadingIndicator } from '@/components/mardown-display/chat-markdown/diff-blocks/DiffLoadingIndicator';
import { cn } from '@/lib/utils';

// ─── Server-parsed data shape ────────────────────────────────────────────────
// Python emits this in content_block.data when type === "search_replace"
export interface SearchReplaceBlockData {
  /** The code / text to find (exact). */
  search: string;
  /** The replacement code / text. */
  replace: string;
  /** True once the SEARCH section has finished streaming. */
  searchComplete: boolean;
  /** True once the REPLACE section has finished streaming. */
  replaceComplete: boolean;
  /** True when both sections are complete. */
  isComplete: boolean;
  /** Source language for syntax highlighting (e.g. "typescript"). */
  language?: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface SearchReplaceBlockProps {
  /**
   * Pre-parsed structured data from the server.
   * When present, the component renders from this directly.
   */
  serverData?: SearchReplaceBlockData | Record<string, unknown>;

  /**
   * Raw streaming content string (fallback when serverData is absent).
   * Must be the full text content of a SEARCH/REPLACE block including delimiters.
   */
  content?: string;

  /** Whether the block is still actively streaming. */
  isStreamActive?: boolean;

  /** Source language for syntax highlighting. Defaults to "typescript". */
  language?: string;

  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const SearchReplaceBlock: React.FC<SearchReplaceBlockProps> = ({
  serverData,
  content,
  isStreamActive = false,
  language = 'typescript',
  className,
}) => {
  // ── Path 1: server provided structured data ──────────────────────────────
  if (serverData && typeof serverData === 'object' && 'search' in serverData) {
    const data = serverData as SearchReplaceBlockData;
    const effectiveLanguage = data.language ?? language;

    // If neither section has content yet, show loading
    if (!data.search && !data.replace) {
      return (
        <div className={cn('rounded-lg border border-neutral-200 dark:border-neutral-700 bg-muted/30', className)}>
          <DiffLoadingIndicator message="Preparing code changes…" />
        </div>
      );
    }

    return (
      <SearchReplaceDiffRenderer
        data={{
          search: data.search ?? '',
          replace: data.replace ?? '',
          searchComplete: data.searchComplete ?? !isStreamActive,
          replaceComplete: data.replaceComplete ?? !isStreamActive,
          isComplete: data.isComplete ?? !isStreamActive,
        }}
        language={effectiveLanguage}
        isStreamActive={isStreamActive}
        className={className}
      />
    );
  }

  // ── Path 2: raw streaming content string ─────────────────────────────────
  if (content) {
    return (
      <StreamingDiffBlock
        content={content}
        language={language}
        isStreamActive={isStreamActive}
        className={className}
      />
    );
  }

  // ── Path 3: nothing yet — show initial loader ────────────────────────────
  return (
    <div className={cn('rounded-lg border border-neutral-200 dark:border-neutral-700 bg-muted/30', className)}>
      <DiffLoadingIndicator message="Waiting for changes…" />
    </div>
  );
};

export default SearchReplaceBlock;
