// useUpdateFields.ts
import { useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useCallback } from 'react';

// Updated to handle any type of value
type FieldValue = string | number | boolean | null | Record<string, unknown> | unknown;
type FieldUpdates = Record<string, FieldValue>;

interface UseUpdateFieldsResult {
    updateField: (recordId: MatrxRecordId, fieldName: string, value: FieldValue) => void;
    updateFields: (recordId: MatrxRecordId, updates: FieldUpdates) => void;
}

export const useUpdateFields = (entityKey: EntityKeys): UseUpdateFieldsResult => {
    const { actions, dispatch, selectors } = useEntityTools(entityKey);
    const fieldSchema = useAppSelector(selectors.selectFieldInfo);

    const updateField = useCallback(
        (recordId: MatrxRecordId, fieldName: string, value: FieldValue) => {
            if (fieldSchema.some((field) => field.name === fieldName)) {
                dispatch(
                    actions.updateUnsavedField({
                        recordId,
                        field: fieldName,
                        value,
                    })
                );
            }
        },
        [dispatch, actions, fieldSchema]
    );

    const updateFields = useCallback(
        (recordId: MatrxRecordId, updates: FieldUpdates) => {
            // Convert updates object to array format and filter valid fields
            const validUpdates = Object.entries(updates)
                .filter(([fieldName]) => fieldSchema.some((field) => field.name === fieldName))
                .map(([fieldName, value]) => ({
                    recordId,
                    field: fieldName,
                    value,
                }));

            if (validUpdates.length > 0) {
                dispatch(actions.updateUnsavedFields({ updates: validUpdates }));
            }
        },
        [dispatch, actions, fieldSchema]
    );

    return { updateField, updateFields };
};