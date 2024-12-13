// selectors.ts
import {createSelector} from '@reduxjs/toolkit';
import {RootState} from '@/lib/redux/store';
import {FieldIdentifier} from "./types";
import {createFieldId} from "./fieldUtils";
import {fieldAdapter} from "./fieldSlice";
import {EntityKeys} from "@/types/entityTypes";
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";

const selectFieldsState = (state: RootState) => state.entityFields;

export const {
    selectAll: selectAllFields,
    selectById: selectFieldById
} = fieldAdapter.getSelectors<RootState>(selectFieldsState);


export const selectFieldValue = createSelector(
    [selectFieldsState,
        (_state: RootState, identifier: FieldIdentifier) => identifier],
    (fieldsState, identifier) => {
        const id = createFieldId(identifier);
        return fieldsState.entities[id]?.value;
    }
);

export const selectField = createSelector(
    [selectFieldsState,
        (_state: RootState, identifier: FieldIdentifier) => identifier],
    (fieldsState, identifier) => {
        const id = createFieldId(identifier);
        return fieldsState.entities[id];
    }
);

export const selectFormState = createSelector(
    [selectAllFields,
        (_state: RootState, entityKey: EntityKeys, recordId: MatrxRecordId | 'new') =>
            ({entityKey, recordId})],
    (fields, {entityKey, recordId}) => {
        const formFields = fields.filter(field =>
            field.entityKey === entityKey &&
            field.recordId === recordId
        );

        return {
            entityKey,
            recordId,
            mode: formFields[0]?.mode || 'display',
            isDirty: formFields.some(field => field.isDirty),
            isValid: formFields.every(field => field.isValid),
            isSubmitting: false
        };
    }
);

export const selectRecordValues = createSelector(
    [selectAllFields,
        (_state: RootState, entityKey: EntityKeys, recordId: MatrxRecordId | 'new') =>
            ({entityKey, recordId})],
    (fields, {entityKey, recordId}) => {
        return fields
            .filter(field =>
                field.entityKey === entityKey &&
                field.recordId === recordId)
            .reduce((acc, field) => ({
                ...acc,
                [field.fieldName]: field.value
            }), {});
    }
);

export const selectDirtyFields = createSelector(
    [selectAllFields,
        (_state: RootState, entityKey: EntityKeys, recordId: MatrxRecordId | 'new') =>
            ({entityKey, recordId})],
    (fields, {entityKey, recordId}) => {
        return fields.filter(field =>
            field.entityKey === entityKey &&
            field.recordId === recordId &&
            field.isDirty
        );
    }
);
