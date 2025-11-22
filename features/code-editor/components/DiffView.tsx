'use client';

import React from 'react';
import { Prism as SyntaxHighlighterBase } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from '@/styles/themes/ThemeProvider';
import { generateUnifiedDiff, DiffLine } from '@/features/code-editor/utils/generateDiff';
import { cn } from '@/styles/themes/utils';

// Type assertion to resolve React 19 type incompatibility
const SyntaxHighlighter = SyntaxHighlighterBase as any;

interface DiffViewProps {
  originalCode: string;
  modifiedCode: string;
  language: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function DiffView({
  originalCode,
  modifiedCode,
  language,
  showLineNumbers = true,
  className,
}: DiffViewProps) {
  const { mode } = useTheme();
  const diff = generateUnifiedDiff(originalCode, modifiedCode);

  const getDiffLineStyle = (type: DiffLine['type']) => {
    if (type === 'added') {
      return mode === 'dark'
        ? 'bg-green-900/40 border-l-4 border-green-500'
        : 'bg-green-100 border-l-4 border-green-600';
    }
    if (type === 'removed') {
      return mode === 'dark'
        ? 'bg-red-900/40 border-l-4 border-red-500'
        : 'bg-red-100 border-l-4 border-red-600';
    }
    return mode === 'dark' ? 'bg-transparent' : 'bg-transparent';
  };

  const getDiffLinePrefix = (type: DiffLine['type']) => {
    if (type === 'added') return '+ ';
    if (type === 'removed') return '- ';
    return '  ';
  };

  const getDiffLinePrefixColor = (type: DiffLine['type']) => {
    if (type === 'added') {
      return mode === 'dark' ? 'text-green-400' : 'text-green-700';
    }
    if (type === 'removed') {
      return mode === 'dark' ? 'text-red-400' : 'text-red-700';
    }
    return mode === 'dark' ? 'text-gray-500' : 'text-gray-600';
  };

  return (
    <div className={cn('h-full rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700', className)}>
      <div className="h-full overflow-auto">
        <div className={cn(
          'font-mono text-xs',
          mode === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white'
        )}>
          {diff.lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center',
                getDiffLineStyle(line.type)
              )}
            >
              {showLineNumbers && (
                <div className={cn(
                  'shrink-0 w-10 text-right pr-2 select-none',
                  mode === 'dark' ? 'text-gray-500' : 'text-gray-400'
                )}>
                  {line.lineNumber}
                </div>
              )}
              <div className={cn('shrink-0 w-4 select-none font-bold', getDiffLinePrefixColor(line.type))}>
                {getDiffLinePrefix(line.type)}
              </div>
              <div className="flex-1 pr-2 overflow-x-auto">
                <SyntaxHighlighter
                  language={language}
                  style={mode === 'dark' ? vscDarkPlus : vs}
                  PreTag="span"
                  customStyle={{
                    margin: 0,
                    padding: 0,
                    background: 'transparent',
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    lineHeight: '1.2',
                  }}
                  codeTagProps={{
                    style: {
                      background: 'transparent',
                      fontFamily: 'inherit',
                      lineHeight: '1.2',
                    }
                  }}
                >
                  {line.content || ' '}
                </SyntaxHighlighter>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

