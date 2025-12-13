"use client";
import React, { memo, useMemo } from 'react';
import dynamic from 'next/dynamic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { normalizeLaTeX } from '../utils/latex-normalizer';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

interface InlineLatexRendererProps {
  content: string;
  className?: string;
  /**
   * Whether to apply LaTeX normalization (fixes fractions, spacing, escape sequences)
   * Default: true
   */
  normalize?: boolean;
}

/**
 * Shared component for rendering inline LaTeX in text content
 * 
 * This is the unified LaTeX renderer used across the application for rendering
 * text that may contain math notation. It handles:
 * - Both inline ($...$) and display ($$...$$) math
 * - Escape sequence corruption from JSON (e.g., \text becoming [TAB]ext)
 * - Common AI formatting mistakes (fractions, spacing, etc.)
 * 
 * Used by:
 * - Quiz questions, options, and explanations
 * - Math problem blocks
 * - Any other text that may contain LaTeX notation
 * 
 * @example
 * ```tsx
 * <InlineLatexRenderer content="Water ($\text{H}_2\text{O}$) is essential" />
 * ```
 */
export const InlineLatexRenderer = memo<InlineLatexRendererProps>(({ 
  content, 
  className = '',
  normalize = true 
}) => {
  // Apply LaTeX normalization to fix common issues
  const processedContent = useMemo(() => {
    return normalize ? normalizeLaTeX(content) : content;
  }, [content, normalize]);
  
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Render paragraphs as spans for inline display
          p: ({ children }) => <span>{children}</span>,
          // Remove extra spacing from math elements
          div: ({ children }) => <span>{children}</span>
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </span>
  );
});

InlineLatexRenderer.displayName = 'InlineLatexRenderer';

