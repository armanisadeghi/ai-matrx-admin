'use client';

import * as React from "react";
import {useCallback} from "react";
import {EntityKeys, EntityData} from "@/types/entityTypes";
import {createEntitySelectors, EntitySelectors} from '@/lib/redux/entity/entitySelectors';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {Button} from "@/components/ui/button";
import {TableCommandContext, BaseCommandConfig} from './types';
import {useToast} from "@/components/ui/use-toast";
import {
    Edit,
    Trash,
    Eye,
    Maximize2,
    Plus,
    Copy,
    Save,
    X,
    Archive,
    CheckCircle, MoreHorizontal, Upload, Download, RefreshCw
} from 'lucide-react';
import {showConfirmDialog, showErrorToast} from "@/components/matrx/MatrxCommands/helpers";
import {cn} from '@/lib/utils';
import {AppDispatch} from "@/lib/redux/store";
import {createEntityActions} from '@/lib/redux/entity/entityActionCreator';

// Entity-specific command context
export interface EntityCommandContext<TEntity extends EntityKeys> extends TableCommandContext {
    entityKey: TEntity;
    data: EntityData<TEntity>;
    selectors: EntitySelectors<TEntity>;
    index: number;
    dispatch: AppDispatch;
}

export interface EntityCommandConfig<TEntity extends EntityKeys> extends BaseCommandConfig {
    name: string;
    entityKey: TEntity;
    useCallback?: boolean;
    setActiveOnClick?: boolean;
    hidden?: boolean;
    component: React.ComponentType<any>;
    isVisible?: (context: EntityCommandContext<TEntity>) => boolean;
    isEnabled?: (context: EntityCommandContext<TEntity>) => boolean;
    onExecuteEntity?: (context: EntityCommandContext<TEntity>) => Promise<void>;
    onErrorEntity?: (error: Error, context: EntityCommandContext<TEntity>) => void;
    requireConfirmation?: boolean;
    confirmationMessage?: string;
}


export function createEntityCommand<TEntity extends EntityKeys>(
    config: EntityCommandConfig<TEntity>
) {
    const EntityCommandComponent: React.FC<{
        index: number;
        data: EntityData<TEntity>;
        className?: string;
        onExecute?: (context: EntityCommandContext<TEntity>) => Promise<void>;
    }> = ({
              index,
              data,
              className,
              onExecute
          }) => {
        const dispatch = useAppDispatch();
        const selectors = createEntitySelectors(config.entityKey);

        // Create context
        const context: EntityCommandContext<TEntity> = {
            type: config.type,
            scope: config.scope,
            entityKey: config.entityKey,
            data,
            selectors,
            index,
            dispatch
        };

        const loading = useAppSelector(selectors.selectLoading);
        const isVisible = config.isVisible?.(context) ?? true;
        const isEnabled = !loading && (config.isEnabled?.(context) ?? true);

        // Handle execution
        const handleClick = async (e: React.MouseEvent) => {
            e.stopPropagation();

            try {
                if (config.requireConfirmation) {
                    const confirmed = await showConfirmDialog(
                        config.confirmationMessage || `Confirm ${config.name}?`
                    );
                    if (!confirmed) return;
                }

                if (onExecute) {
                    await onExecute(context);
                } else if (config.onExecuteEntity) {
                    await config.onExecuteEntity(context);
                }
            } catch (error) {
                if (config.onErrorEntity) {
                    config.onErrorEntity(error as Error, context);
                }
                showErrorToast(`${config.name} failed: ${(error as Error).message}`);
            }
        };

        if (!isVisible) return null;

        return (
            <Button
                onClick={handleClick}
                size={config.size || "xs"}
                variant={config.variant || "ghost"}
                disabled={!isEnabled}
                className={cn(
                    "transition-all duration-300 hover:scale-105",
                    !isEnabled && "cursor-not-allowed",
                    config.className,
                    className
                )}
            >
                {React.isValidElement(config.icon) &&
                    React.cloneElement<any>(config.icon, {
                        className: cn("w-3 h-3", (config.icon.props as any).className)
                    })
                }
            </Button>
        );
    };

    return EntityCommandComponent;
}

