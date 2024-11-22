export type FormVariant = 'default' | 'json' | 'record' | 'edit' | 'file' | 'datetime' | 'url' | 'code';
export type FieldType = 'text' | 'varchar' | 'uuid' | 'file' | 'datetime' | 'url' | 'jsonb';

export interface DynamicFieldConfig {
    label: string;
    type: FieldType;
    description?: string;
    variant?: FormVariant;
    singleLine?: boolean;
}

export interface FormFieldProps {
    label: string;
    type?: FieldType;
    description?: string;
    optional?: boolean;
    value?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    variant?: FormVariant;
    singleLine?: boolean;
    onAction?: () => void;  // New prop for handling actions
    dynamicFields?: DynamicFieldConfig[];  // New prop for dynamic fields config
}

export interface ActionFieldConfig extends FormFieldProps {
    actionId: string;  // Unique identifier for this action instance
    trigger?: {
        icon?: React.ComponentType;  // Icon component to show in the field
        variant?: 'button' | 'icon' | 'text';
        position?: 'right' | 'left' | 'inline';
    };
    presentation?: {
        component: React.ComponentType<any>;
        props?: Record<string, any>;
    };
    command?: {
        execute: (...args: any[]) => Promise<any> | any;
        onSuccess?: (result: any) => void;
        onError?: (error: any) => void;
    };
    inline?: {
        component: React.ComponentType<any>;
        props?: Record<string, any>;
    };
}
