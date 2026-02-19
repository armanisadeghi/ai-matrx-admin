import { Suspense, lazy } from 'react';
import { DocumentSkeleton } from '@/features/research/components/shared/Skeletons';

const DocumentViewer = lazy(() => import('@/features/research/components/document/DocumentViewer'));

export default function DocumentPage() {
    return (
        <Suspense fallback={<DocumentSkeleton />}>
            <DocumentViewer />
        </Suspense>
    );
}
