'use client';

import React from 'react';
import {useAppDispatch} from 'lib/redux/hooks';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Label} from '@/components/ui/label';
import {Code, Link} from 'lucide-react';
import {QuickReferenceSidebar} from "@/app/(authenticated)/tests/crud-operations/components/QuickReferenceSidebar";
import EntityShowSelectedAccordion from "@/components/matrx/Entity/prewired-components/EntityShowSelectedAccordion";
import {JsonEditor} from "./components/JsonEditor";
import EntityQuickReferenceList
    from "@/components/matrx/Entity/prewired-components/quick-reference/EntityQuickReferenceList";

// Configuration Constants
const PRESENTATION_TYPES = {
    MODAL: 'modal',
    SHEET: 'sheet',
    POPOVER: 'popover',
    INLINE: 'inline',
    CUSTOM: 'custom'
} as const;

const PRESENTATION_COMPONENTS = {
    QUICK_LIST: 'QuickReferenceList',
    SIMPLE_TABLE: 'SimpleTable',
    DATA_TABLE: 'DataTable',
    CUSTOM: 'custom'
} as const;


const TRIGGER_TYPES = {
    BUTTON: 'button',
    LINK: 'link',
    ICON: 'icon',
    SELECT: 'select'
} as const;

const ACTION_TYPES = {
    REDUX: 'redux',
    HOOK: 'hook',
    DIRECT: 'direct',
    COMPONENT: 'component'
} as const;




// Presentation System
const PresentationSystem = {
    [PRESENTATION_TYPES.MODAL]: ({trigger, content, containerProps}) => (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent {...containerProps}>
                {containerProps.title && (
                    <DialogHeader>
                        <DialogTitle>{containerProps.title}</DialogTitle>
                    </DialogHeader>
                )}
                {content}
            </DialogContent>
        </Dialog>
    ),
    [PRESENTATION_TYPES.SHEET]: ({trigger, content, containerProps}) => (
        <Sheet>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent {...containerProps}>
                {containerProps.title && (
                    <SheetHeader>
                        <SheetTitle>{containerProps.title}</SheetTitle>
                    </SheetHeader>
                )}
                <QuickReferenceSidebar entityKey={'registeredFunction'} />
            </SheetContent>
        </Sheet>
    ),
    [PRESENTATION_TYPES.POPOVER]: ({trigger, content, containerProps}) => (
        <Popover>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent {...containerProps}>{content}</PopoverContent>
        </Popover>
    ),
    [PRESENTATION_TYPES.INLINE]: ({trigger, content, containerProps}) => (
        <div {...containerProps}>
            {trigger}
            <div className="mt-2">{content}</div>
        </div>
    )
};

