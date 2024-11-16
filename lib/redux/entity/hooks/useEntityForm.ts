import * as React from 'react';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {useAppDispatch, useAppSelector, useAppStore} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {createEntitySlice} from '@/lib/redux/entity/slice';
import {MatrxRecordId} from '@/lib/redux/entity/types';
import {Callback, callbackManager} from "@/utils/callbackManager";
import {toast} from '@/components/ui';
import {useEntityValidation} from "@/lib/redux/entity/hooks/useValidation";
import {EntityOperations, LoadingState, EntityError} from '@/lib/redux/entity/types';
import { UseEntityFormState } from '@/app/(authenticated)/tests/crud-operations/components/EntityFormGroup';

type FormMode = 'view' | 'edit' | 'create';
interface UseEntityFormOptions {
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
}


interface UseEntityFormReturn<TEntity extends EntityKeys> {
    // State
    viewMode: FormMode;
    formData: Partial<EntityData<TEntity>>;
    validationErrors: Record<string, string>;
    isLoading: boolean;
    hasError: boolean;
    errorMessage?: string;
    lastOperation?: EntityOperations;

    // Metadata
    entityDisplayName: string;
    fieldInfo: any[];
    activeRecord: EntityData<TEntity> | null;
    matrxRecordId: MatrxRecordId | null;
    defaultValues: Partial<EntityData<TEntity>>;

    // Actions
    handleNew: () => void;
    handleEdit: () => void;
    handleCancel: () => void;
    handleSave: () => Promise<void>;
    handleDelete: () => void;
    handleFieldChange: (fieldName: string, newValue: any) => Promise<void>;

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
    const store = useAppStore();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => createEntitySlice(entityKey, {} as any), [entityKey]);

    // Local state
    const [viewMode, setViewMode] = React.useState<FormMode>('view');
    const [formData, setFormData] = React.useState<Partial<EntityData<TEntity>>>({});

    // Selectors
    const entityDisplayName = useAppSelector(selectors.selectEntityDisplayName);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const errorState = useAppSelector(selectors.selectErrorState);
    const displayField = useAppSelector(selectors.selectDisplayField);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const defaultValues = useAppSelector(selectors.selectDefaultValues);
    const { matrxRecordId, record: activeRecord } = useAppSelector(selectors.selectActiveRecordWithId);

    // Validation integration
    const validation = useEntityValidation(entityKey);
    const { validationErrors, validateField, validateForm, clearValidationErrors } = validation;

    // Action handlers
    const handleNew = React.useCallback(() => {
        setViewMode('create');
        setFormData(defaultValues);
        clearValidationErrors();
    }, [defaultValues, clearValidationErrors]);

    const handleEdit = React.useCallback(() => {
        if (activeRecord) {
            setViewMode('edit');
            setFormData(activeRecord);
            clearValidationErrors();
        }
    }, [activeRecord, clearValidationErrors]);

    const handleCancel = React.useCallback(() => {
        setViewMode('view');
        setFormData({});
        clearValidationErrors();
    }, [clearValidationErrors]);

    const handleFieldChange = React.useCallback(async (fieldName: string, newValue: any) => {
        if (viewMode === 'view') return;

        await validateField(fieldName, newValue);
        setFormData(prev => ({
            ...prev,
            [fieldName]: newValue
        }));
    }, [viewMode, validateField]);

    const handleSave = React.useCallback(async () => {
        const isValid = await validateForm(formData);
        if (!isValid) {
            toast({
                title: 'Validation Error',
                description: 'Please check the form for errors',
                variant: 'destructive',
            });
            return;
        }

        const callback: Callback = (result) => {
            if (result.success) {
                toast({
                    title: viewMode === 'create' ? 'Created' : 'Updated',
                    description: `Record ${viewMode === 'create' ? 'created' : 'updated'} successfully`,
                    variant: 'success',
                });
                setViewMode('view');
                setFormData({});
                clearValidationErrors();
            } else {
                toast({
                    title: 'Error',
                    description: result.error?.message || 'An error occurred',
                    variant: 'destructive',
                });
            }
        };

        if (viewMode === 'create') {
            dispatch(actions.createRecord({ data: formData, callbackId: callbackManager.register(callback) }));
        } else if (viewMode === 'edit' && matrxRecordId) {
            dispatch(actions.updateRecord({
                matrxRecordId,
                data: formData,
                callbackId: callbackManager.register(callback)
            }));
        }
    }, [viewMode, formData, matrxRecordId, validateForm, dispatch, actions, clearValidationErrors]);

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
        return viewMode === 'view'
               ? activeRecord?.[fieldName] ?? ''
               : formData[fieldName] ?? '';
    }, [viewMode, activeRecord, formData]);

    return {
        // State
        viewMode,
        formData,
        validationErrors,
        isLoading: loadingState.loading,
        hasError: !!errorState.message,
        errorMessage: errorState.message,
        lastOperation: loadingState.lastOperation,

        // Metadata
        entityDisplayName,
        fieldInfo,
        activeRecord,
        matrxRecordId,
        defaultValues,

        // Actions
        handleNew,
        handleEdit,
        handleCancel,
        handleSave,
        handleDelete,
        handleFieldChange,

        // Utilities
        isFieldReadOnly,
        getFieldValue,
        getDisplayValue: (record) => record[displayField] || 'Unnamed Record',

        // Feature flags
        canCreate: options.allowCreate,
        canEdit: options.allowEdit,
        canDelete: options.allowDelete,
    };
}
