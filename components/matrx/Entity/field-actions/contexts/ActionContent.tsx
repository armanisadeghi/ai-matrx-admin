// components/base/ActionContent.tsx
import React from 'react';
import { PrewiredComponentConfig } from '../types';

interface ActionContentProps {
    component: React.ComponentType<any> | PrewiredComponentConfig;
    props: Record<string, any>;
}

export const ActionContent: React.FC<ActionContentProps> = ({ component, props }) => {
    if ('component' in component) { // PrewiredComponent
        const PrewiredComponent = component.component;
        return <PrewiredComponent {...component.props} {...props} />;
    }

    const Component = component;
    return <Component {...props} />;
};
