// components/matrx/actions/MatrxActions.tsx
'use client';

import React, {useState} from "react";
import {useRouter} from "next/navigation";
import {Edit, Eye, Maximize2, Trash, ExternalLink, MoreHorizontal} from "lucide-react";
import {useDispatch, useSelector} from "react-redux";
import {EntityKeys, EntityData, EntityDataWithKey, MatrxRecordId} from "@/types/entityTypes";
import MatrxTooltip from "@/components/matrx/MatrxTooltip";
import {Button} from "@/components/ui/button";
import {RootState} from "@/lib/redux/store";
import {ActionDefinition, EntityActionGroupProps} from "@/types/entityTableTypes";
import { cn } from '@/utils/cn';
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import {useToast} from "@/components/ui";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";


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
        type: 'custom',
        subType: 'relationship',
        className: "text-primary hover:bg-primary hover:text-primary-foreground",
    }
};

// Hook for managing action state and handlers
export function useEntityOps<TEntity extends EntityKeys>(
    entityKey: TEntity,
) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const entitySelectors = createEntitySelectors(entityKey);
    const records = useAppSelector(entitySelectors.selectRecordsArray);
    const activeItem = useAppSelector(entitySelectors.selectActiveRecord);
    const loading = useAppSelector(entitySelectors.selectIsLoading);
    const error = useAppSelector(entitySelectors.selectErrorState);

    const {toast} = useToast();

    const context: ActionContext<TEntity> = {
        data: records as unknown as EntityData<TEntity>,
        entityKey,
        dispatch,
        router,
        state: {
            loading: loading ?? false,
            selected: false, // Can be enhanced with selection state
        }
    };

    const handleAction = async (
        action: ActionDefinition<TEntity>,
        entityData: EntityData<TEntity> | EntityDataWithKey<TEntity>,
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
                    await handleEntityAction(action, context, entityData);
                    break;
                case 'custom':
                    if (action.subType === 'relationship') {
                        await handleRelationshipAction(action, context, entityData);
                    }
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
    context: ActionContext<TEntity>,
    entityData: EntityData<TEntity> | EntityDataWithKey<TEntity>
) {
    const entitySelectors = createEntitySelectors(context.entityKey);

    switch (action.name) {
        case 'view':
            // View logic would be handled by the component
            break;
        case 'edit':
            // Edit logic would be handled by the component
            break;
        case 'delete':
            // Get matrxRecordId from the data
            const recordId = (entityData as EntityDataWithKey<TEntity>).matrxRecordId;
            if (recordId) {
                // deleteRequest expects string | number, but we should use deleteRecord action instead
                // For now, this is a placeholder - the actual delete should use deleteRecord thunk
                console.warn('Delete action should use deleteRecord thunk, not deleteRequest');
            }
            break;
        default:
            console.warn(`Unknown entity action: ${action.name}`);
    }
}

async function handleRelationshipAction<TEntity extends EntityKeys>(
    action: ActionDefinition<TEntity>,
    context: ActionContext<TEntity>,
    entityData: EntityData<TEntity> | EntityDataWithKey<TEntity>
) {
    if (!action.relationship) return;

    const {entityKey, display} = action.relationship;
    const entitySelectors = createEntitySelectors(context.entityKey);
    
    // Get matrxRecordId from the data
    const recordId = (entityData as EntityDataWithKey<TEntity>).matrxRecordId;

    switch (display) {
        case 'modal':
            // Implement modal display logic
            break;
        case 'page':
            if (recordId) {
                context.router.push(`/entities/${entityKey}/${recordId}`);
            }
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

export interface EntityOpsButtonProps<TEntity extends EntityKeys> {
    action: ActionDefinition<TEntity>;
    entityData: EntityData<TEntity> | EntityDataWithKey<TEntity>;
    entityKey: TEntity;
    className?: string;
    onActionOverride?: (action: ActionDefinition<TEntity>, entityData: EntityData<TEntity> | EntityDataWithKey<TEntity>) => void;
}

export const EntityOpsButton = <TEntity extends EntityKeys>({
    action,
    entityData,
    entityKey,
    className,
    onActionOverride
}: EntityOpsButtonProps<TEntity>) => {
    const { handleAction, context } = useEntityOps(entityKey);

    const isVisible = action.isVisible?.(entityData as EntityData<TEntity>) ?? true;
    const isEnabled = action.isEnabled?.(entityData as EntityData<TEntity>) ?? true;

    if (!isVisible) return null;

    // @ts-ignore - COMPLEX: action.label can be function or string, may need type guard
    const label: string = typeof action.label === 'function' ? action.label(entityData as EntityData<TEntity>) : action.label;
    const icon: React.ReactNode = action.icon;
    const buttonClassName = typeof action.className === 'function'
        ? action.className(entityData as EntityData<TEntity>)
        : action.className;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onActionOverride) {
            onActionOverride(action, entityData);
        } else {
            handleAction(action, entityData, e);
        }
    };

    return (
        <MatrxTooltip content={label} placement="left">
            <Button
                onClick={handleClick}
                disabled={!isEnabled || context.state.loading}
                size="sm"
                variant="ghost"
                className={cn(
                    'p-1 transition-all duration-300 hover:scale-105',
                    buttonClassName,
                    className
                )}
            >
                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-3 h-3' }) : icon}
            </Button>
        </MatrxTooltip>
    );
};

export interface EntityOpsButtonGroupProps<TEntity extends EntityKeys> {
    actionNames: string[];
    entityData: EntityData<TEntity> | EntityDataWithKey<TEntity>;
    entityKey: TEntity;
    className?: string;
    customActions?: ActionDefinition<TEntity>[];
    actionOverrides?: Record<string, (action: ActionDefinition<TEntity>, entityData: EntityData<TEntity> | EntityDataWithKey<TEntity>) => void>;
}

export const EntityOpsButtonGroup = <TEntity extends EntityKeys>({
    actionNames,
    entityData,
    entityKey,
    className,
    customActions = [],
    actionOverrides = {}
}: EntityOpsButtonGroupProps<TEntity>) => {

    const customActionsMap = Object.fromEntries(customActions.map(action => [action.name, action]));

    return (
        <div className={cn('flex items-center space-x-1', className)}>
            {actionNames.map((actionName) => {
                const action = customActionsMap[actionName] || standardActions[actionName];
                if (!action) return null;

                const onActionOverride = actionOverrides[actionName];

                return (
                    <EntityOpsButton
                        key={actionName}
                        action={action}
                        entityData={entityData}
                        entityKey={entityKey}
                        className={className}
                        onActionOverride={onActionOverride}
                    />
                );
            })}

            {customActions.map((action) => {
                if (actionNames.includes(action.name)) return null;

                const onActionOverride = actionOverrides[action.name];

                return (
                    <EntityOpsButton
                        key={action.name}
                        action={action}
                        entityData={entityData}
                        entityKey={entityKey}
                        className={className}
                        onActionOverride={onActionOverride}
                    />
                );
            })}
        </div>
    );
};



