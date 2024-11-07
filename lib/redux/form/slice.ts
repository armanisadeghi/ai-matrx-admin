// lib/redux/form/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FormState } from './types';
import { EntityKeys, EntityData } from "@/types/entityTypes";

const initialState: FormState = {
    forms: {},
    activeForm: null
};

const formSlice = createSlice({
    name: 'form',
    initialState,
    reducers: {
        initializeForm: (
            state,
            action: PayloadAction<{
                formId: string;
                entityKey?: EntityKeys;
                mode?: 'create' | 'update' | 'standalone';
                initialValues?: Record<string, any>;
                metadata?: Record<string, any>;
            }>
        ) => {
            const { formId, entityKey, mode = 'standalone', initialValues = {}, metadata = {} } = action.payload;
            state.forms[formId] = {
                entityKey,
                mode,
                values: initialValues,
                originalValues: initialValues,
                errors: {},
                touched: {},
                isDirty: false,
                isSubmitting: false,
                isValid: true,
                metadata
            };
            state.activeForm = formId;
        },

        updateFormField: (
            state,
            action: PayloadAction<{
                formId: string;
                field: string;
                value: any;
                touch?: boolean;
            }>
        ) => {
            const { formId, field, value, touch = true } = action.payload;
            const form = state.forms[formId];
            if (form) {
                form.values[field] = value;
                if (touch) form.touched[field] = true;
                form.isDirty = true;
            }
        },

        validateForm: (
            state,
            action: PayloadAction<{
                formId: string;
                errors: Record<string, string>;
            }>
        ) => {
            const { formId, errors } = action.payload;
            const form = state.forms[formId];
            if (form) {
                form.errors = errors;
                form.isValid = Object.keys(errors).length === 0;
            }
        },

        submitFormStart: (
            state,
            action: PayloadAction<{
                formId: string;
            }>
        ) => {
            const { formId } = action.payload;
            const form = state.forms[formId];
            if (form) {
                form.isSubmitting = true;
            }
        },

        submitFormSuccess: (
            state,
            action: PayloadAction<{
                formId: string;
                result?: any;
            }>
        ) => {
            const { formId } = action.payload;
            const form = state.forms[formId];
            if (form) {
                form.isSubmitting = false;
                form.isDirty = false;
                form.originalValues = { ...form.values };
            }
        },

        submitFormError: (
            state,
            action: PayloadAction<{
                formId: string;
                errors: Record<string, string>;
            }>
        ) => {
            const { formId, errors } = action.payload;
            const form = state.forms[formId];
            if (form) {
                form.isSubmitting = false;
                form.errors = errors;
                form.isValid = false;
            }
        },

        resetForm: (
            state,
            action: PayloadAction<{
                formId: string;
            }>
        ) => {
            const { formId } = action.payload;
            const form = state.forms[formId];
            if (form) {
                form.values = { ...form.originalValues };
                form.errors = {};
                form.touched = {};
                form.isDirty = false;
                form.isSubmitting = false;
                form.isValid = true;
            }
        },

        clearForm: (
            state,
            action: PayloadAction<{
                formId: string;
            }>
        ) => {
            const { formId } = action.payload;
            delete state.forms[formId];
            if (state.activeForm === formId) {
                state.activeForm = null;
            }
        }
    }
});

export const {
    initializeForm,
    updateFormField,
    validateForm,
    submitFormStart,
    submitFormSuccess,
    submitFormError,
    resetForm,
    clearForm
} = formSlice.actions;

export default formSlice.reducer;
