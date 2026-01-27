import {useCallback, useEffect, useMemo, useState} from "react";
import {ActionRegistryEntry} from "../types";
import {useActionGateway} from "@/components/matrx/ArmaniForm/action-system/hooks/useDynamicGateway";
import {ComponentRegistry} from "@/components/matrx/ArmaniForm/action-system/action-components/actionComponentRegistry";

interface PropDefinition {
    isRequired: boolean;
    type: 'context' | 'direct' | 'static' | 'computed';
    path?: string;
    resolver?: string;
    value?: any;
}

interface HandlerDefinition {
    type: 'callback' | 'event';
    handler: (...args: any[]) => any;
    isResultHandler?: boolean;
    metadata?: {
        description?: string;
        parameters?: Record<string, any>;
        returnType?: string;
    };
}

interface ComponentDefinition {
    resource: React.ComponentType<any>;
    propDefinitions: Record<string, PropDefinition>;
    handlers: Record<string, HandlerDefinition>;
}

// Updated registration with proper handler mapping
export function registerComponent(
    key: string,
    definition: ComponentDefinition
) {
    const enhancedDefinition = {
        ...definition,
        handlers: Object.entries(definition.handlers).reduce((acc, [name, handler]) => ({
            ...acc,
            [name]: {
                ...handler,
                // Ensure handlers can access component context
                handler: (...args: any[]) => {
                    return handler.handler(...args);
                }
            }
        }), {})
    };

    ComponentRegistry.set(key, enhancedDefinition);
}

interface UseFieldActionsProps {
    field: any;
    matrxAction: ActionRegistryEntry[];
    value: any;
    onChange?: (value: any) => void;
    onActionComplete?: (value: any) => void;
}

// Now, let's create an enhanced hook that uses the gateway system
export const useFieldActions = (
    {
        field,
        matrxAction,
        value,
        onChange,
        onActionComplete
    }: UseFieldActionsProps) => {
    const [openStates, setOpenStates] = useState<Record<number, boolean>>({});
    const gateway = useActionGateway();
    const fieldContext = useMemo(() => ({field, value}), [field, value]);

    // Register the action when the component mounts
    useEffect(() => {
        const cleanupFns = matrxAction.map(action =>
            gateway.registerAction(
                action.actionComponentConfig?.resource || action.presentationConfig.resource || 'default',
                action
            )
        );

        return () => {
            cleanupFns.forEach(cleanup => cleanup());
        };
    }, [matrxAction, gateway]);

    const handleOpenChange = (index: number, open: boolean) => {
        setOpenStates(prev => ({
            ...prev,
            [index]: open
        }));
        onActionComplete?.(open);
    };

    const resolveActionProps = useCallback(async (
        action: ActionRegistryEntry,
        index: number
    ) => {
        const {actionComponentConfig, presentationConfig, triggerConfig} = action;

        // Resolve presentation props
        const presentationProps = await gateway.resolveAllProps(
            presentationConfig.resource || 'presentation',
            'presentation',
            fieldContext
        );

        // Resolve trigger props
        const triggerProps = await gateway.resolveAllProps(
            triggerConfig.resource || 'trigger',
            'trigger',
            fieldContext
        );

        // Resolve action component props
        const actionComponentProps = actionComponentConfig ?
                                     await gateway.resolveAllProps(
                                         actionComponentConfig.resource || 'component',
                                         'component',
                                         fieldContext
                                     ) : null;

        // Get and wrap handlers
        const resolveHandler = (resource: string, handlerName: string) => {
            const handler = gateway.getHandler(resource, 'component', handlerName);
            if (!handler) return undefined;

            return (...args: any[]) => {
                const result = handler.handler(...args);
                // If this is a result handler, call onChange
                if (handler.isResultHandler) {
                    onChange(result);
                    handleOpenChange(index, false);
                }
                return result;
            };
        };

        // Add handlers to props
        if (actionComponentConfig && actionComponentProps) {
            const onSelectionChange = resolveHandler(
                actionComponentConfig.resource || 'component',
                'onSelectionChange'
            );
            const onAnyChange = resolveHandler(
                actionComponentConfig.resource || 'component',
                'onAnyChange'
            );

            if (onSelectionChange) {
                actionComponentProps.onSelectionChange = onSelectionChange;
            }
            if (onAnyChange) {
                actionComponentProps.onAnyChange = onAnyChange;
            }
        }

        return {
            presentationProps: {
                ...presentationProps,
                onOpenChange: (open: boolean) => handleOpenChange(index, open),
                isOpen: openStates[index] || false
            },
            triggerProps: {
                ...triggerProps,
                onClick: () => handleOpenChange(index, true)
            },
            actionComponentProps
        };
    }, [gateway, fieldContext, handleOpenChange, onChange]);

    // Resolve props for all actions
    const resolveAllActionProps = useCallback(async () => {
        const resolvedProps = await Promise.all(
            matrxAction.map((action, index) =>
                resolveActionProps(action, index)
            )
        );
        return resolvedProps;
    }, [matrxAction, resolveActionProps]);

    // Use suspense pattern for async prop resolution
    const [props, setProps] = useState<any[]>([]);
    useEffect(() => {
        resolveAllActionProps().then(setProps);
    }, [resolveAllActionProps]);

    return props;
};
