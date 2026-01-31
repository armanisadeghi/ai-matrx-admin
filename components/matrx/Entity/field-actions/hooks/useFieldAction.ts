// hooks/useFieldAction.ts
import { useDispatch } from 'react-redux';
import { ActionConfig, FieldConfig } from '../types';

export const useFieldAction = (action: ActionConfig, field: FieldConfig) => {
    const dispatch = useDispatch();

    const execute = async (value: any) => {
        try {
            if (action.handleAction) {
                await action.handleAction(field, value);
            }

            // Handle any Redux actions
            // @ts-ignore - COMPLEX: action.component may not have 'requirements' property, needs type guard
            if (action.component && 'requirements' in action.component) {
                // @ts-ignore - actions property may not exist on requirements
                const { actions = [] } = (action.component as any).requirements || {};
                actions.forEach(actionType => {
                    dispatch({ type: actionType, payload: { field, value } });
                });
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Action failed'
            };
        }
    };

    return { execute };
};
