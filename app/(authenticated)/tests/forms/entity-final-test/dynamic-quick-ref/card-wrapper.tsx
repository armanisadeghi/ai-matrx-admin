'use client';

import {memo, ReactNode, useEffect} from 'react';
import {FetchMode, useAppSelector, useEntityTools} from '@/lib/redux';
import {EntityKeys} from '@/types/entityTypes';
import {MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {useSelectQuickRef} from '../hooks/useSelectQuickRef';
import {QuickRefVariant, QUICK_REF_VARIANTS} from './quick-ref-item';

export interface QuickRefRendererProps {
    entityKey: EntityKeys;
    variant?: QuickRefVariant;
    fetchMode?: FetchMode;
}

const SelectableWrapper = memo(function SelectableWrapper(
    {
        entityKey,
        recordKey,
        onSelect,
        children
    }: {
        entityKey: EntityKeys;
        recordKey: MatrxRecordId;
        onSelect: (recordKey: MatrxRecordId) => void;
        children: (isSelected: boolean) => ReactNode;
    }) {
    const {selectors} = useEntityTools(entityKey);
    const isSelected = useAppSelector(state =>
        selectors.selectIsRecordSelected(state, recordKey)
    );

    return (
        <div onClick={() => onSelect(recordKey)}>
            {children(isSelected)}
        </div>
    );
});

function useQuickRefRenderer(
    {
        entityKey,
        variant = 'icon',
        fetchMode = 'fkIfk'
    }: QuickRefRendererProps) {
    const {
        handleRecordSelect,
        quickReferenceRecords,
        setFetchMode
    } = useSelectQuickRef(entityKey);

    useEffect(() => {
        setFetchMode(fetchMode);
    }, [entityKey, setFetchMode, fetchMode]);

    const QuickRefComponent = QUICK_REF_VARIANTS[variant];

    const renderItems = () => {
        if (!quickReferenceRecords) return null;

        return quickReferenceRecords.map(record => (
            <SelectableWrapper
                key={record.recordKey}
                entityKey={entityKey}
                recordKey={record.recordKey}
                onSelect={handleRecordSelect}
            >
                {(isSelected) => (
                    <QuickRefComponent
                        displayValue={record.displayValue}
                        isSelected={isSelected}
                    />
                )}
            </SelectableWrapper>
        ));
    };

    return {
        renderItems,
        records: quickReferenceRecords
    };
}

export {useQuickRefRenderer};