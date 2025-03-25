import { EntityKeys, MatrxRecordId, EntityData } from "@/types";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useUpdateRecordFields } from "../unsaved-records/useUpdateFields";
import { useCreateRecord } from "../unsaved-records/useCreateRecord";
import useStartCreate from "./useStartCreate";
import { createEntitySelectors, getPermanentId, useAppSelector } from "@/lib/redux";
import { getEntityDefaultValues } from "@/lib/redux/entity/utils/direct-schema";
import { callbackManager } from "@/utils/callbackManager";

export type FieldValue = string | number | boolean | null | Record<string, unknown> | unknown;
export type FieldUpdates = Record<string, FieldValue>;

export interface SaveCallbackResult {
    success: boolean;
    entityName?: string;
    result?: {
        tempRecordId: string;
        recordKey: string;
        data: any;
    };
    requestData?: any;
    originalPayload?: any;
    error?: Error;
}

interface UseCreateUpdateRecordProps {
    entityKey: EntityKeys;
    returnCallbackId?: boolean;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
}

export interface UseCreateUpdateRecordResult {
    start: (initialData?: FieldUpdates, idField?: string) => MatrxRecordId | null;
    updateField: (fieldName: string, value: FieldValue) => void;
    updateFields: (updates: FieldUpdates) => void;
    save: () => Promise<void>;
    saveAsync: () => Promise<SaveCallbackResult>; // New async method with full result
    saveWithConfirmation: () => Promise<boolean>; // New async method with boolean confirmation
    currentRecordId: MatrxRecordId | null;
    recordDataWithDefaults: EntityData<EntityKeys>;
    recordDataWithoutDefaults: EntityData<EntityKeys>;
    fieldDefaults: Record<string, unknown>;
    callbackId?: string | null; // Optional property, only defined when returnCallbackId is true
}

export const useCreateUpdateRecord = ({ entityKey, returnCallbackId = false, showSuccessToast = true, showErrorToast = true }: UseCreateUpdateRecordProps): UseCreateUpdateRecordResult => {
    const [currentRecordId, setCurrentRecordId] = useState<MatrxRecordId | null>(null);
    const [idField, setIdField] = useState<string | null>(null);
    const [idValue, setIdValue] = useState<string | null>(null);

    const selectors = createEntitySelectors(entityKey);
    const { create: startCreate } = useStartCreate({ entityKey });
    const { updateField: originalUpdateField, updateFields: originalUpdateFields } = useUpdateRecordFields(entityKey, currentRecordId);

    // Pass the returnCallbackId option to useCreateRecord when requested
    const createRecordResult = useCreateRecord(entityKey, { returnCallbackId, showSuccessToast, showErrorToast });

    // Extract methods and properties from createRecordResult
    const createRecord = createRecordResult.createRecord;
    const createRecordWithCallbackId = createRecordResult.createRecordWithCallbackId;
    const callbackId = "callbackId" in createRecordResult ? createRecordResult.callbackId : null;

    const recordDataWithDefaults = useAppSelector((state) =>
        selectors.selectEffectiveRecordOrDefaults(state, currentRecordId)
    ) as EntityData<EntityKeys>;

    const recordDataWithoutDefaults = useAppSelector((state) =>
        selectors.selectEffectiveRecordById(state, currentRecordId)
    ) as EntityData<EntityKeys>;

    const fieldDefaults = useMemo(() => getEntityDefaultValues(entityKey), [entityKey]);

    const updateField = useCallback(
        (fieldName: string, value: FieldValue) => {
            if (!currentRecordId) {
                console.warn("Attempted to update field without a current record ID", fieldName, value);
                return;
            }
            return originalUpdateField(fieldName, value);
        },
        [currentRecordId, originalUpdateField]
    );

    const updateFields = useCallback(
        (updates: FieldUpdates) => {
            if (!currentRecordId) {
                console.warn("Attempted to update fields without a current record ID", updates);
                return;
            }
            return originalUpdateFields(updates);
        },
        [currentRecordId, originalUpdateFields]
    );

    const start = useCallback(
        (initialData?: FieldUpdates, idField?: string) => {
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
        },
        [startCreate]
    );

    useEffect(() => {
        if (idField && idValue && currentRecordId) {
            updateField(idField, idValue);
        }
    }, [idField, idValue, currentRecordId, updateField]);

    const save = useCallback(() => {
        if (!currentRecordId) {
            console.warn("Attempted to save without a current record ID");
            return Promise.reject(new Error("No current record ID"));
        }
        return createRecord(currentRecordId);
    }, [currentRecordId, createRecord]);

    const saveAsync = useCallback((): Promise<SaveCallbackResult> => {
        if (!currentRecordId) {
            console.warn("Attempted to saveAsync without a current record ID");
            return Promise.reject(new Error("No current record ID"));
        }

        return new Promise<SaveCallbackResult>(async (resolve) => {
            const newCallbackId = await createRecordWithCallbackId(currentRecordId);

            callbackManager.subscribe(newCallbackId, (result: SaveCallbackResult) => {
                resolve(result);
            });
        });
    }, [currentRecordId, createRecordWithCallbackId]);

    const saveWithConfirmation = useCallback(async (): Promise<boolean> => {
        const result = await saveAsync();
        return result.success;
    }, [saveAsync]);

    const result: UseCreateUpdateRecordResult = {
        start,
        updateField,
        updateFields,
        save,
        saveAsync,
        saveWithConfirmation,
        currentRecordId,
        recordDataWithDefaults,
        recordDataWithoutDefaults,
        fieldDefaults,
    };

    // Only add callbackId if returnCallbackId was requested
    if (returnCallbackId) {
        result.callbackId = callbackId;
    }

    return result;
};

export default useCreateUpdateRecord;
