import DataTable from "@/components/matrx/Entity/DataTable/DataTable";
import RecordSelector
    from "./RecordSelector";
import {
    JsonEditor
} from "./JsonEditor";
import {QuickReferenceSidebar} from "@/app/(authenticated)/tests/crud-operations/components/QuickReferenceSidebar";
import EntityShowSelectedAccordion from "@/components/matrx/Entity/prewired-components/EntityShowSelectedAccordion";
import EntityQuickListAction from "./EntityQuickListAction";
import {ACTION_TYPES, ActionRegistryEntry} from "@/components/matrx/ArmaniForm/action-system/types";
import {PRESENTATION_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/presentation";
import {TRIGGER_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/triggers";
import {useCallback} from "react";

interface PropDefinition {
    isRequired: boolean;
    type: 'context' | 'direct' | 'static' | 'computed';
    path?: string;
    resolver?: string;
    value?: any;
    metadata?: {
        description?: string;
        valueType?: string;
        validation?: Record<string, any>;
    };
}

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

interface ComponentDefinition {
    resource: any;
    propDefinitions: Record<string, PropDefinition>;
    handlers: Record<string, HandlerDefinition>;
}

// Registry for predefined components
export const ComponentRegistry = new Map<string, ComponentDefinition>();

/**
 * Register a predefined component
 */
export function registerComponent(
    key: string,
    definition: ComponentDefinition
) {
    ComponentRegistry.set(key, definition);
}

/**
 * Create a component configuration with optional overrides
 */
export function createComponentConfig(
    baseKey: string,
    overrides?: {
        props?: Partial<Record<string, Partial<PropDefinition>>>;
        handlers?: Partial<Record<string, Partial<HandlerDefinition>>>;
    }
): ComponentDefinition {
    const baseConfig = ComponentRegistry.get(baseKey);
    if (!baseConfig) {
        throw new Error(`Component not found in registry: ${baseKey}`);
    }

    // Deep clone the base config
    const newConfig: ComponentDefinition = {
        resource: baseConfig.resource,
        propDefinitions: { ...baseConfig.propDefinitions },
        handlers: { ...baseConfig.handlers }
    };

    // Apply prop overrides
    if (overrides?.props) {
        Object.entries(overrides.props).forEach(([propName, propOverride]) => {
            if (newConfig.propDefinitions[propName]) {
                newConfig.propDefinitions[propName] = {
                    ...newConfig.propDefinitions[propName],
                    ...propOverride
                };
            }
        });
    }

    // Apply handler overrides
    if (overrides?.handlers) {
        Object.entries(overrides.handlers).forEach(([handlerName, handlerOverride]) => {
            if (newConfig.handlers[handlerName]) {
                newConfig.handlers[handlerName] = {
                    ...newConfig.handlers[handlerName],
                    ...handlerOverride
                };
            }
        });
    }

    return newConfig;
}

// Example of registering a predefined component
registerComponent('QUICK_LIST', {
    resource: EntityQuickListAction,
    propDefinitions: {
        entitykey: {
            isRequired: true,
            type: 'context',
            path: 'field.componentProps.entityName',
        },
        onCreateEntityClick: {
            isRequired: false,
            type: 'direct',
            value: () => console.log('Create New Entity Button Clicked...'),
        },
        showCreateNewButton: {
            isRequired: false,
            type: 'static',
            value: true,
        },
        className: {
            isRequired: false,
            type: 'static',
            value: '',
        },
        density: {
            isRequired: false,
            type: 'static',
            value: 'normal',
        },
        animationPreset: {
            isRequired: false,
            type: 'static',
            value: 'smooth',
        },
    },
    handlers: {
        onSelectionChange: {
            type: 'callback',
            handler: (recordId: string | string[]) => {
                // Default handler logic
            },
            isResultHandler: true,
            metadata: {
                description: 'Handles the final selection of records',
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
                // Default handler logic
            },
            metadata: {
                description: 'Handles intermediate selection changes'
            }
        }
    }
});

// // Enhanced action creation with component presets
// export const ENTITY_QUICK_SIDEBAR_ACTION: ActionRegistryEntry = {
//     actionType: ACTION_TYPES.COMPONENT,
//     presentationConfig: createPresentationConfig(PRESENTATION_COMPONENTS.SHEET, {
//         props: {
//             title: { value: 'Choose an item from the list' },
//             side: { value: 'right' },
//             className: { value: 'min-w-[400px]' },
//             variant: { value: 'primary' },
//         },
//         handlers: {
//             onClose: {
//                 handler: (recordId) => {
//                     // Custom handler logic
//                 }
//             }
//         }
//     }),
//     triggerConfig: createTriggerConfig(TRIGGER_COMPONENTS.ICON, {
//         props: {
//             label: { value: 'Choose A Record' },
//             iconName: { value: 'listCheck' },
//             variant: { value: 'secondary' },
//             className: { value: 'mr-2' },
//         }
//     }),
//     actionComponentConfig: createComponentConfig('QUICK_LIST', {
//         props: {
//             showCreateNewButton: { value: true },
//             className: { value: '' },
//         },
//         handlers: {
//             onSelectionChange: {
//                 handler: (recordId) => {
//                     // Custom handler logic
//                 }
//             }
//         }
//     })
// };
//
// // Enhanced gateway integration
// export const useActionGateway = () => {
//     // ... previous gateway implementation
//
//     const resolveComponentConfig = useCallback((
//         componentKey: string,
//         overrides?: {
//             props?: Record<string, any>;
//             handlers?: Record<string, any>;
//         }
//     ) => {
//         const baseConfig = ComponentRegistry.get(componentKey);
//         if (!baseConfig) {
//             throw new Error(`Component not found: ${componentKey}`);
//         }
//
//         return createComponentConfig(componentKey, overrides);
//     }, []);
//
//     return {
//         // ... previous gateway methods
//         resolveComponentConfig
//     };
// };


export const ACTION_COMPONENTS = {
    QUICK_LIST: EntityQuickListAction,
    DATA_TABLE: DataTable,
    JSON_EDITOR: JsonEditor,
    RECORD_SELECTOR: RecordSelector,
    QUICK_SIDEBAR: QuickReferenceSidebar,
    SHOW_SELECTED_ACCORDION: EntityShowSelectedAccordion
} as const;

