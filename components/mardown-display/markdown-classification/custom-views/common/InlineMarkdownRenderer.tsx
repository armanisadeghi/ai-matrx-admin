'use client';

import React from 'react';

interface InlineMarkdownRendererProps {
  text: string;
  className?: string;
}

/**
 * A lightweight inline markdown renderer that only processes bold text
 * using ** or __ syntax without modifying layout or structure
 */
export default function InlineMarkdownRenderer({ 
  text, 
  className = "" 
}: InlineMarkdownRendererProps) {
  if (!text) return null;
  
  // Process bold text with ** or __ syntax
  const processedText = text.split(/(\*\*.*?\*\*|__.*?__)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Extract content between ** markers
      const content = part.slice(2, -2);
      return <strong key={index} className="font-bold text-indigo-700 dark:text-indigo-400">{content}</strong>;
    }
    
    if (part.startsWith('__') && part.endsWith('__')) {
      // Extract content between __ markers
      const content = part.slice(2, -2);
      return <strong key={index} className="font-bold text-indigo-700 dark:text-indigo-400">{content}</strong>;
    }
    
    return part;
  });
  
  return <span className={className}>{processedText}</span>;
} 