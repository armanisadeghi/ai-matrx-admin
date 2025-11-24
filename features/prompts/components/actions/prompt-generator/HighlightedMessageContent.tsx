/**
 * HighlightedMessageContent Component
 * 
 * Renders message content with highlighted variables and markdown support
 */

"use client";

import React from 'react';
import MarkdownStream from '@/components/Markdown';

interface HighlightedMessageContentProps {
  content: string;
  isStreamActive?: boolean;
}

/**
 * Component that renders content with variable highlighting
 * Variables in {{variable_name}} format are highlighted
 */
export function HighlightedMessageContent({
  content,
  isStreamActive = false,
}: HighlightedMessageContentProps) {
  // Split content by variable markers
  const parts: Array<{ type: 'text' | 'variable'; content: string }> = [];
  const variableRegex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    // Add text before variable
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
      });
    }

    // Add variable
    parts.push({
      type: 'variable',
      content: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex),
    });
  }

  // If no variables found, render as plain markdown
  if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
    return (
      <MarkdownStream
        content={content}
        isStreamActive={isStreamActive}
        hideCopyButton={true}
      />
    );
  }

  // Render with inline variable highlights
  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.type === 'variable') {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-mono text-sm font-medium"
            >
              <span className="text-purple-400 dark:text-purple-500">{'{'}</span>
              {part.content}
              <span className="text-purple-400 dark:text-purple-500">{'}'}</span>
            </span>
          );
        }

        // For text parts, we need to render them inline
        // If the text contains newlines or markdown, we should handle it carefully
        return (
          <span key={index} className="inline">
            {part.content}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Alternative rendering that converts variables to markdown code blocks
 * and then renders the whole thing as markdown
 */
export function HighlightedMessageContentMarkdown({
  content,
  isStreamActive = false,
}: HighlightedMessageContentProps) {
  // Replace variables with highlighted markdown
  const highlightedContent = content.replace(
    /\{\{([^}]+)\}\}/g,
    '`{{$1}}`'
  );

  return (
    <MarkdownStream
      content={highlightedContent}
      isStreamActive={isStreamActive}
      hideCopyButton={true}
    />
  );
}

