import { Suspense } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';
import CostDashboard from '@/features/research/components/costs/CostDashboard';

export default function CostsPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <CostDashboard />
        </Suspense>
    );
}
