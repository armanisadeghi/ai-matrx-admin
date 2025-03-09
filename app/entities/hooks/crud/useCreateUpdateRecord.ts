import { EntityKeys, MatrxRecordId, EntityData } from "@/types";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useUpdateRecordFields } from "../unsaved-records/useUpdateFields";
import { useCreateRecord } from "../unsaved-records/useCreateRecord";
import useStartCreate from "./useStartCreate";
import { createEntitySelectors, getPermanentId, useAppSelector } from "@/lib/redux";
import { getEntityDefaultValues } from "@/lib/redux/entity/utils/direct-schema";

export type FieldValue = string | number | boolean | null | Record<string, unknown> | unknown;
export type FieldUpdates = Record<string, FieldValue>;

interface UseCreateUpdateRecordProps {
    entityKey: EntityKeys;
}

export const useCreateUpdateRecord = ({ entityKey }: UseCreateUpdateRecordProps) => {
    const [currentRecordId, setCurrentRecordId] = useState<MatrxRecordId | null>(null);
    const [idField, setIdField] = useState<string | null>(null);
    const [idValue, setIdValue] = useState<string | null>(null);
    const selectors = createEntitySelectors(entityKey);

    const { create: startCreate } = useStartCreate({ entityKey });
    const { updateField: originalUpdateField, updateFields: originalUpdateFields } = useUpdateRecordFields(entityKey, currentRecordId);
    const { createRecord } = useCreateRecord(entityKey);

    const recordDataWithDefaults = useAppSelector((state) => selectors.selectEffectiveRecordOrDefaults(state, currentRecordId)) as EntityData<EntityKeys>;
    const recordDataWithoutDefaults = useAppSelector((state) => selectors.selectEffectiveRecordById(state, currentRecordId)) as EntityData<EntityKeys>;
    const fieldDefaults = useMemo(() => getEntityDefaultValues(entityKey), [entityKey]);

    const updateField = useCallback((fieldName: string, value: FieldValue) => {
        if (!currentRecordId) {
            console.warn("Attempted to update field without a current record ID");
            return;
        }


        return originalUpdateField(fieldName, value);
    }, [currentRecordId, originalUpdateField]);

    const updateFields = useCallback((updates: FieldUpdates) => {
        if (!currentRecordId) {
            console.warn("Attempted to update fields without a current record ID");
            return;
        }
        return originalUpdateFields(updates);
    }, [currentRecordId, originalUpdateFields]);

    const start = useCallback((initialData?: FieldUpdates, idField?: string) => {
        const newId = startCreate(initialData);
        if (!newId) {
            console.log("no newId");
            return null;
        }
        setCurrentRecordId(newId);

        if (idField) {
            setIdField(idField);
            const permanentId = getPermanentId(newId);
            setIdValue(permanentId);
        }
        return newId;
    }, [startCreate, updateField, useUpdateRecordFields]);

    useEffect(() => {
        if (idField && idValue && currentRecordId) {
            console.log("updating idField", idField, idValue);
            updateField(idField, idValue);
        }
    }, [idValue]);



    const save = useCallback(() => {
        if (!currentRecordId) {
            console.warn("Attempted to save without a current record ID");
            return;
        }
        createRecord(currentRecordId);
    }, [currentRecordId, createRecord]);

    return {
        start,
        updateField,
        updateFields,
        save,
        currentRecordId,
        recordDataWithDefaults,
        recordDataWithoutDefaults,
        fieldDefaults,
    };
};

export default useCreateUpdateRecord;