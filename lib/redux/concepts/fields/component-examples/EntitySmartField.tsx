// @ts-nocheck
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
import {ENTITY_FIELD_COMPONENTS} from "@/components/matrx/ArmaniForm/field-components";
import FormFieldMotionWrapper from "@/components/matrx/ArmaniForm/field-components/wrappers/FormFieldMotionWrapper";

export const EntitySmartField: React.FC<SmartComponentProps> = (
    {
        entityKey,
        matrxRecordId,
        fieldInfo,
        dynamicStyles,
        ...props
    }) => {
    const dispatch = useAppDispatch();
    const {mode} = useForm();

    const identifier: FieldIdentifier = {
        entityKey,
        fieldName: fieldInfo.name,
        recordId: matrxRecordId || 'new'
    };

    const selectors = React.useMemo(
        () => createEntitySelectors(entityKey),
        [entityKey]
    );

    const valueFromGlobalState = useAppSelector((state) =>
        selectors.selectFieldValueByKey(state, matrxRecordId, fieldInfo.name)
    );

    const localValue = useAppSelector(state =>
        selectFieldValue(state, identifier)) ?? fieldInfo.defaultValue;

    React.useEffect(() => {
        dispatch(initializeField({
            identifier,
            initialValue: valueFromGlobalState ?? fieldInfo.defaultValue,
            mode
        }));
    }, [
        dispatch,
        valueFromGlobalState,
        fieldInfo.defaultValue,
        matrxRecordId,
        mode
    ]);

    const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(updateFieldValue({
            identifier,
            value: e.target.value
        }));
    };

    const isDisabled = mode === 'display' || mode === 'view';
    const Component = ENTITY_FIELD_COMPONENTS[fieldInfo.defaultComponent];

    return (
        <FormFieldMotionWrapper
            animationPreset={dynamicStyles.animationPreset}
            density={dynamicStyles.density}
            floatingLabel={true}
            className=""
        >
            <Component
                entityKey={entityKey}
                dynamicFieldInfo={fieldInfo}
                value={localValue}
                onChange={onChange}
                density={dynamicStyles.density}
                animationPreset={dynamicStyles.animationPreset}
                size={dynamicStyles.size}
                variant={dynamicStyles.variant}
                floatingLabel={true}
                disabled={isDisabled}
            />
        </FormFieldMotionWrapper>

    );
};
