import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { useState, useCallback, useEffect, useRef } from 'react';
import useStartCreateRecord from './useStartCreateRecord';
import { useUpdateFields } from './useUpdateFields';
import { useCreateRecord } from './useCreateRecord';
import { useSelector } from 'react-redux';
import { useEntityTools } from '@/lib/redux';

export type FieldValue = string | number | boolean | null | Record<string, unknown> | unknown;
type FieldUpdates = Record<string, FieldValue>;

export interface UseUnsavedRecordOptions<T = any> {
    entityKey: EntityKeys;
    initialData?: Partial<T>;
}


export interface UseUnsavedRecordResult<T> {
    recordId: MatrxRecordId | null;
    recordData: T | null;
    start: () => MatrxRecordId;
    startWithData: (initialData: Partial<T>) => MatrxRecordId;
    updateField: (fieldName: string, value: FieldValue) => void;
    updateFields: (updates: FieldUpdates) => void;
    create: () => void;
    reset: () => void;
}

export const useUnsavedRecord = <T extends Record<string, any>>({ 
    entityKey,
    initialData
}: UseUnsavedRecordOptions<T>): UseUnsavedRecordResult<T> => {
    const [currentRecordId, setCurrentRecordId] = useState<MatrxRecordId | null>(null);
    const isInitializedRef = useRef(false);
    
    const { create: startCreate, createWithData: startWithData } = useStartCreateRecord<T>({ entityKey });
    const { updateField: baseUpdateField, updateFields: baseUpdateFields } = useUpdateFields(entityKey);
    const { createRecord: baseCreate } = useCreateRecord(entityKey);
    const { selectors } = useEntityTools(entityKey);
    
    // Handle initialization with initial data
    useEffect(() => {
        if (!isInitializedRef.current && initialData && !currentRecordId) {
            const newId = startWithData(initialData);
            setCurrentRecordId(newId);
            isInitializedRef.current = true;
        }
    }, [initialData, startWithData]);
    
    const recordData = useSelector(state => 
        currentRecordId ? selectors.selectEffectiveRecordOrDefaults(state, currentRecordId) : null
    );
    
    const start = useCallback(() => {
        if (currentRecordId) return currentRecordId;
        const newId = startCreate();
        setCurrentRecordId(newId);
        return newId;
    }, [startCreate, currentRecordId]);
    
    const startWithDataEnhanced = useCallback((data: Partial<T>) => {
        if (currentRecordId) return currentRecordId;
        const newId = startWithData(data);
        setCurrentRecordId(newId);
        return newId;
    }, [startWithData, currentRecordId]);
    
    const updateField = useCallback((fieldName: string, value: FieldValue) => {
        if (!currentRecordId) return;
        baseUpdateField(currentRecordId, fieldName, value);
    }, [currentRecordId, baseUpdateField]);
    
    const updateFields = useCallback((updates: FieldUpdates) => {
        if (!currentRecordId) return;
        baseUpdateFields(currentRecordId, updates);
    }, [currentRecordId, baseUpdateFields]);
    
    const create = useCallback(() => {
        if (!currentRecordId) return;
        baseCreate(currentRecordId);
        setCurrentRecordId(null);
        isInitializedRef.current = false;
    }, [currentRecordId, baseCreate]);
    
    const reset = useCallback(() => {
        setCurrentRecordId(null);
        isInitializedRef.current = false;
    }, []);
    
    return {
        recordId: currentRecordId,
        recordData,
        start,
        startWithData: startWithDataEnhanced,
        updateField,
        updateFields,
        create,
        reset
    };
};

export default useUnsavedRecord;