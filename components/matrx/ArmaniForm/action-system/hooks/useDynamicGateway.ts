import { useState, useRef, useCallback } from 'react';
import {ACTION_TYPES, ActionRegistryEntry} from "../types";


interface HandlerDefinition {
    type: 'event' | 'callback' | 'async';
    handler: (...args: any[]) => any;
    isResultHandler?: boolean;
    metadata?: {
        description?: string;
        parameters?: Record<string, any>;
        returnType?: string;
    };
}
export interface PropSource {
    type: 'context' | 'redux' | 'computed' | 'direct' | 'static';
    path?: string;
    resolver?: string;
    value?: any;
}

export interface PropDefinitions {
    staticProps: Record<string, any>;
    requiredProps: Record<string, PropSource>;
    optionalProps: Record<string, any>;
}

export type RegistryKey = `${string}:${string}:${string}`; // resource:component:name
export type HandlerRegistry = Map<RegistryKey, HandlerDefinition>;
export type PropRegistry = Map<RegistryKey, PropSource>;

/**
 * Enhanced gateway system that works with the Matrix action system
 */
export const useActionGateway = () => {
    const [version, setVersion] = useState(0);
    const handlersRef = useRef<HandlerRegistry>(new Map());
    const propsRef = useRef<PropRegistry>(new Map());

    const createRegistryKey = (
        resource: string,
        component: string,
        name: string
    ): RegistryKey => `${resource}:${component}:${name}`;

    /**
     * Register all configurations from an action
     */
    const registerAction = useCallback((
        actionRegistryKey: string,
        actionConfig: ActionRegistryEntry
    ) => {
        const configs = [
            {
                type: 'presentation',
                config: actionConfig.presentationConfig
            },
            {
                type: 'trigger',
                config: actionConfig.triggerConfig
            },
        ];

        // Add the specific action config based on type
        switch (actionConfig.actionType) {
            case ACTION_TYPES.COMPONENT:
                configs.push({
                    type: 'component',
                    config: actionConfig.actionComponentConfig
                });
                break;
            case ACTION_TYPES.REDUX:
                configs.push({
                    type: 'redux',
                    config: actionConfig.reduxActionConfig
                });
                break;
            case ACTION_TYPES.HOOK:
                configs.push({
                    type: 'hook',
                    config: actionConfig.hookActionConfig
                });
                break;
            case ACTION_TYPES.COMMAND:
                configs.push({
                    type: 'command',
                    config: actionConfig.commandActionConfig
                });
                break;
            case ACTION_TYPES.DIRECT:
                configs.push({
                    type: 'direct',
                    config: actionConfig.directActionConfig
                });
                break;
        }

        // Register all configs
        configs.forEach(({ type, config }) => {
            if (!config || !config.resource) return;

            // Register props
            if (config.propDefinitions) {
                // Register static props
                Object.entries(config.propDefinitions.staticProps).forEach(
                    ([propName, value]) => {
                        const key = createRegistryKey(
                            config.resource,
                            type,
                            propName
                        );
                        propsRef.current.set(key, {
                            type: 'static',
                            value
                        });
                    }
                );

                // Register required props
                Object.entries(config.propDefinitions.requiredProps).forEach(
                    ([propName, source]) => {
                        const key = createRegistryKey(
                            config.resource,
                            type,
                            propName
                        );
                        propsRef.current.set(key, source);
                    }
                );

                // Register optional props with their default values
                Object.entries(config.propDefinitions.optionalProps).forEach(
                    ([propName, value]) => {
                        const key = createRegistryKey(
                            config.resource,
                            type,
                            propName
                        );
                        propsRef.current.set(key, {
                            type: 'static',
                            value
                        });
                    }
                );
            }

            // Register handlers
            if (config.handlers) {
                Object.entries(config.handlers).forEach(
                    ([handlerName, handler]) => {
                        const key = createRegistryKey(
                            config.resource,
                            type,
                            handlerName
                        );
                        handlersRef.current.set(key, handler);
                    }
                );
            }
        });

        setVersion(v => v + 1);

        // Return cleanup function
        return () => {
            configs.forEach(({ type, config }) => {
                if (!config || !config.resource) return;

                // Clean up props and handlers
                const allKeys = [...propsRef.current.keys(), ...handlersRef.current.keys()]
                    .filter(key => key.startsWith(`${config.resource}:${type}:`));

                allKeys.forEach(key => {
                    propsRef.current.delete(key);
                    handlersRef.current.delete(key);
                });
            });
            setVersion(v => v + 1);
        };
    }, []);

    /**
     * Resolve a prop value based on its source
     */
    const resolveProp = useCallback(async (
        resource: string,
        componentType: string,
        propName: string,
        context?: any
    ) => {
        const key = createRegistryKey(resource, componentType, propName);
        const source = propsRef.current.get(key);

        if (!source) return undefined;

        switch (source.type) {
            case 'static':
                return source.value;

            case 'context':
                if (!context || !source.path) return undefined;
                return source.path.split('.').reduce(
                    (acc, part) => acc && acc[part],
                    context
                );

            case 'computed':
                if (!source.resolver) return undefined;
                const resolver = handlersRef.current.get(
                    createRegistryKey(resource, componentType, source.resolver)
                );
                if (!resolver) return undefined;
                return resolver.handler(context);

            default:
                return source.value;
        }
    }, []);

    /**
     * Get a handler by its key
     */
    const getHandler = useCallback((
        resource: string,
        componentType: string,
        handlerName: string
    ): HandlerDefinition | undefined => {
        const key = createRegistryKey(resource, componentType, handlerName);
        return handlersRef.current.get(key);
    }, []);

    /**
     * Resolve all props for a component
     */
    const resolveAllProps = useCallback(async (
        resource: string,
        componentType: string,
        context?: any
    ): Promise<Record<string, any>> => {
        const prefix = `${resource}:${componentType}:`;
        const props: Record<string, any> = {};

        for (const [key] of propsRef.current) {
            if (!key.startsWith(prefix)) continue;

            const propName = key.slice(prefix.length);
            props[propName] = await resolveProp(
                resource,
                componentType,
                propName,
                context
            );
        }

        return props;
    }, [resolveProp]);

    return {
        registerAction,
        resolveProp,
        resolveAllProps,
        getHandler,
        version
    };
};

