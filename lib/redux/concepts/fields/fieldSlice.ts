// fieldSlice.ts
import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createFieldId } from './fieldUtils';
import {AllEntityFieldKeys, EntityKeys} from "@/types/entityTypes";
import {EntityOperationMode, MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";


// todo: remove this duplicate
export interface FieldState {
    id: string;
    entityKey: EntityKeys;
    fieldName: AllEntityFieldKeys;
    recordId: MatrxRecordId | 'new';
    value: any;
    isDirty: boolean;
    originalValue: any;
    mode: EntityOperationMode;
    isValid: boolean;
    validationErrors?: string[];
}

export interface FormState {
    entityKey: EntityKeys;
    recordId: MatrxRecordId | 'new';
    mode: EntityOperationMode;
    isDirty: boolean;
    isValid: boolean;
    isSubmitting: boolean;
}


export interface FieldIdentifier {
    entityKey: EntityKeys;
    fieldName: AllEntityFieldKeys;
    recordId: MatrxRecordId | 'new';
}

export const fieldAdapter = createEntityAdapter<FieldState>();

const initialState = fieldAdapter.getInitialState();

const fieldSlice = createSlice({
    name: 'entityFields',
    initialState,
    reducers: {
        initializeField: (state, action: PayloadAction<{
            identifier: FieldIdentifier,
            initialValue: any,
            mode: EntityOperationMode
        }>) => {
            const { identifier, initialValue, mode } = action.payload;
            const id = createFieldId(identifier);

            fieldAdapter.addOne(state, {
                id,
                ...identifier,
                value: initialValue,
                originalValue: initialValue,
                isDirty: false,
                mode,
                isValid: true,
                validationErrors: []
            });
        },

        updateFieldValue: (state, action: PayloadAction<{
            identifier: FieldIdentifier,
            value: any
        }>) => {
            const { identifier, value } = action.payload;
            const id = createFieldId(identifier);

            fieldAdapter.updateOne(state, {
                id,
                changes: {
                    value,
                    isDirty: true
                }
            });
        },

        setFormMode: (state, action: PayloadAction<{
            entityKey: EntityKeys,
            recordId: MatrxRecordId | 'new',
            mode: EntityOperationMode
        }>) => {
            const { entityKey, recordId, mode } = action.payload;
            const formFields = Object.values(state.entities)
                .filter(field => field?.entityKey === entityKey && field.recordId === recordId);

            formFields.forEach(field => {
                if (field) {
                    fieldAdapter.updateOne(state, {
                        id: field.id,
                        changes: { mode }
                    });
                }
            });
        },

        setFieldValidation: (state, action: PayloadAction<{
            identifier: FieldIdentifier,
            isValid: boolean,
            errors?: string[]
        }>) => {
            const { identifier, isValid, errors } = action.payload;
            const id = createFieldId(identifier);

            fieldAdapter.updateOne(state, {
                id,
                changes: {
                    isValid,
                    validationErrors: errors || []
                }
            });
        },

        resetField: (state, action: PayloadAction<FieldIdentifier>) => {
            const id = createFieldId(action.payload);
            const field = state.entities[id];
            if (field) {
                fieldAdapter.updateOne(state, {
                    id,
                    changes: {
                        value: field.originalValue,
                        isDirty: false,
                        isValid: true,
                        validationErrors: []
                    }
                });
            }
        },

        clearFields: (state, action: PayloadAction<{
            entityKey: EntityKeys,
            recordId: MatrxRecordId | 'new'
        }>) => {
            const { entityKey, recordId } = action.payload;
            const fieldsToRemove = Object.values(state.entities)
                .filter(field => field &&
                    field.entityKey === entityKey &&
                    field.recordId === recordId
                )
                .map(field => field!.id);

            fieldAdapter.removeMany(state, fieldsToRemove);
        }
    }
});

export const {
    initializeField,
    updateFieldValue,
    setFormMode,
    setFieldValidation,
    resetField,
    clearFields
} = fieldSlice.actions;

export const fieldReducer = fieldSlice.reducer;
