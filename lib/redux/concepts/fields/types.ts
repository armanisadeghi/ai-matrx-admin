// types.ts
import {AllEntityFieldKeys, EntityKeys} from "@/types/entityTypes";
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";

export interface FieldState {
    id: string;
    entityKey: EntityKeys;
    fieldName: AllEntityFieldKeys;
    recordId: MatrxRecordId | 'new';
    value: any;
    isDirty: boolean;
    originalValue: any;
    mode: FormMode;
    isValid: boolean;
    validationErrors?: string[];
}

export interface FormState {
    entityKey: EntityKeys;
    recordId: MatrxRecordId | 'new';
    mode: FormMode;
    isDirty: boolean;
    isValid: boolean;
    isSubmitting: boolean;
}

export type FormMode = 'display' | 'create' | 'edit' | 'view';

export interface FieldIdentifier {
    entityKey: EntityKeys;
    fieldName: AllEntityFieldKeys;
    recordId: MatrxRecordId | 'new';
}

