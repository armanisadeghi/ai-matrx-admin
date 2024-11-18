'use client';

import React from 'react';
import {useAppDispatch} from 'lib/redux/hooks';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Label} from '@/components/ui/label';
import {Link, Globe, Code} from 'lucide-react';
import {QuickReferenceSidebar} from "@/app/(authenticated)/tests/crud-operations/components/QuickReferenceSidebar";
import EntityShowSelectedAccordion
    from "@/components/matrx/Entity/prewired-components/EntityShowSelectedAccordion";

const PRESENTATION_TYPES = {
    MODAL: 'modal',
    SHEET: 'sheet',
    POPOVER: 'popover',
    INLINE: 'inline',
    CUSTOM: 'custom'
} as const;

// Enhanced action configuration system
const createFieldAction = (type, config) => ({
    type,
    icon: config.icon,
    label: config.label,
    presentation: config.presentation || PRESENTATION_TYPES.MODAL,
    buttonStyle: config.buttonStyle || 'icon',
    component: config.component, // Custom React component
    props: config.props || {}, // Additional props for the custom component
    handleAction: config.handleAction,
    shouldShow: config.shouldShow || (() => true),
    containerProps: config.containerProps || {},
    renderContainer: config.renderContainer, // Custom container renderer
});

const ActionContainer = (
    {
        presentation,
        trigger,
        content,
        containerProps,
        customContainer
    }) => {
    switch (presentation) {
        case PRESENTATION_TYPES.MODAL:
            return (
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
            );

        case PRESENTATION_TYPES.SHEET:
            return (
                <Sheet>
                    <SheetTrigger asChild>{trigger}</SheetTrigger>
                    <SheetContent {...containerProps}>
                        {containerProps.title && (
                            <SheetHeader>
                                <SheetTitle>{containerProps.title}</SheetTitle>
                            </SheetHeader>
                        )}
                        <QuickReferenceSidebar
                            entityKey={'registeredFunction'}
                        />
                    </SheetContent>
                </Sheet>
            );

        case PRESENTATION_TYPES.POPOVER:
            return (
                <Popover>
                    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                    <PopoverContent {...containerProps}>
                        {content}
                    </PopoverContent>
                </Popover>
            );

        case PRESENTATION_TYPES.INLINE:
            return (
                <div {...containerProps}>
                    {trigger}
                    <div className="mt-2">{content}</div>
                </div>
            );

        case PRESENTATION_TYPES.CUSTOM:
            return customContainer({trigger, content, ...containerProps});

        default:
            return trigger;
    }
};

