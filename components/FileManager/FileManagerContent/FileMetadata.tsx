// components/FileManager/FileManagerContent/FileMetadata.tsx
import React from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { Card } from '@/components/ui/card';
import {formatDate, formatFileSize } from './utils';
import {BucketStructure} from "@/utils/file-operations";

interface FileMetadataProps {
    file: BucketStructure;
}

export const FileMetadata: React.FC<FileMetadataProps> = ({ file }) => {
    const { currentBucket } = useFileSystem();

    if (!file || file.type === 'FOLDER') return null;

    return (
        <Card className="p-4 mt-4">
            <h3 className="text-lg font-medium mb-4">File Information</h3>
            <div className="space-y-2">
                <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">{file.path.split('/').pop()}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="text-sm font-medium">{file.type}</p>
                </div>
                {file.metadata && (
                    <>
                        <div>
                            <p className="text-sm text-muted-foreground">Size</p>
                            <p className="text-sm font-medium">
                                {formatFileSize(file.metadata.size)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Last Modified</p>
                            <p className="text-sm font-medium">
                                {formatDate(file.metadata.lastModified)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">MIME Type</p>
                            <p className="text-sm font-medium">{file.metadata.mimetype}</p>
                        </div>
                    </>
                )}
                {file.details && (
                    <>
                        <div>
                            <p className="text-sm text-muted-foreground">Category</p>
                            <p className="text-sm font-medium">{file.details.category}</p>
                        </div>
                        {file.details.subCategory && (
                            <div>
                                <p className="text-sm text-muted-foreground">Sub Category</p>
                                <p className="text-sm font-medium">{file.details.subCategory}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
};
