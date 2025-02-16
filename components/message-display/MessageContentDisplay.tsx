'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { TableWrapper, LinkWrapper } from '.';
import CodeBlock from '../mardown-display/CodeBlock';

interface MessageContentDisplayProps {
    content: string;
    role: 'assistant' | 'user';
}

const MarkdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const code = String(children).replace(/\n$/, '');

        if (inline) {
            return (
                <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm">
                    {children}
                </code>
            );
        }

        // Get language from match, default to 'typescript' if none specified
        const language = match ? match[1] : 'typescript';


        return (
            <CodeBlock
                code={code}
                language={language}
                inline={false}
                className={className}
                {...props}
            />
        );
    },

    p: ({ children }: any) => {
        const isBlockElement = React.Children.toArray(children).some(
            (child: any) => child?.type === CodeBlock
        );

        if (isBlockElement) {
            return <>{children}</>;
        }

        return <div>{children}</div>;
    },

    table: TableWrapper,
    a: LinkWrapper as any,
};

const MessageContentDisplay = ({ content, role }: MessageContentDisplayProps) => {
    const hasSpecialContent = content.includes('```') || content.includes('|---|') || content.includes('#');

    const MarkdownContent = () => (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
            rehypePlugins={[rehypeRaw]}
            components={MarkdownComponents}
        >
            {content}
        </ReactMarkdown>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'prose prose-sm max-w-none',
                'prose-headings:font-semibold prose-headings:mb-3 prose-headings:mt-6',
                'prose-p:my-2 prose-p:leading-relaxed',
                'prose-pre:my-0 prose-pre:bg-muted/50',
                'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md',
                'prose-ul:my-2 prose-li:my-0.5',
                'prose-table:border prose-table:border-border',
                'prose-th:bg-muted/50 prose-th:p-2 prose-th:text-left',
                'prose-td:p-2 prose-td:border-t prose-td:border-border',
                role === 'assistant' ? 'prose-primary' : 'prose-neutral'
            )}
        >
            {hasSpecialContent ? (
                <Tabs defaultValue="rendered" className="w-full">
                    <TabsList className="mb-2">
                        <TabsTrigger value="rendered">Rendered</TabsTrigger>
                        <TabsTrigger value="raw">Raw</TabsTrigger>
                    </TabsList>
                    <TabsContent value="rendered" className="mt-0">
                        <MarkdownContent />
                    </TabsContent>
                    <TabsContent value="raw" className="mt-0">
                        <pre className="p-4 bg-muted/50 rounded-lg overflow-x-auto">
                            <code>{content}</code>
                        </pre>
                    </TabsContent>
                </Tabs>
            ) : (
                 <MarkdownContent />
             )}
        </motion.div>
    );
};

export default MessageContentDisplay;
