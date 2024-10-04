'use client';

// MarkdownMessageRenderer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageRendererProps {
    content: string;
    role: 'user' | 'assistant';
}

const MarkdownMessageRenderer: React.FC<MarkdownMessageRendererProps> = ({ content, role }) => {
    const components = {
        p: ({node, ...props}) => <p className="mb-2 text-sm" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 text-sm" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 text-sm" {...props} />,
        li: ({node, children, ordered, index, ...props}: any) => {
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
        a: ({node, ...props}) => <a className="text-blue-500 underline text-sm" {...props} />,
    };

    return (
        <div className={`mb-4 w-full ${role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-3 rounded-lg w-full ${
                role === 'user'
                    ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100'
                    : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
            }`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default MarkdownMessageRenderer;