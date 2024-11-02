// components/matrx/actions/MatrxActions.tsx
'use client';

import React from "react";
import {useRouter} from "next/navigation";
import {Edit, Eye, Maximize2, Trash, ExternalLink, MoreHorizontal} from "lucide-react";
import {useDispatch, useSelector} from "react-redux";
import {EntityKeys, EntityData} from "@/types/entityTypes";
import MatrxTooltip from "@/components/matrx/MatrxTooltip";
import {Button} from "@/components/ui/button";
import {createEntityActions} from "@/lib/redux/entity/entityActionCreator";
import {RootState} from "@/lib/redux/store";

// Base Action Definition
export interface ActionDefinition<TEntity extends EntityKeys = any> {
    name: string;
    label: string | ((data: EntityData<TEntity>) => string);
    icon: React.ReactNode | ((data: EntityData<TEntity>) => React.ReactNode);
    className?: string | ((data: EntityData<TEntity>) => string);
    // Basic visibility and enablement
    isVisible?: (data: EntityData<TEntity>) => boolean;
    isEnabled?: (data: EntityData<TEntity>) => boolean;
    // Enhanced features (all optional)
    type?: 'entity' | 'relationship' | 'service' | 'navigation';
    confirmationRequired?: boolean | {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
    };
    relationship?: {
        entityKey: EntityKeys;
        display: 'modal' | 'sidebar' | 'page' | 'inline';
    };
    navigation?: {
        path: string;
        params?: Record<string, string>;
    };
    service?: {
        type: 'socket' | 'api' | 'ai';
        action: string;
    };
}

// Enhanced Context available to all actions
export interface ActionContext<TEntity extends EntityKeys> {
    data: EntityData<TEntity>;
    entityKey: TEntity;
    dispatch: ReturnType<typeof useDispatch>;
    router: ReturnType<typeof useRouter>;
    state: {
        loading: boolean;
        selected: boolean;
    };
}

// Standard Actions
export const standardActions: Record<string, ActionDefinition> = {
    view: {
        name: 'view',
        label: "View this item",
        icon: <Eye className="h-4 w-4"/>,
        className: "text-primary hover:bg-secondary hover:text-secondary-foreground",
        type: 'entity',
    },
    edit: {
        name: 'edit',
        label: "Edit this item",
        icon: <Edit className="h-3 w-3"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",
        type: 'entity',
        confirmationRequired: false,
    },
    delete: {
        name: 'delete',
        label: "Delete this item",
        icon: <Trash className="h-4 w-4"/>,
        className: "text-destructive hover:bg-destructive hover:text-destructive-foreground",
        type: 'entity',
        confirmationRequired: {
            title: "Confirm Delete",
            message: "Are you sure you want to delete this item?",
            confirmText: "Delete",
            cancelText: "Cancel"
        },
    },
    expand: {
        name: 'expand',
        label: "Expand view",
        icon: <Maximize2 className="h-4 w-4"/>,
        className: "text-secondary hover:bg-secondary hover:text-secondary-foreground",
        type: 'navigation',
    },
    viewRelated: {
        name: 'viewRelated',
        label: "View Related Items",
        icon: <ExternalLink className="h-4 w-4"/>,
        type: 'relationship',
        className: "text-primary hover:bg-primary hover:text-primary-foreground",
    }
};

// Hook for managing action state and handlers
export function useActions<TEntity extends EntityKeys>(
    entityKey: TEntity,
    data: EntityData<TEntity>
) {
    const dispatch = useDispatch();
    const router = useRouter();
    const loading = useSelector((state: RootState) =>
        state.entities[entityKey]?.loading || false
    );

    const context: ActionContext<TEntity> = {
        data,
        entityKey,
        dispatch,
        router,
        state: {
            loading,
            selected: false, // Can be enhanced with selection state
        }
    };

    const handleAction = async (
        action: ActionDefinition<TEntity>,
        e?: React.MouseEvent
    ) => {
        e?.stopPropagation();

        // Handle confirmation if required
        if (action.confirmationRequired) {
            // Implement confirmation logic
            // For now, just a basic confirm
            const message = typeof action.confirmationRequired === 'object'
                            ? action.confirmationRequired.message
                            : `Are you sure you want to ${action.name} this item?`;

            if (!window.confirm(message)) return;
        }

        try {
            switch (action.type) {
                case 'entity':
                    await handleEntityAction(action, context);
                    break;
                case 'relationship':
                    await handleRelationshipAction(action, context);
                    break;
                case 'navigation':
                    await handleNavigationAction(action, context);
                    break;
                case 'service':
                    await handleServiceAction(action, context);
                    break;
                default:
                    console.warn(`Unknown action type: ${action.type}`);
            }
        } catch (error) {
            console.error(`Action ${action.name} failed:`, error);
            // Implement error handling
        }
    };

    return {handleAction, context};
}

