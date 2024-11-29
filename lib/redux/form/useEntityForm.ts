// lib/redux/form/useEntityForm.ts
import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { EntityKeys } from '@/types/entityTypes';
import {
    initializeForm,
    updateFormField,
    validateForm,
    resetForm,
    clearForm
} from './slice';

export const useEntityFormOld = (
    formId: string,
    entityKey?: EntityKeys,
    entityType?: string,
    options?: {
        mode?: 'create' | 'update' | 'standalone';
        initialValues?: Record<string, any>;
        metadata?: Record<string, any>;
        validation?: (values: Record<string, any>) => Record<string, string>;
    }
) => {
    const dispatch = useAppDispatch();
    const form = useAppSelector(state => state.form.forms[formId]);

    useEffect(() => {
        dispatch(initializeForm({
            formId,
            entityKey,
            mode: options?.mode || 'standalone',
            initialValues: options?.initialValues,
            metadata: options?.metadata
        }));

        return () => {
            dispatch(clearForm({ formId }));
        };
    }, [formId, entityKey]);

    const setFieldValue = useCallback((field: string, value: any) => {
        dispatch(updateFormField({ formId, field, value }));
    }, [formId]);

    const validateFields = useCallback(() => {
        if (options?.validation) {
            const errors = options.validation(form?.values || {});
            dispatch(validateForm({ formId, errors }));
            return Object.keys(errors).length === 0;
        }
        return true;
    }, [formId, form?.values, options?.validation]);

    const handleSubmit = useCallback(async () => {
        if (validateFields()) {
            dispatch({ type: 'form/submitForm', payload: { formId } });
        }
    }, [formId, validateFields]);


    return {
        values: form?.values || {},
        errors: form?.errors || {},
        touched: form?.touched || {},
        isDirty: form?.isDirty || false,
        isSubmitting: form?.isSubmitting || false,
        isValid: form?.isValid || true,
        setFieldValue,
        validateFields,
        handleSubmit,
        resetForm: () => dispatch(resetForm({ formId })),
        clearForm: () => dispatch(clearForm({ formId }))
    };
};
