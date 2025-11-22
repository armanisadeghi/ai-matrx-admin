/**
 * SEARCH/REPLACE Diff Renderer
 * 
 * Handles the streaming illusion for SEARCH/REPLACE blocks:
 * 1. Buffer SEARCH silently (show loading)
 * 2. Stream REPLACE as code
 * 3. Switch to diff view when complete
 */

import React, { useMemo } from 'react';
import { generateUnifiedDiff } from '@/features/code-editor/utils/generateDiff';
import { DiffView } from '@/features/code-editor/components/DiffView';
import CodeBlock from '@/features/code-editor/components/code-block/CodeBlock';
import { DiffLoadingIndicator } from '../DiffLoadingIndicator';
import { DiffCollapsible } from '../DiffCollapsible';
import { GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchReplaceData {
  search: string;
  replace: string;
  searchComplete: boolean;
  replaceComplete: boolean;
  isComplete: boolean;
}

interface SearchReplaceDiffRendererProps {
  data: SearchReplaceData;
  language?: string;
  isStreamActive?: boolean;
  className?: string;
}

/**
 * Efficiently render SEARCH/REPLACE diff with streaming support
 */
export const SearchReplaceDiffRenderer: React.FC<SearchReplaceDiffRendererProps> = ({
  data,
  language = 'typescript',
  isStreamActive = false,
  className,
}) => {
  const { search, replace, searchComplete, replaceComplete, isComplete } = data;

  // Memoize diff generation - only when both are complete
  const showDiffView = useMemo(() => {
    return isComplete && search && replace;
  }, [isComplete, search, replace]);

  // Phase 1: Buffering SEARCH (show loading)
  if (!searchComplete) {
    return (
      <div className={cn('rounded-lg border border-neutral-200 dark:border-neutral-700 bg-muted/30', className)}>
        <DiffLoadingIndicator message="Analyzing code..." />
      </div>
    );
  }

  // Phase 2: SEARCH complete, streaming REPLACE (show as code)
  if (searchComplete && !replaceComplete) {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Show REPLACE streaming as code */}
        {replace && (
          <div className="relative">
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5 rounded font-mono">
                GENERATING
              </div>
            </div>
            <CodeBlock
              code={replace}
              language={language}
              showLineNumbers={true}
              isStreamActive={isStreamActive}
            />
          </div>
        )}
      </div>
    );
  }

  // Phase 3: Both complete - show diff view
  if (showDiffView) {
    return (
      <DiffCollapsible
        icon={<GitCompare className="h-3.5 w-3.5 text-emerald-500" />}
        title="Code Updates"
        initialOpen={true}
        className={className}
      >
        <div className="py-1">
          <DiffView
            originalCode={search}
            modifiedCode={replace}
            language={language}
            showLineNumbers={true}
          />
        </div>
      </DiffCollapsible>
    );
  }

  // Fallback: shouldn't reach here, but show what we have
  return (
    <div className={cn('rounded-lg border border-neutral-200 dark:border-neutral-700', className)}>
      <CodeBlock
        code={replace || search || '// No content'}
        language={language}
        showLineNumbers={true}
      />
    </div>
  );
};

