import {Code, Link, ListCheck} from "lucide-react";
import {
    ACTION_TYPES,
} from "./types";
import {useAppDispatch} from "@/lib/redux/hooks";
import {ActionRegistry, ActionRegistryEntry} from "./types";
import {ACTION_COMPONENTS} from "./action-components/actionComponentRegistry";
import {PRESENTATION_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/presentation";
import {TRIGGER_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/triggers";

export const ENTITY_QUICK_SIDEBAR_ACTION: ActionRegistryEntry = {
    actionType: ACTION_TYPES.COMPONENT,
    presentationConfig: {
        component: PRESENTATION_COMPONENTS.SHEET,
        props: {
            title: 'Choose an item from the list',
            side: 'right',
            className: 'min-w-[400px]',
            variant: 'primary',
        },
    },
    triggerConfig: {
        component: TRIGGER_COMPONENTS.ICON,
        props: {
            label: 'Choose A Record',
            iconName: "listCheck",
            variant: 'secondary',
            className: 'mr-2',
        },
    },
    actionComponentConfig: {
        component: ACTION_COMPONENTS.QUICK_LIST,
        onResultHandler: 'onSelectionChange',
        props: {
            onCreateEntityClick: () =>
                console.log('Create New Entity Button Clicked...'),
            showCreateNewButton: true,
            className: '',
            density: 'normal',
            animationPreset: 'smooth',
        },
        propConfig: {
            staticProps: ['onResultHandler'],
            requiredProps: {
                entitykey: {
                    source: 'field.componentProps.entityName'
                },
            },
            optionalProps: [
                'onCreateEntityClick',
                'showCreateNewButton',
                'className',
                'density',
                'animationPreset'
            ],
        },
    },
    directActionConfig: null,
    reduxActionConfig: null,
    hookActionConfig: null,
    commandActionConfig: null,
};


export const RECORD_SELECTOR_ACTION: ActionRegistryEntry = {
    actionType: ACTION_TYPES.DIRECT,
    presentationConfig: {
        component: PRESENTATION_COMPONENTS.SHEET,
        props: {
            title: 'Select Related Record',
            side: 'right',
            className: 'min-w-[400px]',
        },
    },
    triggerConfig: {
        component: TRIGGER_COMPONENTS.BUTTON,
        props: {
            label: 'Select Record',
            iconName: 'link',
        },
    },
    actionComponentConfig: {
        component: ACTION_COMPONENTS.RECORD_SELECTOR,
        props: {
            onChange: (inputValue) => console.log('Search records', inputValue),
        },
    },
    directActionConfig: {
        handler: (field, value) => console.log('Direct action executed', field, value),
        props: {entityName: 'entityName', field: 'field'},
    },
    reduxActionConfig: null,
    hookActionConfig: null,
    commandActionConfig: null,
};

export const JSON_EDITOR_ACTION: ActionRegistryEntry = {
    actionType: ACTION_TYPES.DIRECT,
    presentationConfig: {
        component: PRESENTATION_COMPONENTS.MODAL,
        props: {
            title: 'Edit JSON',
            className: 'max-w-4xl',
        },
    },
    triggerConfig: {
        component: TRIGGER_COMPONENTS.ICON,
        props: {
            label: 'Edit JSON',
            iconName: "code",
        },
    },
    actionComponentConfig: {
        component: ACTION_COMPONENTS.JSON_EDITOR,
        props: {
            onSearch: (searchTerm) => console.log('Search records', searchTerm),
        },
    },
    directActionConfig: {
        handler: (field, value) => console.log('Edit JSON', field, value),
    },
    reduxActionConfig: null,
    hookActionConfig: null,
    commandActionConfig: null,
};

export const ENTITY_LIST_ACTION: ActionRegistryEntry = {
    actionType: ACTION_TYPES.DIRECT,
    presentationConfig: {
        component: PRESENTATION_COMPONENTS.SHEET,
        props: {
            title: 'Choose an item from the list',
            side: 'right',
            className: 'min-w-[400px]',
        },
    },
    triggerConfig: {
        component: TRIGGER_COMPONENTS.ICON,
        props: {
            label: 'Select Record',
            iconName: "link",
            className: 'mr-2',
        },
    },
    actionComponentConfig: {
        component: ACTION_COMPONENTS.QUICK_LIST,
        props: {
            onCreateEntityClick: () =>
                console.log('Create New Entity Button Clicked...'),
            showCreateNewButton: true,
            className: '',
            density: 'normal',
            animationPreset: 'smooth',
        },
    },
    directActionConfig: {
        handler: (field, value) =>
            console.log('Direct action executed', field, value),
    },
    reduxActionConfig: null,
    hookActionConfig: null,
    commandActionConfig: null,
};

export const ACTION_REGISTRY: ActionRegistry = {
    entityQuickSidebar: ENTITY_QUICK_SIDEBAR_ACTION,
    entityList: ENTITY_LIST_ACTION,
    recordSelectorAction: RECORD_SELECTOR_ACTION,
    jsonEditor: JSON_EDITOR_ACTION,
};


export function createMatrxActions(actionRegistryKeys) {
    const dispatch = useAppDispatch(); // Redux dispatch function

    return actionRegistryKeys.map((actionRegistryKey) => {
        const actionConfig = ACTION_REGISTRY[actionRegistryKey];

        const baseAction = {
            actionType: actionConfig.actionType,
            presentationConfig: actionConfig.presentationConfig,
            triggerConfig: actionConfig.triggerConfig,
        };

        switch (actionConfig.actionType) {
            case ACTION_TYPES.REDUX:
                return {
                    ...baseAction,
                    reduxActionConfig: {
                        ...actionConfig.reduxActionConfig,
                        handler: (field, value) =>
                            dispatch({
                                type: actionConfig.reduxActionConfig.actionType,
                                payload: {
                                    field,
                                    value,
                                    ...actionConfig.reduxActionConfig.payload,
                                },
                            }),
                    },
                };

            case ACTION_TYPES.HOOK:
                return {
                    ...baseAction,
                    hookActionConfig: actionConfig.hookActionConfig,
                };

            case ACTION_TYPES.COMMAND:
                return {
                    ...baseAction,
                    commandActionConfig: actionConfig.commandActionConfig,
                };

            case ACTION_TYPES.DIRECT:
                return {
                    ...baseAction,
                    directActionConfig: actionConfig.directActionConfig,
                };

            case ACTION_TYPES.COMPONENT:
                return {
                    ...baseAction,
                    actionComponentConfig: actionConfig.actionComponentConfig,
                };

            default:
                throw new Error(
                    `Unrecognized action type: "${actionConfig.actionType}" for key: "${actionRegistryKey}".`
                );
        }
    });
}


export function createAllActions() {
    const dispatch = useAppDispatch();

    const createActionHandler = (type, config) => {
        if (type === ACTION_TYPES.REDUX) {
            return (field, value) =>
                dispatch({
                    type: config?.actionType,
                    payload: {field, value, ...config?.payload},
                });
        }
        if (type === ACTION_TYPES.DIRECT) {
            return config?.handler || (() => console.log('No handler provided'));
        }
        return () => console.log('Action type not implemented');
    };

    return Object.fromEntries(
        Object.entries(ACTION_REGISTRY).map(([key, actionConfig]) => [
            key,
            {
                ...actionConfig,
                handleAction: createActionHandler(
                    actionConfig.actionType,
                    actionConfig.directActionConfig || actionConfig.reduxActionConfig
                ),
            },
        ])
    );
}


export function mapFields(fieldDefinitions) {
    const actionMap = createAllActions();

    const generateId = () =>
        crypto.randomUUID?.() || `field-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const processField = (field) => {
        const {
            id = generateId(),
            label,
            value = '',
            dataType = 'text',
            type = 'simple',
            componentProps = {},
            inlineFields = [],
            actionKeys = [],
            defaultComponent = 'input',
            subComponent = null,
            ...rest
        } = field;

        return {
            id,
            label,
            value,
            dataType,
            type,
            componentProps,
            defaultComponent,
            subComponent,
            inlineFields: inlineFields.map(processField),
            actions: actionKeys
                .map((actionKey) => actionMap[actionKey] || null)
                .filter(Boolean),
            ...rest,
        };
    };

    return fieldDefinitions.map(processField);
}


/*
const ACTION_REGISTRY_OLD = {
    entityList: {
        icon: Link,
        label: 'Select Record',
        presentation: PRESENTATION_TYPES.SHEET,
        triggerType: TRIGGER_TYPES.ICON,
        component: EntityQuickReferenceList,
        directComponentProps: {
            onCreateEntityClick: () => console.log('Create New Entity Button Clicked...',),
            showCreateNewButton: true,
            className: '',
            density: 'normal',
            animationPreset: 'smooth',
        },
        containerProps: {
            title: 'Choose an item from the list',
            side: 'right',
            className: 'min-w-[400px]'
        },
        actionType: ACTION_TYPES.DIRECT,
        actionConfig: {
            actionType: 'SEARCH_RECORDS',
            payload: {}
        },
        props: {
            onChange: (inputValue) => console.log('Search records', inputValue)
        }
    },
    entityQuickSidebar: {
        actionType: ACTION_TYPES.DIRECT,
        presentationConfig: {
            component: PRESENTATION_TYPES.SHEET,
            props: {
                title: 'Choose an item from the list',
                side: 'right',
                className: 'min-w-[400px]'
            },
        },
        triggerConfig: {
            component: TRIGGER_TYPES.ICON,
            props: {
                label: 'Choose A Record',
                icon: ListCheck,
                variant: 'primary',
                className: 'mr-2'
            },
        },
        actionComponentConfig: {
            component: QuickReferenceSidebar,
            onResultHandler: 'onSelectionChange',
            props: {
                onCreateEntityClick: () => console.log('Create New Entity Button Clicked...',),
                showCreateNewButton: true,
                className: '',
                density: 'normal',
                animationPreset: 'smooth',
            },
        },
        reduxActionConfig: null,
        hookActionConfig: null,
        commandActionConfig: null,
        directActionConfig: null,

        icon: ListCheck,
        label: 'Choose Record',

        presentation: PRESENTATION_TYPES.SHEET,
        containerProps: {
            title: 'Choose an item from the list',
            side: 'right',
            className: 'min-w-[400px]'
        },

        triggerType: TRIGGER_TYPES.CHIP,
        triggerProps: {
            label: 'Choose Record',
            icon: ListCheck,
            variant: 'primary',
            className: 'mr-2'
        },
        component: EntityQuickListAction,
        onResultHandler: 'onSelectionChange',
        directComponentProps: {
            onCreateEntityClick: () => console.log('Create New Entity Button Clicked...',),
            showCreateNewButton: true,
            className: '',
            density: 'compact',
            animationPreset: 'smooth',
        },
        actionConfig: {
            actionType: 'SEARCH_RECORDS',
            payload: {}
        },
        props: {
            onChange: (inputValue) => console.log('Search records', inputValue)
        }
    },

    recordSelectorAction: {
        icon: Link,
        label: 'Select Record',
        presentation: PRESENTATION_TYPES.SHEET,
        triggerType: TRIGGER_TYPES.BUTTON,
        component: RecordSelector,
        containerProps: {
            title: 'Select Related Record',
            side: 'right',
            className: 'min-w-[400px]'
        },
        actionType: ACTION_TYPES.DIRECT,
        actionConfig: {
            actionType: 'SEARCH_RECORDS',
            payload: {}
        },
        props: {
            onChange: (inputValue) => console.log('Search records', inputValue)
        }
    },

    jsonEditor: {
        type: 'name',
        icon: Code,
        label: 'Edit JSON',
        presentation: PRESENTATION_TYPES.MODAL,
        triggerType: TRIGGER_TYPES.ICON,
        component: JsonEditor,
        containerProps: {
            title: 'Edit JSON',
            className: 'max-w-4xl'
        },
        actionType: ACTION_TYPES.DIRECT,
        actionConfig: {
            handler: (field, value) => console.log('Edit JSON', field, value)
        },
        props: {
            onSearch: (searchTerm) => console.log('Search records', searchTerm)
        }

    }
};


*/
