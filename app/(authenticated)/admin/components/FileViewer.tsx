// components/FileViewer/FileViewer.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FullEditableJsonViewer from '@/components/ui/JsonComponents/JsonEditor';
import { FileContentResult } from '@/utils/fileContentHandlers';

interface FileViewerProps {
    fileContent: FileContentResult;
    onContentChange?: (content: any) => void;
    title?: string;
    readonly?: boolean;
}

export const FileViewer: React.FC<FileViewerProps> = ({
    fileContent,
    onContentChange,
    title = 'File Viewer',
    readonly = false
}) => {
    const renderContent = () => {
        if (fileContent.error) {
            return (
                <div className="text-destructive p-4">
                    {fileContent.error}
                </div>
            );
        }

        switch (fileContent.viewerType) {
            case 'json':
                return (
                    <FullEditableJsonViewer
                        title={title}
                        data={fileContent.content}
                        initialExpanded={true}
                        defaultEnhancedMode={true}
                        onChange={onContentChange}
                        readOnly={readonly}
                    />
                );

            case 'markdown':
                // You could use a markdown viewer here
                return (
                    <div className="prose dark:prose-invert max-w-none p-4">
                        {fileContent.content}
                    </div>
                );

            case 'text':
                return (
                    <div className="font-mono text-sm p-4 whitespace-pre-wrap">
                        {fileContent.content}
                    </div>
                );

            case 'image':
                return (
                    <div className="flex justify-center p-4">
                        <img
                            src={fileContent.content}
                            alt="File content"
                            className="max-w-full h-auto"
                        />
                    </div>
                );

            case 'binary':
                return (
                    <div className="text-muted-foreground p-4">
                        Binary file - Download to view content
                    </div>
                );

            default:
                return (
                    <div className="text-muted-foreground p-4">
                        Unable to display file content
                    </div>
                );
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    );
};
