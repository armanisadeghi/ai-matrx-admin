import { Suspense } from 'react';
import ConsentClient from './ConsentClient';
import ConsentLoadingSkeleton from './loading';

export default function OAuthConsentPage() {
    return (
        <Suspense fallback={<ConsentLoadingSkeleton />}>
            <ConsentClient />
        </Suspense>
    );
}
