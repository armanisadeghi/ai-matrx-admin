// components/FileManager/FilePreview/TextPreview.tsx
import React, { useState, useEffect } from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from '@/utils/file-operations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface TextPreviewProps {
    file: NodeStructure;
}

export const TextPreview: React.FC<TextPreviewProps> = ({ file }) => {
    const { currentBucket, downloadFile } = useFileSystem();
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
                console.error('Error loading text content:', error);
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
        <ScrollArea className="h-full p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono">
                {content}
            </pre>
        </ScrollArea>
    );
};
