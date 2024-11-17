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
            if ('requirements' in action.component!) {
                const { actions = [] } = action.component.requirements!;
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
