'use client';

// FilesPack — Provider pack for routes with file management.
// Wraps children with FileSystemProvider, FilePreviewProvider, and OldFileSystemProvider.

import { FileSystemProvider } from '@/lib/redux/fileSystem/Provider';
import { FilePreviewProvider } from '@/components/file-system/preview';
import { FileSystemProvider as OldFileSystemProvider } from '@/providers/FileSystemProvider';

const allowedBuckets = ['userContent', 'Audio', 'Images', 'Documents', 'Code', 'any-file'] as const;

interface FilesPackProps {
    children: React.ReactNode;
}

export function FilesPack({ children }: FilesPackProps) {
    return (
        <FileSystemProvider initialBucket="Audio" allowedBuckets={allowedBuckets}>
            <FilePreviewProvider>
                <OldFileSystemProvider>
                    {children}
                </OldFileSystemProvider>
            </FilePreviewProvider>
        </FileSystemProvider>
    );
}
