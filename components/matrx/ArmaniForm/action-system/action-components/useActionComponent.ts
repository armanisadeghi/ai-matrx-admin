import React, {ComponentType, useCallback, useRef, useState} from 'react';
import EntityQuickListAction from './EntityQuickListAction';

type PropType = 'context' | 'static' | 'direct' | 'computed';
type HandlerType = 'event' | 'callback' | 'async';

interface PropDefinition {
    isRequired: boolean;
    type: PropType;
    path?: string;
    resolver?: string;
    value?: any;
    description?: string;
}

interface HandlerDefinition {
    type: HandlerType;
    handler: (...args: any[]) => any;
    isResultHandler?: boolean;
    metadata?: {
        description?: string;
        parameters?: Record<string, any>;
        returnType?: string;
    };
}

interface ActionComponentDefinition<T = any> {
    resource: ComponentType<T>;
    propDefinitions: Record<string, PropDefinition>;
    handlers: Record<string, HandlerDefinition>;
}

// Modified registry type
export const ACTION_COMPONENTS_REGISTRY: Record<string, ActionComponentDefinition> = {
    QUICK_LIST: {
        resource: EntityQuickListAction,
        propDefinitions: {
            entitykey: {
                isRequired: true,
                type: 'context',
                path: 'field.componentProps.entityName',
                description: 'Entity key for data fetching'
            },
            showCreateNewButton: {
                isRequired: false,
                type: 'static',
                value: true,
                description: 'Show/hide create new button'
            },
            density: {
                isRequired: false,
                type: 'static',
                value: 'normal',
                description: 'UI density setting'
            },
            animationPreset: {
                isRequired: false,
                type: 'static',
                value: 'smooth',
                description: 'Animation style'
            }
        },
        handlers: {
            onSelectionChange: {
                type: 'callback',
                handler: (recordId: string | string[]) => recordId,
                isResultHandler: true,
                metadata: {
                    description: 'Handles final selection',
                    parameters: {
                        recordId: 'string | string[]'
                    },
                    returnType: 'void'
                }
            },
            onAnyChange: {
                type: 'event',
                handler: (
                    entityKey: string,
                    selectionMode: string,
                    selectedRecordIds: string[],
                    selectedRecords: Record<string, any>[]
                ) => {
                    // Handler implementation
                },
                metadata: {
                    description: 'Handles intermediate changes'
                }
            }
        }
    }
} as const;

const mergeDefinitions = (
    base: ActionComponentDefinition,
    overrides?: Partial<ActionComponentDefinition>
): ActionComponentDefinition => {
    if (!overrides) return base;

    return {
        resource: overrides.resource || base.resource,
        propDefinitions: {
            ...base.propDefinitions,
            ...overrides.propDefinitions
        },
        handlers: {
            ...base.handlers,
            ...overrides.handlers
        }
    };
};

// Hook for managing action components
export const useActionComponent = () => {
    const [version, setVersion] = useState(0);
    const componentsRef = useRef(new Map<ComponentType<any>, ActionComponentDefinition>());

    const registerComponent = useCallback((
        Component: ComponentType<any>,
        baseDefinition: ActionComponentDefinition,
        overrides?: Partial<ActionComponentDefinition>
    ) => {
        const mergedDefinition = mergeDefinitions(baseDefinition, overrides);
        componentsRef.current.set(Component, mergedDefinition);
        setVersion(v => v + 1);

        return () => {
            componentsRef.current.delete(Component);
            setVersion(v => v + 1);
        };
    }, []);

    const resolveProps = useCallback(async (
        Component: ComponentType<any>,
        context?: any
    ) => {
        const definition = componentsRef.current.get(Component);
        if (!definition) throw new Error(`Component not registered`);

        const resolvedProps: Record<string, any> = {};

        for (const [propName, propDef] of Object.entries(definition.propDefinitions)) {
            try {
                switch (propDef.type) {
                    case 'context':
                        if (propDef.path && context) {
                            resolvedProps[propName] = propDef.path
                                .split('.')
                                .reduce((acc, part) => acc?.[part], context);
                        }
                        break;
                    case 'static':
                        resolvedProps[propName] = propDef.value;
                        break;
                    case 'direct':
                        resolvedProps[propName] = propDef.value;
                        break;
                    case 'computed':
                        if (propDef.resolver && definition.handlers[propDef.resolver]) {
                            resolvedProps[propName] = await definition.handlers[propDef.resolver].handler(context);
                        }
                        break;
                }

                if (propDef.isRequired && resolvedProps[propName] === undefined) {
                    throw new Error(`Required prop ${propName} not resolved`);
                }
            } catch (error) {
                if (propDef.isRequired) throw error;
                resolvedProps[propName] = propDef.value; // Fallback to default
            }
        }

        return resolvedProps;
    }, []);

    const getHandlers = useCallback((
        Component: ComponentType<any>, // Fixed parameter type
        context?: any
    ) => {
        const definition = componentsRef.current.get(Component);
        if (!definition) throw new Error(`Component not registered`);

        const boundHandlers: Record<string, (...args: any[]) => any> = {};

        for (const [name, handlerDef] of Object.entries(definition.handlers)) {
            boundHandlers[name] = (...args: any[]) => {
                return handlerDef.handler.apply(null, [...args, context]);
            };
        }

        return boundHandlers;
    }, []);

    const getResultHandler = useCallback((
        Component: ComponentType<any> // Fixed parameter type
    ) => {
        const definition = componentsRef.current.get(Component);
        if (!definition) return undefined;

        const resultHandler = Object.entries(definition.handlers)
            .find(([_, handler]) => handler.isResultHandler);

        return resultHandler ? resultHandler[1] : undefined;
    }, []);

    return {
        registerComponent,
        resolveProps,
        getHandlers,
        getResultHandler,
        version
    };
};
