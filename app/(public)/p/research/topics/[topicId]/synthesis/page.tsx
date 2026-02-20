import { Suspense } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';
import SynthesisList from '@/features/research/components/synthesis/SynthesisList';

export default function SynthesisPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <SynthesisList />
        </Suspense>
    );
}
