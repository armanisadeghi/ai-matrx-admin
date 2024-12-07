import {Code, Link, ListCheck} from "lucide-react";
import {
    PRESENTATION_WRAPPERS, PRESENTATION_COMPONENT_TYPES, COMMAND_CATEGORIES, TRIGGER_TYPES, ICON_OPTIONS
} from "./action-config";
import EntityQuickReferenceList from "../../Entity/prewired-components/quick-reference/EntityQuickReferenceList";
import {QuickReferenceSidebar} from "@/app/(authenticated)/tests/crud-operations/components/QuickReferenceSidebar";
import RecordSelector from "@/components/matrx/ArmaniForm/action-system/action-components/RecordSelector";
import {JsonEditor} from "@/components/matrx/ArmaniForm/action-system/action-components/JsonEditor";


const PRESENTATION_COMPONENTS = {
    ENTITY_LIST: EntityQuickReferenceList,
    ENTITY_QUICK_SIDEBAR: QuickReferenceSidebar,
    RECORD_SELECTOR: RecordSelector,
    JSON_EDITOR: JsonEditor
}



export const ACTION_REGISTRY = {
    entityList: {
        label: 'Find a Record',
        actionType: COMMAND_CATEGORIES.DIRECT,
        actionConfig: {
            payload: {},
            onFieldChange: (field, value) => console.log('Value Changed... ', field, value),
        },

        triggerType: TRIGGER_TYPES.ICON,
        icon: ICON_OPTIONS.LINK,
        triggerProps: {
            tooltip: 'Find a Record',
            onTriggerStart: (field, value) => console.log('Action Triggered... ', field, value),
            onTriggerEnd: (field, value) => console.log('Action Triggered... ', field, value),
            data: {},
            disabled: null,
        },

        commandType: null,
        commandProps: {
            onCommandExecute: (command, payload) => console.log('Command Executed...', command, payload),
            onCommandSuccess: (command, commandResults) => console.log('Command Success...', commandResults),
            onCommandError: (command, error) => console.log('Command Error...', error),
            commandCallback: (commandUpdate) => console.log('Command Results...', commandUpdate),
        },

        presentationWrapper: PRESENTATION_WRAPPERS.SHEET,
        presentationWrapperProps: {
            onPresentationStart: () => console.log('Presentation Started...'),
            onPresentationEnd: (presentationResults) => console.log('Presentation Ended...', presentationResults),
            title: 'Choose an item from the list',
            side: 'right',
            className: 'min-w-[400px]'
        },
        presentationComponent: PRESENTATION_COMPONENTS.ENTITY_LIST,
        presentationComponentProps: {
            onCreateEntityClick: () => console.log('Create New Entity Button Clicked...',),
            showCreateNewButton: true,
            className: '',
            density: 'normal',
            animationPreset: 'smooth',
        },
        iconOptionalConcept: {
            label: 'Find a Record',
            actionType: COMMAND_CATEGORIES.DIRECT,
            triggerType: TRIGGER_TYPES.ICON,
            icon: {
                type: 'ADVANCED',
                props: {
                    // Static props
                    name: { type: 'static', value: 'link' },
                    size: { type: 'static', value: 24 },
                    tooltip: { type: 'static', value: 'Find a Record' },

                    // Dynamic props
                    disabled: { type: 'dynamic', value: 'context.isDisabled' },
                    customData: { type: 'dynamic', value: 'context.recordData' },

                    // Mixed static/dynamic callbacks
                    onClick: {
                        type: 'dynamic',
                        value: 'handlers.onClick'
                    },
                    onResult: {
                        type: 'dynamic',
                        value: 'handlers.onResult'
                    }
                }
            },

            entityQuickSidebar: {
                type: 'hello',
                icon: ListCheck,
                label: 'Select Record',
                presentation: PRESENTATION_WRAPPERS.SHEET,
                triggerType: TRIGGER_TYPES.ICON,
                component: QuickReferenceSidebar,
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
                actionType: COMMAND_CATEGORIES.DIRECT,
                actionConfig: {
                    actionType: 'SEARCH_RECORDS',
                    payload: {}
                },
                props: {
                    onChange: (inputValue) => console.log('Search records', inputValue)
                }
            },

            recordSelectorAction: {
                type: 'hi',
                icon: Link,
                label: 'Select Record',
                presentation: PRESENTATION_WRAPPERS.SHEET,
                triggerType: TRIGGER_TYPES.BUTTON,
                component: RecordSelector,
                containerProps: {
                    title: 'Select Related Record',
                    side: 'right',
                    className: 'min-w-[400px]'
                },
                actionType: COMMAND_CATEGORIES.DIRECT,
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
                presentation: PRESENTATION_WRAPPERS.MODAL,
                triggerType: TRIGGER_TYPES.ICON,
                component: JsonEditor,
                containerProps: {
                    title: 'Edit JSON',
                    className: 'max-w-4xl'
                },
                actionType: COMMAND_CATEGORIES.DIRECT,
                actionConfig: {
                    handler: (field, value) => console.log('Edit JSON', field, value)
                },
                props: {
                    onSearch: (searchTerm) => console.log('Search records', searchTerm)
                }

            }
        }
    }
};