// Action handler implementations
async function handleEntityAction<TEntity extends EntityKeys>(
    action: ActionDefinition<TEntity>,
    context: ActionContext<TEntity>
) {
    const entityActions = createEntityActions(context.entityKey);

    switch (action.name) {
        case 'view':
            context.dispatch(entityActions.setSelectedItem(context.data));
            break;
        case 'edit':
            context.dispatch(entityActions.setSelectedItem(context.data));
            // Additional edit logic
            break;
        case 'delete':
            await context.dispatch(entityActions.deleteRequest(context.data.id));
            break;
        default:
            console.warn(`Unknown entity action: ${action.name}`);
    }
}

async function handleRelationshipAction<TEntity extends EntityKeys>(
    action: ActionDefinition<TEntity>,
    context: ActionContext<TEntity>
) {
    if (!action.relationship) return;

    const {entityKey, display} = action.relationship;

    switch (display) {
        case 'modal':
            // Implement modal display logic
            break;
        case 'page':
            context.router.push(`/entities/${entityKey}/${context.data.id}`);
            break;
        case 'sidebar':
            // Implement sidebar display logic
            break;
        default:
            console.warn(`Unknown display type: ${display}`);
    }
}

async function handleNavigationAction<TEntity extends EntityKeys>(
    action: ActionDefinition<TEntity>,
    context: ActionContext<TEntity>
) {
    if (!action.navigation) return;

    const {path, params} = action.navigation;
    const queryString = params
                        ? '?' + new URLSearchParams(params).toString()
                        : '';

    context.router.push(`${path}${queryString}`);
}

async function handleServiceAction<TEntity extends EntityKeys>(
    action: ActionDefinition<TEntity>,
    context: ActionContext<TEntity>
) {
    if (!action.service) return;

    // Implement service action handling
    // This will be expanded based on your service system
}

// Main Action Component
export const MatrxActionButton = <TEntity extends EntityKeys>(
    {
        action,
        data,
        entityKey,
        className
    }: {
        action: ActionDefinition<TEntity>;
        data: EntityData<TEntity>;
        entityKey: TEntity;
        className?: string;
    }) => {
    const {handleAction, context} = useActions(entityKey, data);

    const isVisible = action.isVisible?.(data) ?? true;
    const isEnabled = action.isEnabled?.(data) ?? true;

    if (!isVisible) return null;

    const label = typeof action.label === 'function' ? action.label(data) : action.label;
    const icon = typeof action.icon === 'function' ? action.icon(data) : action.icon;
    const buttonClassName = typeof action.className === 'function'
                            ? action.className(data)
                            : action.className;

    return (
        <MatrxTooltip content={label} placement="left">
            <Button
                onClick={(e) => handleAction(action, e)}
                disabled={!isEnabled || context.state.loading}
                size="xs"
                variant="ghost"
                className={`p-1 ${buttonClassName || ""} ${className || ""} 
                    transition-all duration-300 hover:scale-105`}
            >
                {React.cloneElement(icon as React.ReactElement, {className: 'w-3 h-3'})}
            </Button>
        </MatrxTooltip>
    );
};

// Convenience wrapper for multiple actions
export const MatrxActionGroup = <TEntity extends EntityKeys>(
    {
        actions,
        data,
        entityKey,
        className
    }: {
        actions: string[];
        data: EntityData<TEntity>;
        entityKey: TEntity;
        className?: string;
    }) => {
    return (
        <div className={`flex items-center space-x-1 ${className || ""}`}>
            {actions.map((actionName) => {
                const action = standardActions[actionName];
                if (!action) return null;

                return (
                    <MatrxActionButton
                        key={actionName}
                        action={action}
                        data={data}
                        entityKey={entityKey}
                    />
                );
            })}
        </div>
    );
};
