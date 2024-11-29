// components/form/SmartForm.tsx
import React from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {selectRecordValues, selectDirtyFields, selectFormState} from '../selectors';
import {setFormMode, clearFields} from '../fieldSlice';
import {FormMode} from '../types';
import {EntityKeys} from '@/types/entityTypes';
import {MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {FormProvider} from "@/lib/redux/concepts/fields/component-examples/FormContext";

interface SmartFormProps {
    entityKey: EntityKeys;
    recordId: MatrxRecordId | 'new';
    mode: FormMode;
    parentContext?: {
        entityKey: EntityKeys;
        recordId: MatrxRecordId | 'new';
    };
    relationshipType?: 'foreignKey' | 'inverseKey' | 'manyToMany';
    children: React.ReactNode;
    foreignKeys?: Array<{
        entityKey: EntityKeys;
        recordId: MatrxRecordId | 'new';
    }>;
    inverseKeys?: Array<EntityKeys>;
    manyToManyKeys?: Array<EntityKeys>;
}

export const SmartForm: React.FC<SmartFormProps> = (
    {
        entityKey,
        recordId,
        mode,
        parentContext,
        relationshipType,
        children,
        foreignKeys,
        inverseKeys,
        manyToManyKeys
    }) => {
    return (
        <FormProvider
            entityKey={entityKey}
            recordId={recordId}
            mode={mode}
            parentContext={parentContext}
            relationshipType={relationshipType}
        >
            <div className="space-y-4">
                {children}

                {/* Foreign Key Forms */}
                {foreignKeys?.map(({entityKey: fkEntityKey, recordId: fkRecordId}) => (
                    <SmartForm
                        key={`fk-${fkEntityKey}-${fkRecordId}`}
                        entityKey={fkEntityKey}
                        recordId={fkRecordId}
                        mode={mode}
                        parentContext={{entityKey, recordId}}
                        relationshipType="foreignKey"
                    >
                        {/* Foreign key fields rendered here */}
                    </SmartForm>
                ))}

                {/* Inverse Foreign Key Forms */}
                {inverseKeys?.map((ifkEntityKey) => (
                    <SmartForm
                        key={`ifk-${ifkEntityKey}`}
                        entityKey={ifkEntityKey}
                        recordId={recordId}
                        mode={mode}
                        parentContext={{entityKey, recordId}}
                        relationshipType="inverseKey"
                    >
                        {/* Inverse foreign key fields rendered here */}
                    </SmartForm>
                ))}

                {/* Many to Many Forms */}
                {manyToManyKeys?.map((m2mEntityKey) => (
                    <SmartForm
                        key={`m2m-${m2mEntityKey}`}
                        entityKey={m2mEntityKey}
                        recordId={recordId}
                        mode={mode}
                        parentContext={{entityKey, recordId}}
                        relationshipType="manyToMany"
                    >
                        {/* Many to many fields rendered here */}
                    </SmartForm>
                ))}
            </div>
        </FormProvider>
    );
};
