import { Suspense, lazy } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';

const CostDashboard = lazy(() => import('@/features/research/components/costs/CostDashboard'));

export default function CostsPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <CostDashboard />
        </Suspense>
    );
}
