import React from 'react';
import EntityQuickListAction from "@/components/matrx/ArmaniForm/action-system/action-components/EntityQuickListAction";

interface PropDefinition {
    isRequired: boolean;
    type: 'context' | 'static' | 'direct' | 'computed';
    path?: string;
    resolver?: string;
    value?: any;
    description?: string;
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

interface ActionComponentDefinition {
    resource: React.ComponentType<any>;
    propDefinitions: Record<string, PropDefinition>;
    handlers: Record<string, HandlerDefinition>;
}

// Registry of pre-defined action components
export const ACTION_COMPONENTS_REGISTRY = {
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
                },
                metadata: {
                    description: 'Handles intermediate changes'
                }
            }
        }
    }
} as const;
