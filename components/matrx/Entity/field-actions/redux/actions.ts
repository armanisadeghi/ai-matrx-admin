// redux/actionTypes.ts
export const FIELD_ACTION_TYPES = {
    EXECUTE_ACTION: 'fieldActions/execute',
    ACTION_SUCCESS: 'fieldActions/success',
    ACTION_FAILURE: 'fieldActions/failure',
    UPDATE_SECTION: 'fieldActions/updateSection',
    CLEAR_SECTION: 'fieldActions/clearSection',
} as const;

import { ActionConfig, FieldConfig } from '../types';


// redux/actions.ts


export const executeFieldAction = (
    action: ActionConfig,
    field: FieldConfig,
    value: any
) => ({
    type: FIELD_ACTION_TYPES.EXECUTE_ACTION,
    payload: { action, field, value }
});

export const fieldActionSuccess = (
    actionType: string,
    result: any
) => ({
    type: FIELD_ACTION_TYPES.ACTION_SUCCESS,
    payload: { actionType, result }
});

export const fieldActionFailure = (
    actionType: string,
    error: string
) => ({
    type: FIELD_ACTION_TYPES.ACTION_FAILURE,
    payload: { actionType, error }
});


