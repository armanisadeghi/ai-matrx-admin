import React from 'react';
import { EntityKeys } from '@/types/entityTypes';
import { UnifiedLayoutProps } from '@/components/matrx/Entity/prewired-components/layouts/types';
import {
    EntityQuickReferenceAccordionEnhanced,
    EntityQuickReferenceCardsEnhanced,
    EntityQuickReferenceList,
    EntityQuickReferenceSelect,
} from "./index";

interface UnifiedQuickReferenceProps {
    unifiedLayoutProps: UnifiedLayoutProps;
    className?: string;
}

export const UnifiedQuickReference: React.FC<UnifiedQuickReferenceProps> = ({
    unifiedLayoutProps,
    className = "w-full",
}) => {
    // Extract values from unified props
    const selectedEntity = unifiedLayoutProps.layoutState.selectedEntity;
    const quickReferenceType = unifiedLayoutProps.dynamicLayoutOptions.componentOptions?.quickReferenceType;
    const density = unifiedLayoutProps.dynamicStyleOptions.density;
    const animationPreset = unifiedLayoutProps.dynamicStyleOptions.animationPreset;
    
    // Extract handlers
    const onCreateEntityClick = unifiedLayoutProps.handlers.onCreateEntityClick || (() => {
        console.log("Create new entity clicked");
    });
    const handleRecordLoad = unifiedLayoutProps.handlers.handleRecordLoad;
    const handleError = unifiedLayoutProps.handlers.handleError;
    const handleRecordLabelChange = unifiedLayoutProps.handlers.handleRecordLabelChange;

    // Get QuickReference component based on type
    const QuickReferenceComponent = React.useMemo(() => {
        // Use provided QuickReferenceComponent if available
        if (unifiedLayoutProps.QuickReferenceComponent) {
            return unifiedLayoutProps.QuickReferenceComponent;
        }

        if (!selectedEntity) return null;

        const commonProps = {
            entityKey: selectedEntity as EntityKeys,
            className,
            density,
            animationPreset,
        };

        const quickRefComponentOptions = {
            cards: <EntityQuickReferenceCardsEnhanced {...commonProps} showCreateNewButton onCreateEntityClick={onCreateEntityClick} />,
            cardsEnhanced: (
                <EntityQuickReferenceCardsEnhanced
                    {...commonProps}
                    showCreateNewButton
                    showMultiSelectButton
                    onCreateEntityClick={onCreateEntityClick}
                />
            ),
            accordion: <EntityQuickReferenceAccordionEnhanced {...commonProps} />,
            accordionEnhanced: <EntityQuickReferenceAccordionEnhanced {...commonProps} />,
            list: <EntityQuickReferenceList {...commonProps} />,
            select: (
                <EntityQuickReferenceSelect
                    {...commonProps}
                    onRecordLoad={handleRecordLoad}
                    onError={handleError}
                    onLabelChange={handleRecordLabelChange}
                />
            ),
            default: <EntityQuickReferenceList {...commonProps} />,
            LIST_WITH_RELATED: <EntityQuickReferenceList {...commonProps} />,
        };

        return quickRefComponentOptions[quickReferenceType] || quickRefComponentOptions.list;
    }, [selectedEntity, quickReferenceType, density, animationPreset, unifiedLayoutProps.QuickReferenceComponent, className, onCreateEntityClick, handleRecordLoad, handleError, handleRecordLabelChange]);

    return <>{QuickReferenceComponent}</>;
};

export default UnifiedQuickReference; 