import * as React from 'react';
import { useForm, UseFormReturn, Path, PathValue } from 'react-hook-form';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import {getEntitySlice} from '@/lib/redux/entity/entitySlice';

import {
    EntityStateField,
    LoadingState,
    MatrxRecordId,
    EntityError,
    EntityOperations
} from '@/lib/redux/entity/types/stateTypes';
import { Callback, callbackManager } from "@/utils/callbackManager";
import { toast } from '@/components/ui';
import { useEntityValidation } from "@/lib/redux/entity/hooks/useValidation";

type FormMode = 'view' | 'edit' | 'create';

interface UseEntityFormOptions {
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
    parentEntityKey?: EntityKeys;
    parentForm?: UseFormReturn<Record<string, any>>;
}

interface UseEntityFormOptions {
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
    onError?: (error: EntityError) => void;
    onSuccess?: (message: string) => void;
    parentEntityKey?: EntityKeys;
    parentForm?: UseFormReturn<Record<string, any>>;

}

export interface UseEntityFormState<TEntity extends EntityKeys> {
    // State
    viewMode: FormMode;
    form: UseFormReturn<Record<string, any>>;
    validationErrors: Record<string, string>;
    loadingState: LoadingState;
    lastOperation?: EntityOperations;

    // Metadata
    entityKey: TEntity;
    entityDisplayName: string;
    fieldInfo: EntityStateField[];
    activeRecord: EntityData<TEntity> | null;
    matrxRecordId: MatrxRecordId | null;
    defaultValues: Partial<EntityData<TEntity>>;

    // Loading States
    hasError: boolean;
    errorState: EntityError | null;
    isInitialized: boolean;
    isLoading: boolean;
    isSubmitting: boolean;
    hasErrorsInternal: boolean;

    // Parent Relationship
    parentEntityKey?: EntityKeys;
    parentForm?: UseFormReturn<Record<string, any>>;

    // Actions
    handleNew: () => void;
    handleEdit: () => void;
    handleCancel: () => void;
    handleSave: () => Promise<void>;
    handleDelete: () => void;
    handleFieldChange: (fieldName: string, newValue: any) => Promise<void>;

    // Record Operations
    createRecord: (data: Partial<EntityData<TEntity>>, callbacks?: Callback) => void;
    updateRecord: (matrxRecordId: MatrxRecordId, data: Partial<EntityData<TEntity>>, callbacks?: Callback) => void;
    deleteRecord: (matrxRecordId: MatrxRecordId, callbacks?: Callback) => void;

    // Utilities
    isFieldReadOnly: (fieldName: string) => boolean;
    getFieldValue: (fieldName: string) => any;
    getDisplayValue: (record: EntityData<TEntity>) => string;

    // Feature flags
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}


