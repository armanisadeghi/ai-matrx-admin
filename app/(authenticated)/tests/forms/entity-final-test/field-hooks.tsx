'use client';

import {useEffect, useState} from 'react';
import {
    EntityStateField,
    EntityOperationMode,
    MatrxRecordId
} from "@/lib/redux/entity/types/stateTypes";
import {createEntitySelectors} from "@/lib/redux";
import {useAppSelector} from "@/lib/redux";

export const useFieldValue = (
    selectors: ReturnType<typeof createEntitySelectors>,
    recordId: MatrxRecordId | null,
    fieldName: string,
    fieldMetadata: EntityStateField,
    operationMode: EntityOperationMode | undefined
) => {
    const databaseValue = useAppSelector(
        state => recordId ? selectors.selectFieldValue(state, recordId, fieldName) : undefined
    );

    const [currentValue, setCurrentValue] = useState<unknown>(() => {
        if (operationMode === 'create') {
            return fieldMetadata?.defaultValue ?? '';
        }
        return databaseValue ?? fieldMetadata?.defaultValue ?? '';
    });

    useEffect(() => {
        if (operationMode === 'create') {
            setCurrentValue(fieldMetadata?.defaultValue ?? '');
        } else if (databaseValue !== undefined) {
            setCurrentValue(databaseValue);
        }
    }, [databaseValue, fieldMetadata?.defaultValue, operationMode]);

    return [currentValue, setCurrentValue] as const;
};
