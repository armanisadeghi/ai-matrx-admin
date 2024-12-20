'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {CheckSquare, Grid2X2} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import SmartCrudWrapper, {
    SmartCrudWrapperProps
} from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper";
import {MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {useFetchQuickRef} from "@/app/(authenticated)/tests/forms/entity-final-test/hooks/useFetchQuickRef";
import {useSelectQuickRef} from "@/app/(authenticated)/tests/forms/entity-final-test/hooks/useSelectQuickRef";
import {memo} from "react";
import {useAppSelector, useEntityTools} from "@/lib/redux";
import {Card, CardContent} from "@/components/ui";

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


interface EntityQuickRefCardItemProps {
    entityKey: EntityKeys;
    recordKey: string;
    displayValue: string;
    onSelect: (recordKey: string) => void;
}

const EntityQuickRefCardItem = memo(function EntityQuickRefCardItem(
    {
        entityKey,
        recordKey,
        displayValue,
        onSelect
    }: EntityQuickRefCardItemProps) {

    const { selectors } = useEntityTools(entityKey);
    const isSelected = useAppSelector(state => selectors.selectIsRecordSelected(state, recordKey));

    return (
        <Card
            className={cn(
                'relative cursor-pointer p-[0px]',
                isSelected ? 'border border-primary bg-accent' : 'hover:bg-accent/50'
            )}
            onClick={() => onSelect(recordKey)}
        >
            <CardContent className="p-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Grid2X2 className="h-4 w-4 flex-shrink-0 text-muted-foreground"/>
                    <div className="font-medium text-foreground truncate text-sm">
                        {displayValue}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});




function EntityQuickReferenceFinal<TEntity extends EntityKeys>(
    {
        entityKey,
        className = '',
        smartCrudProps = SMART_CRUD_PROP_DEFAULTS,
    }: EntityQuickReferenceCardsProps<TEntity>) {
    const {quickReferenceRecords} = useFetchQuickRef(entityKey);

    const {
        selectionMode,
        handleRecordSelect,
        toggleSelectionMode,
        setFetchMode,
    } = useSelectQuickRef(entityKey);

    const createRecordItem = React.useCallback((ref: { recordKey: MatrxRecordId; displayValue: string }) => (
        <EntityQuickRefCardItem
            key={ref.recordKey}
            entityKey={entityKey}
            recordKey={ref.recordKey}
            displayValue={ref.displayValue}
            onSelect={handleRecordSelect}
        />
    ), [handleRecordSelect]);

    const recordsList = React.useMemo(() =>
            quickReferenceRecords.slice(0, 20).map(createRecordItem),
        [quickReferenceRecords, createRecordItem]);

    React.useEffect(() => {
        setFetchMode('fkIfk');
    }, [entityKey, setFetchMode]);

    const fullSmartCrudProps = React.useMemo(() => ({
        entityKey,
        ...smartCrudProps,
    }), [entityKey, smartCrudProps]);

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