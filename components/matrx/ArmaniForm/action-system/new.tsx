import {PRESENTATION_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/presentation";
import {TRIGGER_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/triggers";
import {ACTION_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/action-components/actionComponentRegistry";

const REDUX_ACTIONS = {

}

const HOOK_ACTIONS = {

}

const COMMAND_ACTIONS = {

}

const DIRECT_ACTIONS = {

}

export const ACTION_TYPES = {
    REDUX: 'redux',
    HOOK: 'hook',
    COMMAND: 'command',
    DIRECT: 'direct',
    COMPONENT: 'component'
} as const;

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES];
export type PresentationType = typeof PRESENTATION_COMPONENTS[keyof typeof PRESENTATION_COMPONENTS];
export type TriggerType = typeof TRIGGER_COMPONENTS[keyof typeof TRIGGER_COMPONENTS];
export type ActionComponent = typeof ACTION_COMPONENTS[keyof typeof ACTION_COMPONENTS];
export type ReduxActionType = typeof REDUX_ACTIONS[keyof typeof REDUX_ACTIONS];
export type HookActionType = typeof HOOK_ACTIONS[keyof typeof HOOK_ACTIONS];
export type CommandActionType = typeof COMMAND_ACTIONS[keyof typeof COMMAND_ACTIONS];
export type DirectActionType = typeof DIRECT_ACTIONS[keyof typeof DIRECT_ACTIONS];

type ACTION_DEFINITION_TYPE = {
    ACTION_NAME: ActionType;
    PRESENTATION: PresentationType;
    TRIGGER: TriggerType;
    ACTION_RESOURCE: ActionComponent | ReduxActionType | HookActionType | CommandActionType;
}

interface PresentationConfig {
    resource: PresentationType;
    propDefinitions: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}
interface TriggerConfig {
    resource: TriggerType;
    propDefinitions: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}
interface ActionComponentConfig {
    resource: ActionComponent;
    propDefinitions: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

interface ReduxActionConfig {
    resource: ReduxActionType;
    payload: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

interface HookActionConfig {
    resource: HookActionType;
    propDefinitions: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

interface CommandActionConfig {
    resource: CommandActionType;
    propDefinitions: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

interface DirectActionConfig {
    resource: DirectActionType;
    propDefinitions: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

interface HandlerDefinition {
    type: 'event' | 'callback' | 'async';
    handler: (...args: any[]) => any;
}

interface PropSource {
    isRequired: boolean;
    type: 'context' | 'redux' | 'computed' | 'direct' | 'static';
    path?: string;
    resolver?: string;
    value?: any;
}

interface PropDefinitions {
    staticProps: Record<string, any>;
    requiredProps: Record<string, PropSource>;
    optionalProps: Record<string, any>;
}

export interface ActionRegistryEntry {
    actionType: ActionType;
    presentationConfig: PresentationConfig;
    triggerConfig: TriggerConfig;
    actionComponentConfig?: ActionComponentConfig | null;
    reduxActionConfig?: ReduxActionConfig | null;
    hookActionConfig?: HookActionConfig | null;
    commandActionConfig?: CommandActionConfig | null;
    directActionConfig?: DirectActionConfig | null;
}

export type ActionRegistry = Record<string, ActionRegistryEntry>;
