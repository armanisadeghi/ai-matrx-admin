// useUpdateFields.ts
import { useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

type FieldValue = string | number | boolean | null | Record<string, unknown> | unknown;
type FieldUpdates = Record<string, FieldValue>;

interface UseUpdateFieldsResult {
    updateField: (recordId: MatrxRecordId, fieldName: string, value: FieldValue) => void;
    updateFields: (recordId: MatrxRecordId, updates: FieldUpdates) => void;
}

export const useUpdateFields = (entityKey: EntityKeys): UseUpdateFieldsResult => {
    const dispatch = useDispatch();
    const { actions, fields } = useEntityTools(entityKey);
    const validFieldNames = new Set(Object.keys(fields));

    const updateField = useCallback(
        (recordId: MatrxRecordId, fieldName: string, value: FieldValue) => {
            if (validFieldNames.has(fieldName)) {
                dispatch(
                    actions.updateUnsavedField({
                        recordId,
                        field: fieldName,
                        value,
                    })
                );
            }
        },
        [dispatch, actions, validFieldNames]
    );

    const updateFields = useCallback(
        (recordId: MatrxRecordId, updates: FieldUpdates) => {
            const validUpdates = Object.entries(updates)
                .filter(([fieldName]) => validFieldNames.has(fieldName))
                .map(([fieldName, value]) => ({
                    recordId,
                    field: fieldName,
                    value,
                }));

            if (validUpdates.length > 0) {
                dispatch(actions.updateUnsavedFields({ updates: validUpdates }));
            }
        },
        [dispatch, actions, validFieldNames]
    );

    return { updateField, updateFields };
};

export const useFieldUpdate = (entityKey: EntityKeys, recordId: MatrxRecordId | undefined, fieldName: string) => {
    const dispatch = useDispatch();
    const { actions, fields } = useEntityTools(entityKey);

    return useCallback(
        (value: FieldValue) => {
            if (recordId && fields[fieldName]) {
                dispatch(
                    actions.updateUnsavedField({
                        recordId,
                        field: fieldName,
                        value,
                    })
                );
            }
        },
        [dispatch, actions, recordId, fieldName, fields]
    );
};
