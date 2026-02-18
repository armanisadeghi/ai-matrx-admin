import { Suspense, lazy } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';

const LinkExplorer = lazy(() => import('@/features/research/components/links/LinkExplorer'));

export default function LinksPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <LinkExplorer />
        </Suspense>
    );
}
