import React from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity/prewired-components/layouts/types';
import SplitLayout from './SplitLayout';
import SideBySideLayout from './SideBySideLayout';
import StackedLayout from './StackedLayout';
import ResizableLayout from './ResizableLayout';
import NewEntitySplitLayout from '@/app/entities/layout/MergedEntityLayout';

interface UnifiedLayoutRendererProps {
    unifiedLayoutProps: UnifiedLayoutProps;
    className?: string;
}

export const UnifiedLayoutRenderer: React.FC<UnifiedLayoutRendererProps> = ({
    unifiedLayoutProps,
    className,
}) => {
    // Extract layout variant from unified props
    const layoutVariant = unifiedLayoutProps.dynamicLayoutOptions.componentOptions?.formLayoutType;

    // Layout component mapping
    const layouts = {
        split: <SplitLayout unifiedLayoutProps={unifiedLayoutProps} className={className} />,
        sideBySide: <SideBySideLayout unifiedLayoutProps={unifiedLayoutProps} className={className} />,
        stacked: <StackedLayout unifiedLayoutProps={unifiedLayoutProps} className={className} />,
        resizable: <ResizableLayout unifiedLayoutProps={unifiedLayoutProps} className={className} />,
        newSplit: <NewEntitySplitLayout {...unifiedLayoutProps} className={`h-full ${className || ''}`} />,
    };

    // Return the selected layout or fallback to split
    return layouts[layoutVariant] || layouts.split;
};

export default UnifiedLayoutRenderer; 