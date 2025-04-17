"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Components } from 'react-markdown';

export interface MarkdownWithPluginsProps {
  content: string;
  components: Components;
}

const MarkdownWithPlugins = ({ content, components }: MarkdownWithPluginsProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownWithPlugins; 