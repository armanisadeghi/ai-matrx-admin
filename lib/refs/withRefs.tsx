// lib/refs/withRefs.tsx
import React from 'react';
import { RefMethod } from './types';


export interface WithRefsProps {
    componentId: string;
    refMethods?: { [key: string]: RefMethod };
}

export function withRefs<P extends WithRefsProps>(
    WrappedComponent: React.ComponentType<P>
) {
    return function WithRefsComponent(props: P) {
        return <WrappedComponent {...props} />;
    };
}
