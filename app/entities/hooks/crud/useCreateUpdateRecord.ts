import { EntityKeys, MatrxRecordId, EntityData } from "@/types";
import { useMemo, useState } from "react";
import { useUpdateRecordFields } from "../unsaved-records/useUpdateFields";
import { useCreateRecord } from "../unsaved-records/useCreateRecord";
import useStartCreate from "./useStartCreate";
import { createEntitySelectors, useAppSelector } from "@/lib/redux";
import { getEntityDefaultValues } from "@/lib/redux/entity/utils/direct-schema";

export type FieldValue = string | number | boolean | null | Record<string, unknown> | unknown;
export type FieldUpdates = Record<string, FieldValue>;

interface UseCreateUpdateRecordProps {
    entityKey: EntityKeys;
}

export const useCreateUpdateRecord = ({ entityKey }: UseCreateUpdateRecordProps) => {
    const [currentRecordId, setCurrentRecordId] = useState<MatrxRecordId | null>(null);
    const selectors = createEntitySelectors(entityKey);

    const { create: startCreate } = useStartCreate({ entityKey });
    const { updateField, updateFields } = useUpdateRecordFields(entityKey, currentRecordId);
    const { createRecord } = useCreateRecord(entityKey);

    const recordDataWithDefaults = useAppSelector((state) => selectors.selectEffectiveRecordOrDefaults(state, currentRecordId)) as EntityData<EntityKeys>;
    const recordDataWithoutDefaults = useAppSelector((state) => selectors.selectEffectiveRecordById(state, currentRecordId)) as EntityData<EntityKeys>;
    const fieldDefaults = useMemo(() => getEntityDefaultValues(entityKey), [entityKey]);

    const start = (initialData?: FieldUpdates) => {
        const newId = startCreate(initialData);
        if (!newId) {
            return null;
        }
        setCurrentRecordId(newId);

        return newId;
    };

    const save = () => {
        if (!currentRecordId) return;
        createRecord(currentRecordId);
    };

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
