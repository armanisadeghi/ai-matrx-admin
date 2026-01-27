import {ACTION_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/action-components/actionComponentRegistry";
import {PRESENTATION_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/presentation";
import {TRIGGER_COMPONENTS, TriggerProps} from "@/components/matrx/ArmaniForm/action-system/triggers";

export const ACTION_TYPES = {
    REDUX: 'redux',
    HOOK: 'hook',
    COMMAND: 'command',
    DIRECT: 'direct',
    COMPONENT: 'component'
} as const;

export type PresentationType = typeof PRESENTATION_COMPONENTS[keyof typeof PRESENTATION_COMPONENTS];
export type TriggerType = typeof TRIGGER_COMPONENTS[keyof typeof TRIGGER_COMPONENTS];

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES];
export type ActionComponent = typeof ACTION_COMPONENTS[keyof typeof ACTION_COMPONENTS];

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

export interface HandlerDefinition {
    type: 'event' | 'callback' | 'async';
    handler: (...args: any[]) => any;
    isResultHandler?: boolean;
    metadata?: {
        description?: string;
        parameters?: Record<string, any>;
        returnType?: string;
    };
}

export interface PresentationConfig {
    component: PresentationType;
    props: Record<string, any>;
    // Extended properties for gateway system
    resource?: string;
    propDefinitions?: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

export interface TriggerConfig {
    component: TriggerType;
    props: TriggerProps;
    // Extended properties for gateway system
    resource?: string;
    propDefinitions?: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

export interface ActionComponentConfig {
    component: ActionComponent;
    onResultHandler?: string;
    props: Record<string, any>;
    propConfig?: any;
    // Extended properties for gateway system
    resource?: string;
    propDefinitions?: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

export interface ReduxActionConfig {
    actionType: string;
    payload?: Record<string, any>;
    props: Record<string, any>;
    // Extended properties for gateway system
    resource?: string;
    propDefinitions?: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

export interface HookActionConfig {
    handler: (...args: any[]) => void;
    props: Record<string, any>;
    // Extended properties for gateway system
    resource?: string;
    propDefinitions?: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

export interface CommandActionConfig {
    execute: () => void;
    props: Record<string, any>;
    // Extended properties for gateway system
    resource?: string;
    propDefinitions?: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

export interface DirectActionConfig {
    handler: (...args: unknown[]) => unknown;
    props?: Record<string, any>;
    // Extended properties for gateway system
    resource?: string;
    propDefinitions?: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}


export interface ActionRegistryEntry {
    actionType: ActionType;
    presentationConfig: PresentationConfig;
    triggerConfig: TriggerConfig;
    actionComponentConfig?: ActionComponentConfig;
    reduxActionConfig?: ReduxActionConfig;
    hookActionConfig?: HookActionConfig;
    commandActionConfig?: CommandActionConfig;
    directActionConfig?: DirectActionConfig;
}

export type ActionRegistry = Record<string, ActionRegistryEntry>;
