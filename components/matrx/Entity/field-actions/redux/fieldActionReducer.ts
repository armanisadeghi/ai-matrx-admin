// redux/reducer.ts

import {FIELD_ACTION_TYPES} from "@/components/matrx/Entity/field-actions/redux/actions";

interface FieldActionState {
    loading: Record<string, boolean>;
    errors: Record<string, string | null>;
    results: Record<string, any>;
    sections: Record<string, any[]>;
}

const initialState: FieldActionState = {
    loading: {},
    errors: {},
    results: {},
    sections: {}
};

export const fieldActionReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case FIELD_ACTION_TYPES.EXECUTE_ACTION:
            return {
                ...state,
                loading: {
                    ...state.loading,
                    [action.payload.action.type]: true
                },
                errors: {
                    ...state.errors,
                    [action.payload.action.type]: null
                }
            };

        case FIELD_ACTION_TYPES.ACTION_SUCCESS:
            return {
                ...state,
                loading: {
                    ...state.loading,
                    [action.payload.actionType]: false
                },
                results: {
                    ...state.results,
                    [action.payload.actionType]: action.payload.result
                }
            };

        case FIELD_ACTION_TYPES.ACTION_FAILURE:
            return {
                ...state,
                loading: {
                    ...state.loading,
                    [action.payload.actionType]: false
                },
                errors: {
                    ...state.errors,
                    [action.payload.actionType]: action.payload.error
                }
            };

        default:
            return state;
    }
};
