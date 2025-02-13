import { EntityKeys, MatrxRecordId } from '@/types';
import useStartCreateRecord from './useStartCreateRecord';
import { useUpdateFields } from './useUpdateFields';
import { useCreateRecord } from './useCreateRecord';

export type FieldValue = string | number | boolean | null | Record<string, unknown> | unknown;
type FieldUpdates = Record<string, FieldValue>;

export interface UseUnsavedRecordOptions<T = any> {
    entityKey: EntityKeys;
}

export interface UseUnsavedRecordResult<T> {
    // Start methods
    start: () => MatrxRecordId;
    startWithData: (initialData: Partial<T>) => MatrxRecordId;
    
    // Update methods
    updateField: (recordId: MatrxRecordId, fieldName: string, value: FieldValue) => void;
    updateFields: (recordId: MatrxRecordId, updates: FieldUpdates) => void;
    
    // Create method
    create: (recordId: MatrxRecordId) => void;
}

export const useUnsavedRecord = <T extends Record<string, any>>({ 
    entityKey 
}: UseUnsavedRecordOptions<T>) => {
    const { create: start, createWithData: startWithData } = useStartCreateRecord<T>({ entityKey });
    const { updateField, updateFields } = useUpdateFields(entityKey);
    const { createRecord: create } = useCreateRecord(entityKey);

    return {
        // Start methods
        start,
        startWithData,
        
        // Update methods
        updateField,
        updateFields,
        
        // Create method
        create,
    };
};

export default useUnsavedRecord;

