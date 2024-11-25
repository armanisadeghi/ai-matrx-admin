import {PRESENTATION_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/presentation";
import {TRIGGER_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/triggers";
import {ACTION_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/action-components/actionComponentRegistry";

const REDUX_ACTIONS = {

}

const HOOK_ACTIONS = {

}

const COMMAND_ACTIONS = {

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
interface ComponentConfig {
    resource: ActionComponent;
    propDefinitions: PropDefinitions;
    handlers?: Record<string, HandlerDefinition>;
}

interface ReduxActionConfig {
    resource: ReduxActionType;
    propDefinitions: PropDefinitions;
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

interface PropSource {
    type: 'context' | 'computed' | 'redux' | 'direct';
    path?: string;
    resolver?: string;
    value?: any;
}

interface PropDefinitions {
    staticProps: Record<string, any>;
    requiredProps: Record<string, PropSource>;
    optionalProps: Record<string, any>;
}

interface HandlerDefinition {
    type: 'function' | 'event' | 'callback';
    handler?: (...args: any[]) => any;
    resultHandler?: string;
}





interface ActionRegistryEntry {
    actionType: ActionType;
    presentationConfig: ComponentConfig;

    triggerConfig: ComponentConfig;

    actionComponentConfig: ComponentConfig & {
        onResultHandler?: string;
    };
    directActionConfig: {
        resource: string | null;
        propDefinitions: PropDefinitions;
        handlers?: Record<string, HandlerDefinition>;
    };
    reduxActionConfig: {
        resource: string | null;
        propDefinitions: PropDefinitions;
        handlers?: Record<string, HandlerDefinition>;
    };
    hookActionConfig: {
        resource: string | null;
        propDefinitions: PropDefinitions;
        handlers?: Record<string, HandlerDefinition>;
    };
    commandActionConfig: {
        resource: string | null;
        propDefinitions: PropDefinitions;
        handlers?: Record<string, HandlerDefinition>;
    };
}
