// Base component configuration types
import {FormFieldType} from "@/components/matrx/AnimatedForm/FlexAnimatedForm";

export interface BaseComponentConfig {
    type: FormFieldType;
    defaultValue?: any;
    minLength?: number;
    maxLength?: number;
    rows?: number;
    precision?: number;
    format?: string;
    validation?: {
        required?: boolean;
        pattern?: string;
        min?: number;
        max?: number;
        step?: number;
    };
}

// Specific configurations for different component types
export interface TextConfig extends BaseComponentConfig {
    type: 'text' | 'email' | 'tel' | 'url' | 'password';
    maxLength?: number;
    autocomplete?: string;
}

export interface TextareaConfig extends BaseComponentConfig {
    type: 'textarea';
    rows: number;
    maxLength?: number;
    resizable?: boolean;
}

export interface NumberConfig extends BaseComponentConfig {
    type: 'number';
    precision: number;
    step?: number;
    format?: 'integer' | 'float' | 'currency';
}

export interface SelectConfig extends BaseComponentConfig {
    type: 'select';
    options?: Array<{ label: string; value: any }>;
    isMulti?: boolean;
    isClearable?: boolean;
}

export interface JsonConfig extends BaseComponentConfig {
    type: 'json';
    height?: string;
    validateSchema?: boolean;
    schemaUrl?: string;
}

// Updated SQL to Component mapping
export const sqlToComponentMapping: Record<string, BaseComponentConfig> = {
    'uuid': {
        type: 'text',
        validation: { pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
    },
    'character varying(255)': {
        type: 'textarea',
        rows: 3,
        maxLength: 255
    },
    'character varying(50)': {
        type: 'text',
        maxLength: 50
    },
    'text': {
        type: 'textarea',
        rows: 5
    },
    'boolean': {
        type: 'switch',
        defaultValue: false
    },
    'jsonb': {
        type: 'json',
        //@ts-ignore
        height: '200px',
        validateSchema: true
    },
    'integer': {
        type: 'number',
        precision: 0,
        validation: {
            step: 1
        }
    },
    'real': {
        type: 'number',
        precision: 2,
        validation: {
            step: 0.01
        }
    },
    'timestamp with time zone': {
        type: 'datetime-local',
        format: 'yyyy-MM-dd\'T\'HH:mm:ssXXX'
    }
};

// Example of how to use this in your Python code:
