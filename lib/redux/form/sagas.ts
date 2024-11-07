// lib/redux/form/sagas.ts
import { takeLatest, put, select, call } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { createEntitySlice } from '../entity/slice';
import { EntityKeys } from '@/types/entityTypes';
import * as formActions from './slice';

function* handleFormSubmission(
    action: PayloadAction<{
        formId: string;
    }>
) {
    try {
        const { formId } = action.payload;
        const formState = yield select(state => state.form.forms[formId]);

        if (!formState || !formState.entityKey) {
            return;
        }

        const entitySlice = createEntitySlice(formState.entityKey, {} as any);

        yield put(formActions.submitFormStart({ formId }));

        if (formState.mode === 'create') {
            yield put(entitySlice.actions.createRecord(formState.values));
        } else if (formState.mode === 'update') {
            const primaryKeyValues = formState.metadata?.entityId
                                     ? { id: formState.metadata.entityId }
                                     : {};

            yield put(entitySlice.actions.updateRecord({
                primaryKeyValues,
                data: formState.values
            }));
        }

        yield put(formActions.submitFormSuccess({ formId }));
        yield put(formActions.clearForm({ formId }));

    } catch (error: any) {
        yield put(formActions.submitFormError({
            formId: action.payload.formId,
            errors: {
                submit: error.message
            }
        }));
    }
}

export function* formSagas() {
    yield takeLatest('form/submitForm', handleFormSubmission);
}
