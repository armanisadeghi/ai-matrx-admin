'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {CheckSquare} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import SmartCrudWrapper, {
    SmartCrudWrapperProps
} from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper";
import EntityQuickRefCardItem from './EntityQuickRefCardItem';
import {useQuickRef} from "./useQuickRef";

interface EntityQuickReferenceCardsProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onSelectionChange?: (recordId: string | string[]) => void;
    smartCrudProps?: Partial<SmartCrudWrapperProps>;
    className?: string;
}

const SMART_CRUD_PROP_DEFAULTS: Partial<SmartCrudWrapperProps> = {
    options: {
        allowCreate: true,
        allowEdit: true,
        allowDelete: true,
        showConfirmation: true
    },
    layout: {
        buttonLayout: 'row' as const,
        buttonSize: 'icon' as const,
        buttonSpacing: 'normal' as const
    }
};

function EntityQuickReferenceFinal<TEntity extends EntityKeys>(
    {
        entityKey,
        className = '',
        smartCrudProps = SMART_CRUD_PROP_DEFAULTS,
    }: EntityQuickReferenceCardsProps<TEntity>) {
    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        toggleSelectionMode,
        setFetchMode,
    } = useQuickRef(entityKey);

    React.useEffect(() => {
        setFetchMode('fkIfk');
    }, [entityKey]);

    const fullSmartCrudProps = React.useMemo(() => ({
        entityKey,
        ...smartCrudProps,
    }), [entityKey, smartCrudProps]);

    const recordsList = React.useMemo(() => (
        quickReferenceRecords.slice(0, 20).map((ref) => (
            <EntityQuickRefCardItem
                key={ref.recordKey}
                recordKey={ref.recordKey}
                displayValue={ref.displayValue}
                isSelected={isSelected(ref.recordKey)}
                onSelect={handleRecordSelect}
            />
        ))
    ), [quickReferenceRecords, isSelected, handleRecordSelect]);

    return (
        <div className={cn('flex flex-col w-full min-w-0 p-1', className)}>
            <div className="p-2 flex items-center justify-center">
                <SmartCrudWrapper {...fullSmartCrudProps} />
            </div>

            {selectionMode !== 'none' && (
                <div className="p-2 flex items-center justify-center">
                    <Button
                        onClick={toggleSelectionMode}
                        size="sm"
                        variant={selectionMode === 'multiple' ? 'secondary' : 'outline'}
                    >
                        <CheckSquare className="h-4 w-4 mr-2"/>
                        {selectionMode === 'multiple' ? 'Cancel Multi' : 'Multi'}
                    </Button>
                </div>
            )}

            <div className="grid auto-rows-fr overflow-y-auto space-y-1">
                {recordsList}
            </div>
        </div>
    );
}

export default EntityQuickReferenceFinal;