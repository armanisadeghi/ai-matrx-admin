// components/form/SmartField.tsx
import React from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {FieldIdentifier, FormMode} from '../types';
import {updateFieldValue, initializeField} from '../fieldSlice';
import {selectField, selectFieldValue} from '../selectors';
import {EntityKeys, AllEntityFieldKeys} from "@/types/entityTypes";
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import {SmartComponentProps} from "@/components/matrx/ArmaniForm/SimpleRelationshipWrapper";
import {useForm} from "@/lib/redux/concepts/fields/component-examples/fieldComponentExample";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";


interface SmartFieldProps {
    entityKey: EntityKeys;
    fieldName: AllEntityFieldKeys;
    recordId: MatrxRecordId | 'new';
    initialValue: any;
    mode: FormMode;
}

export const SmartField: React.FC<SmartFieldProps> = (
    {
        entityKey,
        fieldName,
        recordId,
        initialValue,
        mode
    }) => {
    const dispatch = useAppDispatch();
    const identifier: FieldIdentifier = {entityKey, fieldName, recordId};

    const field = useAppSelector(state => selectField(state, identifier));
    const value = field?.value ?? initialValue;
    const isDisabled = field?.mode === 'display' || field?.mode === 'view';

    React.useEffect(() => {
        if (!field) {
            dispatch(initializeField({
                identifier,
                initialValue,
                mode
            }));
        }
    }, [dispatch, entityKey, fieldName, recordId, initialValue, mode]);

    const handleChange = (newValue: any) => {
        dispatch(updateFieldValue({identifier, value: newValue}));
    };

    return (
        <div>
            <input
                value={value ?? ''}
                onChange={(e) => handleChange(e.target.value)}
                disabled={isDisabled}
            />
            {field?.validationErrors && field.validationErrors.map((error, index) => (
                <div key={index} className="text-red-500">{error}</div>
            ))}
        </div>
    );
};