// Create base entity commands
export const createEntityCommands = <TEntity extends EntityKeys>(entityKey: TEntity) => ({
    create: createEntityCommand<TEntity>({
        name: 'create',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <Plus className="h-4 w-4"/>,
        component: Button,
        className: "text-success hover:bg-success hover:text-success-foreground",

        isEnabled: () => true,
        onExecuteEntity: async (context) => {
            console.log('Creating new item');
            // Dispatch logic to handle creation
            context.dispatch({
                type: `entities/${entityKey}/create`,
            });
        }
    }),

    duplicate: createEntityCommand<TEntity>({
        name: 'duplicate',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <Copy className="h-4 w-4"/>,
        component: Button,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Duplicating:', context.data);
            // Dispatch logic to handle duplication
            context.dispatch({
                type: `entities/${entityKey}/duplicate`,
                payload: {index: context.index}
            });
        }
    }),

    view: createEntityCommand<TEntity>({
        name: 'view',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <Eye className="h-4 w-4"/>,
        component: Button,
        className: "text-primary hover:bg-secondary hover:text-secondary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Viewing:', context.data);
            context.dispatch({
                type: `entities/${entityKey}/setSelectedItem`,
                payload: {index: context.index}
            });
        }
    }),

    expand: createEntityCommand<TEntity>({
        name: 'expand',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <Maximize2 className="h-4 w-4"/>,
        component: Button,
        className: "text-secondary hover:bg-secondary hover:text-secondary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Expanding view:', context.data);
            // Add logic to expand view
        }
    }),

    edit: createEntityCommand<TEntity>({
        name: 'edit',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <Edit className="h-4 w-4"/>,
        component: Button,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Editing:', context.data);
            // Create backup before editing
            context.dispatch({
                type: `entities/${entityKey}/createBackup`,
                payload: {index: context.index}
            });
            // Set edit mode
            context.dispatch({
                type: `entities/${entityKey}/setEditMode`,
                payload: {index: context.index}
            });
        }
    }),

    save: createEntityCommand<TEntity>({
        name: 'save',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <Save className="h-4 w-4"/>,
        component: Button,
        className: "text-success hover:bg-success hover:text-success-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Saving:', context.data);
            context.dispatch({
                type: `entities/${entityKey}/save`,
                payload: {index: context.index}
            });
        }
    }),

    cancel: createEntityCommand<TEntity>({
        name: 'cancel',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <X className="h-4 w-4"/>,
        component: Button,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Cancelling changes:', context.data);
            context.dispatch({
                type: `entities/${entityKey}/cancel`,
                payload: {index: context.index}
            });
        }
    }),

    delete: createEntityCommand<TEntity>({
        name: 'delete',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <Trash className="h-4 w-4"/>,
        component: Button,
        className: "text-destructive hover:bg-destructive hover:text-destructive-foreground",
        requireConfirmation: true,

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Deleting:', context.data);
            context.dispatch({
                type: `entities/${entityKey}/delete`,
                payload: {index: context.index}
            });
        }
    }),

    archive: createEntityCommand<TEntity>({
        name: 'archive',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <Archive className="h-4 w-4"/>,
        component: Button,
        className: "text-warning hover:bg-warning hover:text-warning-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Archiving:', context.data);
            context.dispatch({
                type: `entities/${entityKey}/archive`,
                payload: {index: context.index}
            });
        }
    }),

    refresh: createEntityCommand<TEntity>({
        name: 'refresh',
        entityKey,
        type: 'feature',
        scope: 'custom',
        icon: <RefreshCw className="h-4 w-4"/>,
        component: Button,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",

        onExecuteEntity: async (context) => {
            console.log('Refreshing data');
            // Dispatch logic to refresh data
            context.dispatch({
                type: `entities/${entityKey}/refresh`
            });
        }
    }),

    export: createEntityCommand<TEntity>({
        name: 'export',
        entityKey,
        type: 'feature',
        scope: 'custom',
        icon: <Download className="h-4 w-4"/>,
        component: Button,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",

        onExecuteEntity: async (context) => {
            console.log('Exporting data');
            // Dispatch logic to export data
        }
    }),

    import: createEntityCommand<TEntity>({
        name: 'import',
        entityKey,
        type: 'feature',
        scope: 'custom',
        icon: <Upload className="h-4 w-4"/>,
        component: Button,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",

        onExecuteEntity: async (context) => {
            console.log('Importing data');
            // Dispatch logic to import data
        }
    }),

    more: createEntityCommand<TEntity>({
        name: 'more',
        entityKey,
        type: 'feature',
        scope: 'single',
        icon: <MoreHorizontal className="h-4 w-4"/>,
        component: Button,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Opening more options:', context.data);
            // Dispatch logic to open more options
        }
    }),

    approve: createEntityCommand<TEntity>({
        name: 'approve',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <CheckCircle className="h-4 w-4"/>,
        component: Button,
        className: "text-success hover:bg-success hover:text-success-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteEntity: async (context) => {
            console.log('Approving:', context.data);
            context.dispatch({
                type: `entities/${entityKey}/approve`,
                payload: {index: context.index}
            });
        }
    })
});

