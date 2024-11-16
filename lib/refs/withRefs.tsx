// lib/refs/withRefs.tsx
import React, {useMemo} from 'react';
import { useComponentRef } from './hooks';
import { RefMethod } from './types';

export interface WithRefsProps {
    componentId: string;
    refMethods?: { [key: string]: RefMethod };
}

// lib/refs/withRefs.tsx
export function withRefs<P extends WithRefsProps>(
    WrappedComponent: React.ComponentType<P>
) {
    return function WithRefsComponent(props: P) {
        return <WrappedComponent {...props} />;
    };
}
