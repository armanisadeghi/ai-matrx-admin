'use client';

import { useState, useEffect } from 'react';
import { createEntitySelectors } from "@/lib/redux";
import { useAppSelector } from "@/lib/redux";
import { EntityStateField, MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";

export const useFieldValue = (
    selectors: ReturnType<typeof createEntitySelectors>,
    recordId: MatrxRecordId | null,
    fieldName: string,
    fieldMetadata: EntityStateField
) => {
    const fieldValue = useAppSelector(
        state => recordId 
            ? selectors.selectEffectiveFieldValue(state, recordId, fieldName) 
            : fieldMetadata?.defaultValue ?? ''
    );

    const [currentValue, setCurrentValue] = useState<unknown>(
        fieldValue ?? fieldMetadata?.defaultValue ?? ''
    );

    useEffect(() => {
        if (fieldValue !== undefined) {
            setCurrentValue(fieldValue);
        }
    }, [fieldValue]);

    return [currentValue, setCurrentValue] as const;
};