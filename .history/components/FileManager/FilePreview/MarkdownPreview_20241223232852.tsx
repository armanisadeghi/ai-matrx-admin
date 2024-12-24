// components/FileManager/FilePreview/MarkdownPreview.tsx
import React, { useState, useEffect } from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from '@/utils/file-operations';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypePrism from 'rehype-prism-plus';
import 'katex/dist/katex.min.css';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarkdownPreviewProps {
    file: NodeStructure;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ file }) => {
    const { downloadFile, currentBucket } = useFileSystem();
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadContent = async () => {
            setIsLoading(true);
            try {
                const blob = await downloadFile(currentBucket!, file.path);
                if (blob) {
                    const text = await blob.text();
                    setContent(text);
                }
            } catch (error) {
                console.error('Error loading markdown content:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadContent();
    }, [file.path]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypePrism]}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </ScrollArea>
    );
};
