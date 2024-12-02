// components/matrx/Entity/prewired-components/layouts/smart-layouts/QuickReferenceWrapper.tsx

import React from 'react';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import {
    QuickReferenceComponentType
} from "@/types/componentConfigTypes";
import {ENTITY_QUICK_REFERENCE} from '../../quick-reference';
import { DynamicStyleOptions } from '../types';


interface QuickReferenceWrapperProps {
    selectedEntity: EntityKeys | null;
    quickReferenceType?: QuickReferenceComponentType;
    dynamicStyleOptions?: DynamicStyleOptions;
    onRecordLoad: (record: EntityData<EntityKeys>) => void;
    onError: (error: EntityError) => void;
    onLabelChange: (label: string) => void;
    onCreateEntityClick: () => void;
}

export const QuickReferenceWrapper: React.FC<QuickReferenceWrapperProps> = (
    {
        selectedEntity,
        quickReferenceType = 'list',
        dynamicStyleOptions: {density, animationPreset} = {},
        onRecordLoad,
        onError,
        onLabelChange,
        onCreateEntityClick
    }) => {
    if (!selectedEntity) return null;

    const commonProps = {
        entityKey: selectedEntity,
        className: 'w-full',
        density,
        animationPreset,
    };

    const Component =
        ENTITY_QUICK_REFERENCE[
            quickReferenceType.toUpperCase() as keyof typeof ENTITY_QUICK_REFERENCE
            ] || ENTITY_QUICK_REFERENCE.LIST;

    return (
        <Component
            {...commonProps}
            {...(quickReferenceType === 'select' && {
                onRecordLoad,
                onError,
                onLabelChange,
            })}
            {...(['cards', 'cardsEnhanced'].includes(quickReferenceType) && {
                showCreateNewButton: true,
                ...(quickReferenceType === 'cardsEnhanced' && {showMultiSelectButton: true}),
                onCreateEntityClick,
            })}
        />
    );
};
