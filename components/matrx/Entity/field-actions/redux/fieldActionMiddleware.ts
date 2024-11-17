// redux/middleware.ts

import { Middleware } from "redux";
import {fieldActionFailure, fieldActionSuccess} from "./actions";

export const fieldActionMiddleware: Middleware = store => next => async action => {
    //@ts-ignore
    if (action.type !== FIELD_ACTION_TYPES.EXECUTE_ACTION) {
        return next(action);
    }

    //@ts-ignore
    const { action: fieldAction, field, value } = action.payload;

    try {
        // Execute the action
        if (fieldAction.handleAction) {
            const result = await fieldAction.handleAction(field, value);

            // Dispatch success
            store.dispatch(fieldActionSuccess(fieldAction.type, result));

            // Handle any required Redux actions from prewired components
            if ('requirements' in fieldAction.component!) {
                const { actions = [] } = fieldAction.component.requirements!;
                actions.forEach(actionType => {
                    store.dispatch({ type: actionType, payload: { field, value, result } });
                });
            }
        }
    } catch (error) {
        store.dispatch(
            fieldActionFailure(
                fieldAction.type,
                error instanceof Error ? error.message : 'Action failed'
            )
        );
    }
};
