// components/FileManager/FilePreview/CodePreview.tsx
import React, { useState, useEffect } from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from '@/utils/file-operations';
import { Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface CodePreviewProps {
    file: NodeStructure;
}

export const CodePreview: React.FC<CodePreviewProps> = ({ file }) => {
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
                console.error('Error loading code content:', error);
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
        <div className="h-full">
            <Editor
                height="100%"
                defaultLanguage={file.extension.toLowerCase()}
                value={content}
                options={{
                    readOnly: true,
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                }}
                theme="vs-dark"
            />
        </div>
    );
};

