import {Code, Link, ListCheck} from "lucide-react";
import {
    ACTION_TYPES,
    PRESENTATION_TYPES,
    TRIGGER_TYPES
} from "./action-config";
import RecordSelector
    from "./RecordSelector";
import EntityQuickReferenceList
    from "@/components/matrx/Entity/prewired-components/quick-reference/EntityQuickReferenceList";
import {
    JsonEditor
} from "./JsonEditor";
import {QuickReferenceSidebar} from "@/app/(authenticated)/tests/crud-operations/components/QuickReferenceSidebar";
import EntityShowSelectedAccordion from "@/components/matrx/Entity/prewired-components/EntityShowSelectedAccordion";
import EntityQuickListAction from "./action-components/EntityQuickListAction";
import {useAppDispatch} from "@/lib/redux/hooks";

const ACTION_REGISTRY = {
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


export function createAllActions() {
    const dispatch = useAppDispatch();

    const createActionHandler = (type, config) => {
        if (type === ACTION_TYPES.REDUX) {
            return (field, value) => dispatch({
                type: config.actionType,
                payload: {field, value, ...config.payload}
            });
        }
        if (type === ACTION_TYPES.DIRECT) return config.handler;
        return () => console.log('Action not implemented');
    };
    return Object.fromEntries(
        Object.entries(ACTION_REGISTRY).map(([key, config]) => [
            key,
            {
                ...config,
                handleAction: createActionHandler(config.actionType, config.actionConfig),
            }
        ])
    );
}

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


export function mapFields(dispatch, fieldDefinitions) {
    const actionMap = createMatrxAction(dispatch);

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
