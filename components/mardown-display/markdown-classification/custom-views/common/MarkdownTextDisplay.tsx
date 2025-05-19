'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
  loading: () => <p className="text-slate-500 dark:text-slate-400">Loading content...</p>
});

// Import react-markdown components for customization
import type { Components } from 'react-markdown';

interface MarkdownTextDisplayProps {
  content: string | string[];
  className?: string;
  listClassName?: string;
  listItemClassName?: string;
  isCollapsed?: boolean;
}

export default function MarkdownTextDisplay({
  content,
  className = "text-slate-700 dark:text-slate-300",
  listClassName = "list-disc pl-0 space-y-3 mt-2",
  listItemClassName = "",
  isCollapsed = false
}: MarkdownTextDisplayProps): React.ReactNode {
  
  // Custom components for ReactMarkdown
  const customComponents: Components = {
    // Ensure paragraphs in lists display inline
    p: ({ children, ...props }) => <span className="inline" {...props}>{children}</span>
  };
  
  // For a single string
  if (typeof content === 'string') {
    return (
      <div className={`${className} ${isCollapsed ? 'line-clamp-2' : ''}`}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }
  
  // For an array of strings
  return (
    <div className={className}>
      <ul className={listClassName}>
        {content.map((item, index) => (
          <li key={index} className={`${listItemClassName} flex items-start`}>
            <span className="inline-block mr-1">•</span>
            <span className="inline-block">
              <ReactMarkdown components={customComponents}>
                {item}
              </ReactMarkdown>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
} 