export type EntityCommandName = keyof ReturnType<typeof createEntityCommands> | string;

type SimpleCommandConfig = boolean | {
    useCallback?: boolean;
    setActiveOnClick?: boolean;
    hidden?: boolean;
};

type EntityCommandGroupConfig = {
    [key: string]: SimpleCommandConfig;
};


export interface EntityCommandGroupProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    data: EntityData<TEntity>;
    index: number;
    commands?: EntityCommandGroupConfig;
    defaultConfig?: {
        setActiveOnClick?: boolean;
        useCallback?: boolean;
    };
    customCommands?: Record<string, React.ComponentType<any>>;
    className?: string;
    onCommandExecute?: (
        actionName: EntityCommandName,
        context: EntityCommandContext<TEntity>
    ) => Promise<void>;
    onSetActiveItem?: (index: number) => void;
}

const defaultEntityCommands: EntityCommandName[] = ['expand', 'view', 'edit', 'delete'];

export function EntityCommandGroup<TEntity extends EntityKeys>(
    {
        entityKey,
        data,
        index,
        commands = {},
        defaultConfig = {setActiveOnClick: true},
        customCommands = {},
        className,
        onCommandExecute,
        onSetActiveItem
    }: EntityCommandGroupProps<TEntity>) {
    const dispatch = useAppDispatch();
    const {toast} = useToast();

    const entitySelectors = createEntitySelectors(entityKey);
    const entityActions = createEntityActions(entityKey);

    const activeItem = useAppSelector(entitySelectors.selectSelectedItem);
    const loading = useAppSelector(entitySelectors.selectLoading);

    const handleSetActiveItem = useCallback((index: number) => {
        if (onSetActiveItem) {
            onSetActiveItem(index);
        } else {
            dispatch(entityActions.setSelectedItem({index}));
        }
    }, [dispatch, entityActions, onSetActiveItem]);

    const getCommandConfig = (actionName: EntityCommandName): SimpleCommandConfig & {
        hidden?: boolean;
        setActiveOnClick?: boolean;
        useCallback?: boolean;
    } => {
        const commandConfig = commands[actionName];

        if (typeof commandConfig === 'boolean') {
            return {
                useCallback: commandConfig,
                setActiveOnClick: defaultConfig.setActiveOnClick,
                hidden: false
            };
        }

        return {
            ...defaultConfig,
            ...commandConfig,
            hidden: commandConfig?.hidden ?? false
        };
    };

    const commandList = Object.keys(commands).length > 0
                        ? Object.keys(commands) as EntityCommandName[]
                        : defaultEntityCommands;

    const baseCommands = createEntityCommands(entityKey);
    const allCommands = {
        ...baseCommands,
        ...customCommands
    };

    const handleCommandExecute = async (
        actionName: EntityCommandName,
        context: EntityCommandContext<TEntity>
    ) => {
        const config = getCommandConfig(actionName);

        try {
            if (config.setActiveOnClick) {
                handleSetActiveItem(index);
            }

            if (config.useCallback && onCommandExecute) {
                await onCommandExecute(actionName, context);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: `Failed to execute ${actionName}: ${(error as Error).message}`
            });
        }
    };


    return (
        <div className={cn("flex gap-1 items-center justify-end", className)}>
            {commandList.map(actionName => {
                const CommandComponent = allCommands[actionName];
                if (!CommandComponent) return null;

                const config = getCommandConfig(actionName);
                if (config.hidden) return null;

                return (
                    <CommandComponent
                        key={actionName}
                        data={data}
                        index={index}
                        onExecute={config.useCallback
                                   ? (context) => handleCommandExecute(actionName, context)
                                   : undefined}
                    />
                );
            })}
        </div>
    );
}