// Trigger System
const TriggerSystem = {
    [TRIGGER_TYPES.BUTTON]: ({icon: Icon, label, onClick, className}) => (
        <Button
            variant="ghost"
            size="sm"
            className={className}
            onClick={onClick}
        >
            {Icon && <Icon className="w-4 h-4"/>}
            {label}
        </Button>
    ),
    [TRIGGER_TYPES.ICON]: ({icon: Icon, onClick, className}) => (
        <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${className}`}
            onClick={onClick}
        >
            <Icon className="w-4 h-4"/>
        </Button>
    )
};

// Component Definition
const RecordSelector = ({field, value, onChange, onSearch, records = [], loading = false}) => {
    const [searchTerm, setSearchTerm] = React.useState('');

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        onSearch?.(e.target.value);
                    }}
                    className="flex-1 p-2 bg-input border border-border rounded-md"
                    placeholder="Search records..."
                />
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {loading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : records.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No records found</div>
                ) : (
                        records.map(record => (
                            <Button
                                key={record.id}
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => onChange({target: {value: record.id}})}
                            >
                                {record.displayName}
                            </Button>
                        ))
                    )}
            </div>
        </div>
    );
};


// Action Registry
const ACTION_REGISTRY = {
    recordSelectorAction: {
        type: 'recordSelector',
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
    entityList: {
        type: 'recordSelector',
        icon: Link,
        label: 'Select Record',
        presentation: PRESENTATION_TYPES.MODAL,
        triggerType: TRIGGER_TYPES.ICON,
        component: EntityQuickReferenceList,
        directComponentProps: {
            onCreateEntityClick: () => console.log('Create New Entity Button Clicked...', ),
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

    jsonEditor: {
        type: 'jsonEditor',
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

const FieldAction = ({ action, field, value, onChange, fieldComponentProps }) => {
    const dispatch = useAppDispatch();
    const Trigger = TriggerSystem[action.triggerType];
    const Presentation = PresentationSystem[action.presentation];

    const triggerProps = {
        icon: action.icon,
        label: action.label,
        onClick: () => action.handleAction?.(field, value),
        className: "h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center gap-1"
    };

    const ActionComponent = action.component;

    // Merge props: action.props and field-specific componentProps
    const componentProps = {
        field,
        value,
        onChange,
        ...action.props, // From ACTION_REGISTRY
        ...fieldComponentProps // From fieldDefinitions
    };

    return (
        <Presentation
            trigger={<Trigger {...triggerProps} />}
            content={ActionComponent ? <ActionComponent {...componentProps} /> : null}
            containerProps={action.containerProps}
        />
    );
};




const FormWithActions = ({ fields }) => {
    const [values, setValues] = React.useState({});

    const handleChange = (fieldId) => (e) => {
        setValues((prev) => ({
            ...prev,
            [fieldId]: e.target.value
        }));
    };

    return (
        <div className="space-y-6 p-4">
            {fields.map((field) => (
                <div key={field.id} className="relative">
                    <Label>{field.label}</Label>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={values[field.id] || ''}
                            onChange={handleChange(field.id)}
                            className="w-full h-10 px-3 pr-20 bg-input/50 border border-border rounded-md text-foreground"
                        />
                        <div className="absolute right-2 flex gap-1">
                            {field.actions.map((action, index) => (
                                <FieldAction
                                    key={index}
                                    action={action}
                                    field={field}
                                    value={values[field.id]}
                                    onChange={handleChange(field.id)}
                                    fieldComponentProps={field.componentProps}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ))}
            <div className="space-y-4 p-4 border bg-border bg-matrx-card-background">
                <EntityShowSelectedAccordion entityKey={'registeredFunction'} />
            </div>
        </div>
    );
};

function createActions(dispatch) {
    const createActionHandler = (type, config) => {
        if (type === ACTION_TYPES.REDUX) {
            return (field, value) => dispatch({
                type: config.actionType,
                payload: { field, value, ...config.payload }
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

function mapFields(dispatch, fieldDefinitions) {
    const actionMap = createActions(dispatch);
    return fieldDefinitions.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        componentProps: field.componentProps || {},
        actions: field.actionKeys
            .map((actionKey) => actionMap[actionKey] || null)
            .filter(Boolean), // Remove null actions
    }));
}


export default function Page() {
    const fieldDefinitions = [
        { id: '1001-relation-test', label: 'Related Record', type: 'relation', actionKeys: ['recordSelectorAction']},
        { id: '1002-relation-test', label: 'Related Record', type: 'relation', actionKeys: ['entityList'], componentProps: { entityKey: 'registeredFunction' } },
        { id: '1005-inline-test', label: 'Inline Field', type: 'inline', actionKeys: ['inlineAction'] },
        { id: '1002-json-test', label: 'Configuration', type: 'json', actionKeys: ['jsonEditor'] },
        { id: '1003-entity-list', label: 'Entity Selection', type: 'custom', actionKeys: ['entityList'], componentProps: { entityKey: 'arg', showCreateNewButton: false } },
        { id: '1004-sheet-test', label: 'Sheet Field', type: 'sheet', actionKeys: ['sheetTriggerAction'] },
    ];

    const dispatch = useAppDispatch();
    const fields = mapFields(dispatch, fieldDefinitions);
    return <FormWithActions fields={fields} />;
}