// Example custom components
const RecordSelector = (
    {
        field,
        value,
        onChange,
        onSearch,
        records = [],
        loading = false
    }) => {
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

const JsonEditor = ({value, onChange}) => {
    const [error, setError] = React.useState(null);

    const handleChange = (e) => {
        try {
            const parsed = JSON.parse(e.target.value);
            setError(null);
            onChange({target: {value: parsed}});
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="space-y-2">
      <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={handleChange}
          className="w-full min-h-[200px] p-3 font-mono bg-input border border-border rounded-md"
      />
            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    );
};

// Example of custom actions using the enhanced system
const createCustomActions = (dispatch) => ({
    recordSelector: createFieldAction('recordSelector', {
        icon: Link,
        label: 'Select Record',
        presentation: PRESENTATION_TYPES.SHEET,
        buttonStyle: 'full',
        component: RecordSelector,
        containerProps: {
            title: 'Select Related Record',
            side: 'right',
            className: 'min-w-[400px]'
        },
        props: {
            onSearch: (searchTerm) => {
                dispatch({
                    type: 'SEARCH_RECORDS',
                    payload: {searchTerm}
                });
            }
        }
    }),
    recordSelector2: createFieldAction('recordSelector', {
        icon: Link,
        label: 'Select Record',
        presentation: PRESENTATION_TYPES.SHEET,
        buttonStyle: 'full',
        component: RecordSelector,
        containerProps: {
            title: 'Select Related Record',
            side: 'right',
            className: 'min-w-[400px]'
        },
        props: {
            onSearch: (searchTerm) => {
                dispatch({
                    type: 'SEARCH_RECORDS',
                    payload: {searchTerm}
                });
            }
        }
    }),

    jsonEditor: createFieldAction('jsonEditor', {
        icon: Code,
        label: 'Edit JSON',
        presentation: PRESENTATION_TYPES.MODAL,
        component: JsonEditor,
        containerProps: {
            title: 'Edit JSON',
            className: 'max-w-4xl'
        }
    }),

    customDrawer: createFieldAction('customDrawer', {
        icon: Globe,
        label: 'Custom View',
        presentation: PRESENTATION_TYPES.CUSTOM,
        component: ({value, onChange}) => (
            <div className="p-4">Custom component here</div>
        ),
        renderContainer: ({trigger, content}) => (
            <div className="relative inline-block">
                {trigger}
                <div className="absolute right-0 mt-2 w-96 bg-popover border border-border rounded-md shadow-lg">
                    {content}
                </div>
            </div>
        )
    })
});

// Enhanced FieldAction component
const FieldAction = (
    {
        action,
        field,
        value,
        onChange
    }) => {
    const dispatch = useAppDispatch();
    const ButtonIcon = action.icon;

    const buttonClass = action.buttonStyle === 'icon'
                        ? "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center justify-center"
                        : "h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center gap-2";

    const actionButton = (
        <Button
            variant="ghost"
            size="sm"
            className={buttonClass}
            onClick={() => action.handleAction?.(field, value)}
        >
            <ButtonIcon className="w-4 h-4"/>
            {action.buttonStyle === 'full' && action.label}
        </Button>
    );

    if (!action.component) {
        return actionButton;
    }

    const ActionComponent = action.component;
    const componentProps = {
        field,
        value,
        onChange,
        ...action.props
    };

    return (
        <ActionContainer
            presentation={action.presentation}
            trigger={actionButton}
            content={<ActionComponent {...componentProps} />}
            containerProps={action.containerProps}
            customContainer={action.renderContainer}
        />
    );
};

// Example usage
const ExampleUsage = () => {
    const dispatch = useAppDispatch();
    const customActions = createCustomActions(dispatch);
    const [values, setValues] = React.useState({});

    const handleChange = (fieldId) => (e) => {
        setValues(prev => ({
            ...prev,
            [fieldId]: e.target.value
        }));
    };

    // Example fields with different custom components
    const fields = [
        {
            id: 'related',
            label: 'Related Record',
            type: 'relation',
            actions: [customActions.recordSelector]
        },
        {
            id: 'related',
            label: 'Related Display',
            type: 'relation',
            actions: [customActions.recordSelector]
        },
        {
            id: 'config',
            label: 'Configuration',
            type: 'json',
            actions: [customActions.jsonEditor]
        },
        {
            id: 'custom',
            label: 'Custom View',
            type: 'custom',
            actions: [customActions.customDrawer]
        }
    ];

    return (
        <div className="space-y-6 p-4">
            {fields.map(field => (
                <div key={field.id} className="relative">
                    <Label>{field.label}</Label>
                    <div className="mt-1 flex items-center">
                        <input
                            type="text"
                            value={values[field.id] || ''}
                            onChange={handleChange(field.id)}
                            className="w-full h-10 px-3 bg-input/50 border border-border rounded-md text-foreground"
                        />
                        <div className="absolute right-2 flex gap-1">
                            {field.actions.map((action, index) => (
                                <FieldAction
                                    key={index}
                                    action={action}
                                    field={field}
                                    value={values[field.id]}
                                    onChange={handleChange(field.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ))}
            <div className="space-y-4 p-4 border bg-border bg-matrx-card-background">
                <EntityShowSelectedAccordion entityKey={'registeredFunction'}/>
            </div>

        </div>
    );
};

export default ExampleUsage;
