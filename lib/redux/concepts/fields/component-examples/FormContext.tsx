// contexts/FormContext.tsx
import React from 'react';
import {EntityKeys} from "@/types/entityTypes";
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import {FormMode} from '../types';

interface FormContextValue {
    entityKey: EntityKeys;
    recordId: MatrxRecordId | 'new';
    mode: FormMode;
    parentContext?: {
        entityKey: EntityKeys;
        recordId: MatrxRecordId | 'new';
    };
    relationshipType?: 'foreignKey' | 'inverseKey' | 'manyToMany';
}

const FormContext = React.createContext<FormContextValue | null>(null);

interface FormProviderProps {
    entityKey: EntityKeys;
    recordId: MatrxRecordId | 'new';
    mode: FormMode;
    parentContext?: {
        entityKey: EntityKeys;
        recordId: MatrxRecordId | 'new';
    };
    relationshipType?: 'foreignKey' | 'inverseKey' | 'manyToMany';
    children: React.ReactNode;
}

export const FormProvider: React.FC<FormProviderProps> = (
    {
        entityKey,
        recordId,
        mode,
        parentContext,
        relationshipType,
        children
    }) => {
    const contextValue = React.useMemo(() => ({
        entityKey,
        recordId,
        mode,
        parentContext,
        relationshipType
    }), [entityKey, recordId, mode, parentContext, relationshipType]);

    return (
        <FormContext.Provider value={contextValue}>
            {children}
        </FormContext.Provider>
    );
};