export function EntityActionCell<TEntity extends EntityKeys>(
    commandGropuProps: EntityCommandGroupProps<TEntity>
) {
    return (
        <td className="p-2">
            <EntityCommandGroup {...commandGropuProps} />
        </td>
    );
}

export interface QuickEntityCommandGroupProps<TEntity extends EntityKeys>
    extends Omit<EntityCommandGroupProps<TEntity>, 'commands'> {
    show: EntityCommandName[];
    useCallbacks?: boolean | EntityCommandName[];
    setActiveOnClick?: boolean | EntityCommandName[];
}

export function QuickEntityCommandGroup<TEntity extends EntityKeys>(
    {
        show,
        useCallbacks = false,
        setActiveOnClick = true,
        ...props
    }: QuickEntityCommandGroupProps<TEntity>) {
    const commands = show.reduce<EntityCommandGroupConfig>((acc, actionName) => {
        const useCallback = Array.isArray(useCallbacks)
                            ? useCallbacks.includes(actionName)
                            : useCallbacks;

        const shouldSetActive = Array.isArray(setActiveOnClick)
                                ? setActiveOnClick.includes(actionName)
                                : setActiveOnClick;

        acc[actionName] = {
            useCallback,
            setActiveOnClick: shouldSetActive
        };
        return acc;
    }, {});

    return <EntityCommandGroup commands={commands} {...props} />;
}

// Usage examples:

// 1. Basic usage in a table cell
const TableExample = <TEntity extends EntityKeys>(
    {
        entityKey,
        row,
        index
    }: {
        entityKey: TEntity;
        row: EntityData<TEntity>;
        index: number;
    }) => (
    <EntityActionCell
        entityKey={entityKey}
        data={row}
        index={index}
        commands={{
            view: true,
            edit: {useCallback: true, setActiveOnClick: true},
            delete: {useCallback: true}
        }}
        onCommandExecute={async (actionName, context) => {
            console.log(`Executing ${actionName}:`, context);
        }}
    />
);

// 2. Quick usage with specific commands
const QuickExample = <TEntity extends EntityKeys>(
    {
        entityKey,
        row,
        index
    }: {
        entityKey: TEntity;
        row: EntityData<TEntity>;
        index: number;
    }) => (
    <QuickEntityCommandGroup
        entityKey={entityKey}
        data={row}
        index={index}
        show={['edit', 'delete', 'archive']}
        useCallbacks={['delete', 'archive']}
        setActiveOnClick={['edit', 'view']}
    />
);

const CustomCommandExample = <TEntity extends EntityKeys>(
    {
        entityKey,
        row,
        index
    }: {
        entityKey: TEntity;
        row: EntityData<TEntity>;
        index: number;
    }) => {
    const CustomCommand = createEntityCommand<TEntity>({
        name: 'custom',
        entityKey,
        type: 'entity',
        scope: 'single',
        icon: <Plus className="h-4 w-4"/>,
        className: "text-primary",
        component: Button,
    });

    return (
        <EntityCommandGroup
            entityKey={entityKey}
            data={row}
            index={index}
            commands={{
                edit: true,
                custom: {useCallback: true}
            }}
            customCommands={{
                custom: CustomCommand
            }}
        />
    );
};


// Example usage:
const EntityTableActions = <TEntity extends EntityKeys>(
    {
        entityKey,
        data,
        index
    }: {
        entityKey: TEntity;
        data: EntityData<TEntity>;
        index: number;
    }) => {
    const commands = createEntityCommands(entityKey);

    return (
        <div className="flex gap-1">
            <commands.view data={data} index={index}/>
            <commands.edit data={data} index={index}/>
            <commands.delete
                data={data}
                index={index}
                onExecute={async (context) => {
                    // Custom delete handling
                    console.log('Custom delete:', context);
                }}
            />
        </div>
    );
};
