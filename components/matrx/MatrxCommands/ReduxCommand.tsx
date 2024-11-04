import {ReactNode} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {Dispatch} from '@reduxjs/toolkit';
import IconButton from "@/components/ui/IconButton";
import {TrashIcon} from "lucide-react";
import {CommandContext, BaseCommandConfig, CommandResult} from "@/components/matrx/MatrxCommands/types";
import {showConfirmDialog, showErrorToast} from "@/components/matrx/MatrxCommands/helpers";

// Redux-specific context with slice information
interface ReduxCommandContext<
    TState = unknown,
    TPayload = unknown
> extends CommandContext {
    sliceName: string;
    key: string | number;
    state: TState;
    dispatch: Dispatch;
    payload?: TPayload;
    relatedKeys?: (string | number)[];
}

// Base configuration for Redux commands
interface ReduxCommandConfig<
    TState = unknown,
    TPayload = unknown
> extends BaseCommandConfig {
    slice: {
        name: string;
        selector: (state: any, key: string | number) => TState;
        action: string | ((payload: TPayload) => any);
    };

    isVisible?: (context: ReduxCommandContext<TState, TPayload>) => boolean;
    isEnabled?: (context: ReduxCommandContext<TState, TPayload>) => boolean;
    hasPermission?: (context: ReduxCommandContext<TState, TPayload>) => boolean;

    onBeforeExecute?: (context: ReduxCommandContext<TState, TPayload>) => Promise<boolean>;
    onExecute?: (context: ReduxCommandContext<TState, TPayload>) => Promise<void>;
    onAfterExecuteRedux?: (context: ReduxCommandContext<TState, TPayload>) => Promise<void>; // Redux-specific post-execution
    onError?: (error: Error, context: ReduxCommandContext<TState, TPayload>) => void;

    parentHandler?: (context: ReduxCommandContext<TState, TPayload>) => Promise<void>;
}

// Create a Redux command factory
function createReduxCommand<TState = unknown, TPayload = unknown>(
    config: ReduxCommandConfig<TState, TPayload>
) {
    const CommandComponent: React.FC<{
        commandKey: string | number;
        relatedKeys?: (string | number)[];
        className?: string;
        disabled?: boolean;
        hidden?: boolean;
        onExecute?: (context: ReduxCommandContext<TState, TPayload>) => Promise<void>;
        children?: ReactNode;
    }> = (
        {
            commandKey,
            relatedKeys,
            className,
            disabled,
            hidden,
            onExecute,
            children
        }) => {
        const dispatch = useDispatch();
        const state = useSelector(state => config.slice.selector(state, commandKey));

        // Create context
        const context: ReduxCommandContext<TState, TPayload> = {
            sliceName: config.slice.name,
            key: commandKey,
            state,
            dispatch,
            relatedKeys
        };

        // Compute dynamic states
        const isVisible = !hidden && (config.isVisible?.(context) ?? true);
        const isEnabled = !disabled && (config.isEnabled?.(context) ?? true);
        const hasPermission = config.hasPermission?.(context) ?? true;

        // Handle command execution
// Handle command execution
        const handleExecute = async () => {
            try {
                if (!isEnabled || !hasPermission) return;

                if (config.onBeforeExecute) {
                    const shouldProceed = await config.onBeforeExecute(context);
                    if (!shouldProceed) return;
                }

                // Execute command
                if (onExecute) {
                    await onExecute(context);
                } else if (config.parentHandler) {
                    await config.parentHandler(context);
                } else if (config.onExecute) {
                    await config.onExecute(context);
                } else if (typeof config.slice.action === 'string') {
                    dispatch({type: config.slice.action, payload: {key: commandKey, ...context.payload}});
                } else if (typeof config.slice.action === 'function') {
                    dispatch(config.slice.action({key: commandKey, ...context.payload}));
                }

                // Post-execution: use Redux-specific or general callback
                if (config.onAfterExecuteRedux) {
                    await config.onAfterExecuteRedux(context);
                } else if (config.onAfterExecute) {
                    config.onAfterExecute({} as CommandResult<unknown>);
                }
            } catch (error) {
                if (config.onError) {
                    config.onError(error as Error, context);
                }
                throw error;
            }
        };

        if (!isVisible) return null;

        // Render the component
        return (
            <config.component
                onClick={handleExecute}
                disabled={!isEnabled || !hasPermission}
                className={className}
                tooltip={config.tooltip}
                icon={config.icon}
                label={config.label}
            >
                {children}
            </config.component>
        );
    };

    return CommandComponent;
}

// Example usage
interface EntityState {
    id: string;
    name: string;
    status: string;
}

const DeleteEntityCommand = createReduxCommand<EntityState>({
    name: 'deleteEntity',
    type: 'entity',
    scope: 'single',
    component: IconButton, // Your button component
    icon: <TrashIcon/>,
    tooltip: 'Delete Entity',

    slice: {
        name: 'entities',
        selector: (state, key) => state.entities[key],
        action: 'entities/delete'
    },

    // Visibility and permissions
    isVisible: (context) => context.state.status !== 'deleted',
    isEnabled: (context) => context.state.status === 'active',
    hasPermission: (context) => true, // Add your permission logic

    // Execution hooks
    onBeforeExecute: async (context) => {
        const confirmed = await showConfirmDialog('Are you sure?');
        return confirmed;
    },

    onError: (error, context) => {
        showErrorToast(`Failed to delete entity: ${error.message}`);
    }
});

// Usage in a component
const MyComponent = () => {
    return (
        <DeleteEntityCommand
            commandKey="entity-123"
            relatedKeys={['parent-456']}
            onExecute={async (context) => {
                // Custom handling if needed
                console.log('Custom delete handling', context);
            }}
        />
    );
};
