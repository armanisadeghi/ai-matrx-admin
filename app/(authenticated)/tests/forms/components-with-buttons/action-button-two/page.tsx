'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from 'lib/redux/hooks';
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Link, Pencil, Upload, Calendar, Clock, Globe, Code, File, Plus, RefreshCw, Search } from 'lucide-react';

// Action types
const FIELD_ACTIONS = {
    EDIT: 'edit',
    LINK: 'link',
    CODE: 'code',
    FILE: 'file',
    DATETIME: 'datetime',
    URL: 'url',
    JSON: 'json',
    LOOKUP: 'lookup',
    REFRESH: 'refresh',
} as const;

// Action configuration system
const createFieldAction = (type, config) => ({
    type,
    icon: config.icon,
    label: config.label,
    modalTitle: config.modalTitle,
    buttonStyle: config.buttonStyle || 'icon', // 'icon' or 'full'
    hasModal: config.hasModal || false,
    getModalContent: config.getModalContent,
    handleAction: config.handleAction,
    shouldShow: config.shouldShow || (() => true),
});

// Predefined actions
const createDefaultActions = (dispatch) => ({

    [FIELD_ACTIONS.EDIT]: createFieldAction(FIELD_ACTIONS.EDIT, {
        icon: Pencil,
        label: 'Edit',
        modalTitle: 'Edit Content',
        buttonStyle: 'icon',
        hasModal: true,
        getModalContent: (field, value, onChange) => (
            <textarea
                value={value || ''}
                onChange={onChange}
                className="w-full min-h-[200px] p-3 bg-input border border-border rounded-md text-foreground"
            />
        ),
    }),

    [FIELD_ACTIONS.LINK]: createFieldAction(FIELD_ACTIONS.LINK, {
        icon: Link,
        label: 'Select Record',
        modalTitle: 'Select Related Record',
        buttonStyle: 'full',
        hasModal: true,
        handleAction: (field, value) => {
            // Dispatch action to fetch related records
            dispatch({
                type: 'FETCH_RELATED_RECORDS',
                payload: {
                    field,
                    currentValue: value,
                    relationship: field.relationship
                }
            });
        },
        getModalContent: (field, value, onChange, state) => {
            const relatedRecords = useAppSelector(
                (state) => state.globalCache.schema.registeredFunction.relationships || []
            );
            const router = useRouter()

            return (
                <div className="space-y-4">
                    {relatedRecords.map((record) => (
                        <div key={record.relatedTable} className="space-y-2 p-4 border border-gray-200 rounded-md">
                            {/* Display record details */}
                            <div className="text-md text-foreground">
                                <p><strong>Column:</strong> {record.column}</p>
                                <p><strong>Related Table:</strong> {record.relatedTable}</p>
                                <p><strong>Related Column:</strong> {record.relatedColumn}</p>
                                <p><strong>Relationship Type:</strong> {record.relationshipType}</p>
                            </div>
                            <Button type="button"
                                    className="w-full justify-start"
                                    variant="primary"
                                    onClick={() => router.push(`/entity-crud/${record.relatedTable}`)}>
                                {record.relatedTable}
                            </Button>
                        </div>
                    ))}
                </div>
            );
        },
    }),

    [FIELD_ACTIONS.REFRESH]: createFieldAction(FIELD_ACTIONS.REFRESH, {
        icon: RefreshCw,
        label: 'Refresh Data',
        buttonStyle: 'icon',
        hasModal: false,
        handleAction: (field) => {
            dispatch({
                type: 'REFRESH_FIELD_DATA',
                payload: {
                    field,
                    relationship: field.relationship
                }
            });
        },
        shouldShow: (field) => Boolean(field.relationship),
    }),

    [FIELD_ACTIONS.LOOKUP]: createFieldAction(FIELD_ACTIONS.LOOKUP, {
        icon: Search,
        label: 'Lookup',
        modalTitle: 'Search Records',
        buttonStyle: 'full',
        hasModal: true,
        handleAction: (field, searchTerm) => {
            dispatch({
                type: 'SEARCH_RELATED_RECORDS',
                payload: {
                    field,
                    searchTerm,
                    relationship: field.relationship
                }
            });
        },
        getModalContent: (field, value, onChange, state) => {
            const [searchTerm, setSearchTerm] = React.useState('');
            const searchResults = useAppSelector(state => state.entities['registeredFunction'].entityMetadata.fields || []);

            return (
                <div className="space-y-4">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 bg-input border border-border rounded-md"
                        placeholder="Search..."
                    />
                    <div className="space-y-2">
                        {searchResults.map(result => (
                            <Button
                                key={result.name}
                                className="w-full justify-start"
                                variant="ghost"
                                onClick={() => onChange({ target: { value: result.name } })}
                            >
                                {result.displayName}
                            </Button>
                        ))}
                    </div>
                </div>
            );
        },
    }),
});

