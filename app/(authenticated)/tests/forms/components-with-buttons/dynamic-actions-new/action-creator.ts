import {Code, Link, ListCheck} from "lucide-react";
import {
    ACTION_TYPES,
    PRESENTATION_TYPES,
    TRIGGER_TYPES
} from "./action-config";
import RecordSelector
    from "./components/RecordSelector";
import EntityQuickReferenceList
    from "@/components/matrx/Entity/prewired-components/quick-reference/EntityQuickReferenceList";
import {
    JsonEditor
} from "./components/JsonEditor";
import {QuickReferenceSidebar} from "@/app/(authenticated)/tests/crud-operations/components/QuickReferenceSidebar";
import EntityShowSelectedAccordion from "@/components/matrx/Entity/prewired-components/EntityShowSelectedAccordion";

const ACTION_REGISTRY = {
    entityList: {
        type: 'hello',
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
        type: 'hello',
        icon: ListCheck,
        label: 'Select Record',
        presentation: PRESENTATION_TYPES.SHEET,
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
        actionType: ACTION_TYPES.DIRECT,
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


export function createMatrxActions(dispatch) {
    const createActionHandler = (type, config) => {
        if (type === ACTION_TYPES.DIRECT) return config.handler;
        return () => console.log('Action not implemented');
        if (type === ACTION_TYPES.REDUX) {
            return (field, value) => dispatch({
                type: config.actionType,
                payload: {field, value, ...config.payload}
            });
        }
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

export function mapFields(dispatch, fieldDefinitions) {
    const actionMap = createMatrxActions(dispatch);

    const generateId = () =>
        crypto.randomUUID?.() || `field-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const processField = (field) => {
        const {
            id = generateId(),
            label,
            value = '',
            dataType = 'text',
            type = 'simple',
            actionProps = {},
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
            actionProps,
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
