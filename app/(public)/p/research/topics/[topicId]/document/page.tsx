import { Suspense } from 'react';
import { DocumentSkeleton } from '@/features/research/components/shared/Skeletons';
import DocumentViewer from '@/features/research/components/document/DocumentViewer';

export default function DocumentPage() {
    return (
        <Suspense fallback={<DocumentSkeleton />}>
            <DocumentViewer />
        </Suspense>
    );
}
