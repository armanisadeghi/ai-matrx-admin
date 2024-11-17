// components/DynamicLoader.tsx
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface DynamicLoaderProps {
    loader: () => Promise<{ default: React.ComponentType<any> }>;
    props: Record<string, any>;
}

export const DynamicLoader: React.FC<DynamicLoaderProps> = ({ loader, props }) => {
    const Component = React.lazy(() => loader());

    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="animate-spin" />
                </div>
            }
        >
            <Component {...props} />
        </Suspense>
    );
};
