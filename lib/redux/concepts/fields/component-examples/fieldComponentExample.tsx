// components/form/FormContext.tsx
import React from 'react';
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {EntityStateField, MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import { FormMode } from '../types';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { selectFormState, selectRecordValues } from '../selectors';
import { setFormMode, clearFields } from '../fieldSlice';
import { SmartField } from './SmartField';
import {useEntity} from "@/lib/redux/entity/hooks/useEntity";
import {FormState} from "@/components/matrx/ArmaniForm/SimpleForm";


interface FormContextType {
    entityKey: EntityKeys;
    recordId: MatrxRecordId | 'new';
    mode: FormMode;
    values: Record<string, any>;
    isValid: boolean;
    isDirty: boolean;
    setMode: (mode: FormMode) => void;
    handleSubmit: () => void;
}

const FormContext = React.createContext<FormContextType | null>(null);

interface FormProviderProps {
    entityKey: EntityKeys;
    recordId: MatrxRecordId | 'new';
    initialMode?: FormMode;
    children: React.ReactNode;
    onSubmitSuccess?: () => void;
    onSubmitError?: (error: any) => void;
}

export const FormProvider: React.FC<FormProviderProps> = ({
    entityKey,
    recordId,
    initialMode = 'display',
    children,
    onSubmitSuccess,
    onSubmitError
}) => {
    const dispatch = useAppDispatch();
    const { createRecord, updateRecord } = useEntity(entityKey);

    const formState = useAppSelector(state =>
        selectFormState(state, entityKey, recordId));

    const values = useAppSelector(state =>
        selectRecordValues(state, entityKey, recordId));

    React.useEffect(() => {
        dispatch(setFormMode({ entityKey, recordId, mode: initialMode }));
    }, [dispatch, entityKey, recordId, initialMode]);

    const setMode = React.useCallback((mode: FormMode) => {
        dispatch(setFormMode({ entityKey, recordId, mode }));
    }, [dispatch, entityKey, recordId]);

    const handleSubmit = React.useCallback(() => {
        const callback = (result: { success: boolean; error?: any }) => {
            if (result.success) {
                setMode('display');
                onSubmitSuccess?.();
            } else {
                onSubmitError?.(result.error);
            }
        };

        if (recordId === 'new') {
            createRecord(values as Partial<EntityData<EntityKeys>>, {
                callback,
                showToast: true
            });
        } else {
            updateRecord(recordId, values as Partial<EntityData<EntityKeys>>, {
                callback,
                showToast: true
            });
        }
    }, [recordId, values, createRecord, updateRecord, setMode]);

    const contextValue = React.useMemo(() => ({
        entityKey,
        recordId,
        mode: formState.mode,
        values,
        isValid: formState.isValid,
        isDirty: formState.isDirty,
        setMode,
        handleSubmit
    }), [entityKey, recordId, formState, values, setMode, handleSubmit]);

    return (
        <FormContext.Provider value={contextValue}>
            {children}
        </FormContext.Provider>
    );
};

export const useForm = () => {
    const context = React.useContext(FormContext);
    if (!context) {
        throw new Error('useForm must be used within a FormProvider');
    }
    return context;
};

interface SmartFormProps {
    entityKey: EntityKeys;
    recordId: MatrxRecordId | 'new';
    initialMode?: FormMode;
    onSubmitSuccess?: () => void;
    onSubmitError?: (error: any) => void;
    children: React.ReactNode;
}

// Updated SmartForm component
export const SmartForm: React.FC<SmartFormProps> = ({
    entityKey,
    recordId,
    initialMode = 'display',
    children,
    onSubmitSuccess,
    onSubmitError
}) => {
    return (
        <FormProvider
            entityKey={entityKey}
            recordId={recordId}
            initialMode={initialMode}
            onSubmitSuccess={onSubmitSuccess}
            onSubmitError={onSubmitError}
        >
            <FormContent>{children}</FormContent>
        </FormProvider>
    );
};

const FormContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { handleSubmit, mode, isDirty, isValid } = useForm();

    const canSubmit = isDirty && isValid &&
        (mode === 'edit' || mode === 'create');

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
            }}
            className="space-y-4"
        >
            {children}
            {(mode === 'edit' || mode === 'create') && (
                <div className="flex justify-end space-x-2">
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={`px-4 py-2 rounded ${
                            canSubmit 
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        Submit
                    </button>
                </div>
            )}
        </form>
    );
};

// Example usage
const MyEntityForm = () => {
    const handleSubmitSuccess = () => {
        console.log('Form submitted successfully');
    };

    const handleSubmitError = (error: any) => {
        console.error('Form submission failed:', error);
    };

    return (
        <SmartForm
            entityKey="tool"
            recordId="new"
            initialMode="create"
            onSubmitSuccess={handleSubmitSuccess}
            onSubmitError={handleSubmitError}
        >
            <SmartField
                entityKey="tool"
                fieldName="name"
                recordId="new"
                initialValue=""
                mode="create"
            />
        </SmartForm>
    );
};
