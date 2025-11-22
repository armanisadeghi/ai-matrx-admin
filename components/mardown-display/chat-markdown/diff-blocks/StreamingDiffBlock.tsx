/**
 * Streaming Diff Block
 * 
 * Main component that handles streaming diff content with multiple styles.
 * Optimized for performance with thousands of streaming chunks.
 * 
 * State Machine:
 * detecting → buffering → streaming → complete
 *           ↘ fallback (if unrecognized)
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import { detectDiffStyle, getDiffStyleHandler } from './diff-style-registry';
import { SearchReplaceDiffRenderer } from './renderers/SearchReplaceDiffRenderer';
import { DiffLoadingIndicator } from './DiffLoadingIndicator';
import CodeBlock from '@/features/code-editor/components/code-block/CodeBlock';
import { cn } from '@/lib/utils';
import type { DiffStyle, StreamingDiffState } from './types';

interface StreamingDiffBlockProps {
  content: string;
  language?: string;
  isStreamActive?: boolean;
  className?: string;
}

/**
 * Determine current streaming state based on content
 * Memoized for performance with frequent re-renders
 */
function useStreamingState(content: string, isStreamActive: boolean): {
  state: StreamingDiffState;
  style: DiffStyle;
  confidence: number;
} {
  return useMemo(() => {
    // Not enough content to detect
    if (!content || content.trim().length < 10) {
      return { state: 'detecting', style: 'unknown', confidence: 0 };
    }

    // Detect style
    const detection = detectDiffStyle(content);

    // Low confidence or unknown - keep detecting or fallback
    if (detection.confidence < 0.6) {
      if (isStreamActive) {
        return { state: 'detecting', style: 'unknown', confidence: detection.confidence };
      } else {
        // Stream ended and still don't know - fallback to code block
        return { state: 'fallback', style: 'unknown', confidence: detection.confidence };
      }
    }

    // High confidence - we know the style
    // Determine if we're still streaming or complete
    const state: StreamingDiffState = isStreamActive ? 'streaming' : 'complete';

    return {
      state,
      style: detection.style,
      confidence: detection.confidence,
    };
  }, [content, isStreamActive]);
}

/**
 * Main StreamingDiffBlock component
 * Highly optimized for streaming performance
 */
export const StreamingDiffBlock: React.FC<StreamingDiffBlockProps> = React.memo(({
  content,
  language = 'typescript',
  isStreamActive = false,
  className,
}) => {
  // Determine current state (memoized)
  const { state, style, confidence } = useStreamingState(content, isStreamActive);

  // Get handler for detected style (memoized)
  const handler = useMemo(() => {
    if (style === 'unknown') return null;
    return getDiffStyleHandler(style);
  }, [style]);

  // Parse content with style-specific parser (memoized)
  const parsedData = useMemo(() => {
    if (!handler) return null;
    return handler.parse(content);
  }, [handler, content]);

  // Render based on state
  switch (state) {
    case 'detecting':
      // Still trying to figure out what this is
      return (
        <div className={cn('rounded-lg border border-neutral-200 dark:border-neutral-700 bg-muted/30', className)}>
          <DiffLoadingIndicator message="Analyzing diff format..." />
        </div>
      );

    case 'fallback':
      // Couldn't detect or low confidence - just show as code
      return (
        <CodeBlock
          code={content}
          language="diff"
          showLineNumbers={true}
          className={className}
        />
      );

    case 'streaming':
    case 'complete':
      // Render with style-specific renderer
      return renderDiffByStyle(style, parsedData, language, isStreamActive, className);

    default:
      // Shouldn't reach here
      return null;
  }
});

StreamingDiffBlock.displayName = 'StreamingDiffBlock';

/**
 * Route to appropriate renderer based on diff style
 * Isolated for easy extension with new styles
 */
function renderDiffByStyle(
  style: DiffStyle,
  parsedData: any,
  language: string,
  isStreamActive: boolean,
  className?: string
): React.ReactNode {
  switch (style) {
    case 'search-replace':
      return (
        <SearchReplaceDiffRenderer
          data={parsedData}
          language={language}
          isStreamActive={isStreamActive}
          className={className}
        />
      );

    // Add more style renderers here as needed
    // case 'unified':
    //   return <UnifiedDiffRenderer data={parsedData} ... />;

    case 'unknown':
    default:
      // Fallback to code block
      return (
        <CodeBlock
          code={parsedData?.search || parsedData?.replace || '// Unknown diff format'}
          language="diff"
          showLineNumbers={true}
          className={className}
        />
      );
  }
}