// Enhanced FieldAction component
const FieldAction = ({
                         action,
                         field,
                         value,
                         onChange
                     }) => {
    const ButtonIcon = action.icon;
    const buttonClass = action.buttonStyle === 'icon'
                        ? "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center justify-center"
                        : "h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center gap-2";

    const actionButton = (
        <Button
            variant="ghost"
            size="sm"
            className={buttonClass}
            onClick={() => !action.hasModal && action.handleAction?.(field, value)}
        >
            <ButtonIcon className="w-4 h-4"/>
            {action.buttonStyle === 'full' && action.label}
        </Button>
    );

    if (!action.hasModal) {
        return actionButton;
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {actionButton}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{action.modalTitle}</DialogTitle>
                </DialogHeader>
                {action.getModalContent?.(field, value, onChange)}
            </DialogContent>
        </Dialog>
    );
};

// Enhanced DynamicField component
const DynamicField = ({
                          field,  // Contains field metadata including relationships
                          value,
                          onChange,
                          actions = [] // Array of action types to enable for this field
                      }) => {
    const dispatch = useAppDispatch();
    const defaultActions = createDefaultActions(dispatch);
    const router = useRouter()

    // Filter and sort actions based on field configuration
    const availableActions = actions
        .map(actionType => defaultActions[actionType])
        .filter(action => action && action.shouldShow(field));

    return (
        <div className="relative">
            <Label>{field.label}</Label>
            <div className="mt-1 flex items-center">
                <input
                    type="text"
                    value={value}
                    onChange={onChange}
                    className="w-full h-10 px-3 bg-input/50 border border-border rounded-md text-foreground"
                />
                <div className="absolute right-2 flex gap-1">
                    {availableActions.map(action => (
                        <FieldAction
                            key={action.type}
                            action={action}
                            field={field}
                            value={value}
                            onChange={onChange}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// Usage Example
const ExampleUsage = () => {
    const [values, setValues] = React.useState({});

    const handleChange = (fieldId) => (e) => {
        setValues(prev => ({
            ...prev,
            [fieldId]: e.target.value
        }));
    };

    // Example fields with different configurations
    const fields = [
        {
            id: 'name',
            label: 'Name',
            type: 'text',
            actions: [FIELD_ACTIONS.EDIT]
        },
        {
            id: 'parentId',
            label: 'Parent Record',
            type: 'relation',
            relationship: {
                table: 'parents',
                field: 'id'
            },
            actions: [FIELD_ACTIONS.LINK, FIELD_ACTIONS.REFRESH, FIELD_ACTIONS.LOOKUP]
        },
        {
            id: 'config',
            label: 'Configuration',
            type: 'json',
            actions: [FIELD_ACTIONS.JSON, FIELD_ACTIONS.EDIT]
        }
    ];

    return (
        <div className="space-y-6 p-4">
            {fields.map(field => (
                <DynamicField
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    onChange={handleChange(field.id)}
                    actions={field.actions}
                />
            ))}
        </div>
    );
};

export default ExampleUsage;
