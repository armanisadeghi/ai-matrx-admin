'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/styles/themes/utils';

interface MarkdownRendererProps {
    content: string;
    type: 'flashcard' | 'message';
    fontSize?: number;
    role?: 'user' | 'assistant';
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, type, fontSize = 16, role = 'assistant', className }) => {
    const components = {
        p: ({ node, ...props }) => <p className={`mb-2 ${type === 'flashcard' ? 'text-base' : 'text-sm'}`} {...props} />,
        ul: ({ node, ...props }) => <ul className={`list-disc pl-5 mb-2 ${type === 'flashcard' ? 'text-base' : 'text-sm'}`} {...props} />,
        ol: ({ node, ...props }) => <ol className={`list-decimal pl-5 mb-2 ${type === 'flashcard' ? 'text-base' : 'text-sm'}`} {...props} />,
        li: ({ node, children, ordered, index, ...props }: any) => {
            if (ordered && typeof index === 'number') {
                return (
                    <li className="mb-1" {...props}>
                        <span className="inline-block w-full">
                            <span className="inline-block w-4 mr-2 text-right">{index + 1}.</span>
                            <span className="inline-block w-[calc(100%-1.5rem)]">{children}</span>
                        </span>
                    </li>
                );
            }
            return <li className="mb-1" {...props}>{children}</li>;
        },
        a: ({ node, ...props }) => <a className="text-blue-500 underline" {...props} />,
    };

    const containerStyles = cn(
        type === 'flashcard'
            ? 'text-left mb-4 text-white'
            : `inline-block p-3 rounded-lg w-full ${
                role === 'user'
                    ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100'
                    : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
            }`,
        className
    );

    return (
        <div className={`${type === 'message' ? 'mb-4 w-full' : ''} ${role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={containerStyles} style={{ fontSize: `${fontSize}px` }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default MarkdownRenderer;