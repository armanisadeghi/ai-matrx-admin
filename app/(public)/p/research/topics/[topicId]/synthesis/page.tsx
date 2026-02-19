import { Suspense, lazy } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';

const SynthesisList = lazy(() => import('@/features/research/components/synthesis/SynthesisList'));

export default function SynthesisPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <SynthesisList />
        </Suspense>
    );
}
