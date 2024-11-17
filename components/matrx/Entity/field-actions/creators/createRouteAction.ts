// creators/createRouteAction.ts
import { ActionType } from '../types';
import { RouteConfig } from '../types';
import { createFieldAction } from './createFieldAction';

export const createRouteAction = (
    type: ActionType,
    routeConfig: RouteConfig,
    actionConfig: any
) => {
    return createFieldAction(type, {
        ...actionConfig,
        handleAction: async (field, value) => {
            // Handle any pre-navigation logic
            if (actionConfig.handleAction) {
                await actionConfig.handleAction(field, value);
            }

            // Navigate to the route
            window.history.pushState({}, '', routeConfig.path);
        }
    });
};