export function useEntityForm<TEntity extends EntityKeys>(
    entityKey: TEntity,
    options: UseEntityFormOptions = {}
): UseEntityFormState<TEntity> {
    // Redux setup
    const dispatch = useAppDispatch();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);

    // Local state
    const [viewMode, setViewMode] = React.useState<FormMode>('view');

    // Selectors
    const entityDisplayName = useAppSelector(selectors.selectEntityDisplayName);
    const displayField = useAppSelector(selectors.selectDisplayField);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const defaultValues = useAppSelector(selectors.selectDefaultValues);
    const { matrxRecordId, record: activeRecord } = useAppSelector(selectors.selectActiveRecordWithId);
    const loadingState = useAppSelector(selectors.selectLoadingState);

    // Form setup - using Record<string, any> to avoid complex typing issues
    const form = useForm<Record<string, any>>({
        defaultValues: React.useMemo(() => {
            return {
                ...defaultValues,
                ...activeRecord
            } as Record<string, any>;
        }, [defaultValues, activeRecord])
    });

    // Loading states
    const isInitialized = loadingState?.initialized ?? false;
    const isLoading = loadingState?.loading ?? false;
    const errorState = loadingState?.error ?? null;
    const hasError = !!errorState;
    const lastOperation = loadingState?.lastOperation;

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [hasErrorsInternal, setHasErrorsInternal] = React.useState(false);

    // Sync form with record changes
    React.useEffect(() => {
        if (activeRecord && viewMode === 'view') {
            form.reset(activeRecord as Record<MatrxRecordId, any>);
        }
    }, [activeRecord, form, viewMode]);

    // Validation integration
    const validation = useEntityValidation(entityKey);
    const { validationErrors, validateField, validateForm, clearValidationErrors } = validation;

    // Action handlers
    const handleNew = React.useCallback(() => {
        setViewMode('create');
        form.reset(defaultValues);
        clearValidationErrors();
    }, [defaultValues, form, clearValidationErrors]);

    const handleEdit = React.useCallback(() => {
        if (activeRecord) {
            setViewMode('edit');
            form.reset(activeRecord);
            clearValidationErrors();
        }
    }, [activeRecord, form, clearValidationErrors]);

    const handleCancel = React.useCallback(() => {
        setViewMode('view');
        form.reset(activeRecord ?? {});
        clearValidationErrors();
    }, [form, activeRecord, clearValidationErrors]);

    const handleFieldChange = React.useCallback(async (fieldName: string, newValue: any) => {
        if (viewMode === 'view') return;

        await validateField(fieldName, newValue);
        form.setValue(fieldName as Path<Record<string, any>>, newValue);
    }, [viewMode, validateField, form]);

    const handleSave = React.useCallback(async () => {
        setIsSubmitting(true);
        setHasErrorsInternal(false);

        try {
            const values = form.getValues();
            const isValid = await validateForm(values);

            if (!isValid) {
                setHasErrorsInternal(true);
                options.onError?.({
                    message: 'Please check the form for errors',
                    code: 400,
                });
                return;
            }

            const callback: Callback = (result) => {
                if (result.success) {
                    options.onSuccess?.(
                        `Record ${viewMode === 'create' ? 'created' : 'updated'} successfully`
                    );
                    setViewMode('view');
                    clearValidationErrors();
                } else {
                    setHasErrorsInternal(true);
                    options.onError?.(result.error || {
                        message: 'An error occurred',
                        code: 500,
                    });
                }
            };

            if (viewMode === 'create') {
                dispatch(actions.createRecord({
                    data: values,
                    callbackId: callbackManager.register(callback)
                }));
            } else if (viewMode === 'edit' && matrxRecordId) {
                dispatch(actions.updateRecord({
                    matrxRecordId,
                    data: values,
                    callbackId: callbackManager.register(callback)
                }));
            }
        } catch (error) {
            setHasErrorsInternal(true);
            options.onError?.({
                message: error.message || 'An unexpected error occurred',
                code: 500,
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [viewMode, form, validateForm, dispatch, actions, matrxRecordId, options]);

    const handleDelete = React.useCallback(() => {
        if (!matrxRecordId) return;

        const callback: Callback = (result) => {
            if (result.success) {
                toast({
                    title: 'Deleted',
                    description: 'Record deleted successfully',
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.error?.message || 'An error occurred',
                    variant: 'destructive',
                });
            }
        };

        dispatch(actions.deleteRecord({
            matrxRecordId,
            callbackId: callbackManager.register(callback)
        }));
    }, [matrxRecordId, dispatch, actions]);

    // Utility functions
    const isFieldReadOnly = React.useCallback((fieldName: string) => {
        const field = fieldInfo.find(f => f.name === fieldName);
        return viewMode === 'view' || (field?.isPrimaryKey ?? false);
    }, [viewMode, fieldInfo]);

    const getFieldValue = React.useCallback((fieldName: string) => {
        return form.getValues(fieldName as Path<Record<string, any>>) ?? '';
    }, [form]);

    const createRecord = React.useCallback((data: Partial<EntityData<TEntity>>, callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;
        dispatch(actions.createRecord({ data, callbackId }));
    }, [actions, dispatch]);

    const updateRecord = React.useCallback((matrxRecordId: MatrxRecordId, data: Partial<EntityData<TEntity>>, callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;
        dispatch(actions.updateRecord({ matrxRecordId, data, callbackId }));
    }, [actions, dispatch]);

    const deleteRecord = React.useCallback((matrxRecordId: MatrxRecordId, callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;
        dispatch(actions.deleteRecord({ matrxRecordId, callbackId }));
    }, [actions, dispatch]);

    return {
        // State
        viewMode,
        form,
        validationErrors,
        loadingState,
        lastOperation,

        // Loading metadata
        hasError,
        errorState,
        isInitialized,
        isLoading,
        isSubmitting,
        hasErrorsInternal,
        // Metadata
        entityKey, // Added entityKey
        entityDisplayName,
        fieldInfo,
        activeRecord,
        matrxRecordId: matrxRecordId,
        defaultValues,

        // Parent relationship
        parentEntityKey: options.parentEntityKey,
        parentForm: options.parentForm,

        // Actions
        handleNew,
        handleEdit,
        handleCancel,
        handleSave,
        handleDelete,
        handleFieldChange,
        createRecord,
        updateRecord,
        deleteRecord,

        // Utilities
        isFieldReadOnly,
        getFieldValue,
        getDisplayValue: (record) => record[displayField] || 'Unnamed Record',

        // Feature flags
        canCreate: options.allowCreate ?? true,
        canEdit: options.allowEdit ?? true,
        canDelete: options.allowDelete ?? true,
    };
}
