import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from "@/lib/redux/store";
import { updateFormField } from "@/lib/redux/slices/formSlice";
import { useAppSelector } from "@/lib/redux/hooks";
import { createEntitySelectors } from "@/lib/redux/entity/selectors";
import { getEntitySlice } from "@/lib/redux/entity/entitySlice";
import { EntityKeys } from "@/types/entityTypes";

export const useFormStateManager = (entityKey: EntityKeys) => {
    const dispatch = useDispatch<AppDispatch>();

    // Create memoized selectors and actions
    const selectors = useMemo(
        () => createEntitySelectors(entityKey),
        [entityKey]
    );

    const { actions } = useMemo(
        () => getEntitySlice(entityKey),
        [entityKey]
    );

    // Get form-related data from selectors
    const formFields = useAppSelector(selectors.selectFlexFormField);
    const defaultValues = useAppSelector(selectors.selectDefaultValues);
    const { matrxRecordId, record: activeRecord } = useAppSelector(
        selectors.selectActiveRecordWithId
    );

    // Initialize form with active record data
    useEffect(() => {
        if (activeRecord && matrxRecordId) {
            // Iterate through form fields and update with active record data
            formFields.forEach(field => {
                const fieldName = field.name;
                const recordValue = activeRecord[fieldName];

                if (recordValue !== undefined) {
                    dispatch(updateFormField({
                        name: fieldName,
                        value: recordValue
                    }));
                }
            });
        }
    }, [matrxRecordId, activeRecord, dispatch, formFields]);

    const handleUpdateField = (name: string, value: any) => {
        dispatch(updateFormField({ name, value }));
    };

    return {
        formFields,
        defaultValues,
        activeRecord,
        matrxRecordId,
        handleUpdateField,
    };
};
