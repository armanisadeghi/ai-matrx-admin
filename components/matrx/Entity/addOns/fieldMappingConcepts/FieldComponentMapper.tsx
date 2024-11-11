import { FlexFormField, FormFieldType } from "../../../AnimatedForm/FlexAnimatedForm";

// Basic component configuration types
interface ComponentConfig {
    type: FormFieldType;
    defaultProps?: {
        min?: number;
        max?: number;
        step?: number;
        rows?: number;
        maxLength?: number;
        pattern?: string;
        accept?: string;
        multiple?: boolean;
        placeholder?: string;
    };
    validation?: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        min?: number;
        max?: number;
    };
    display?: {
        size?: 'sm' | 'md' | 'lg';
        variant?: 'outline' | 'filled' | 'underline';
        width?: 'full' | 'auto' | number;
    };
}

// Enhanced component mapping
const COMPONENT_MAP: Record<string, ComponentConfig> = {
    "uuid": {
        type: "text",
        defaultProps: {
            pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        }
    },
    "character varying(255)": {
        type: "textarea",
        defaultProps: {
            rows: 3,
            maxLength: 255
        }
    },
    "character varying(50)": {
        type: "text",
        defaultProps: {
            maxLength: 50
        }
    },
    "text": {
        type: "textarea",
        defaultProps: {
            rows: 5
        }
    },
    "boolean": {
        type: "switch",
        display: {
            size: "md"
        }
    },
    "jsonb": {
        type: "json",
        display: {
            width: "full"
        }
    },
    "integer": {
        type: "number",
        defaultProps: {
            step: 1
        },
        validation: {
            min: -2147483648,
            max: 2147483647
        }
    },
    "smallint": {
        type: "number",
        defaultProps: {
            step: 1
        },
        validation: {
            min: -32768,
            max: 32767
        }
    },
    "real": {
        type: "number",
        defaultProps: {
            step: 0.01
        }
    },
    "timestamp with time zone": {
        type: "datetime-local",
        display: {
            width: "full"
        }
    },
    "uuid[]": {
        type: "select",
        defaultProps: {
            multiple: true
        }
    },
    "jsonb[]": {
        type: "json",
        defaultProps: {
            multiple: true
        }
    }
};

// Helper function to generate form field from SQL type
function generateFormField(
    columnName: string,
    sqlType: string,
    required: boolean = false,
    additionalProps: Partial<FlexFormField> = {}
): FlexFormField {
    const config = COMPONENT_MAP[sqlType];

    if (!config) {
        // Default to text input if no mapping exists
        return {
            name: columnName,
            label: formatLabel(columnName),
            type: "text",
            required,
            ...additionalProps
        };
    }

    return {
        name: columnName,
        label: formatLabel(columnName),
        type: config.type,
        required,
        ...config.defaultProps,
        ...config.validation,
        ...config.display,
        ...additionalProps
    };
}

// Helper function to format column names as labels
function formatLabel(columnName: string): string {
    return columnName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}


interface SchemaField {
    name: string;
    sqlType: string;
    required: boolean;
    componentProps?: Partial<FlexFormField>;
}

function generateFormSchema(fields: SchemaField[]): FlexFormField[] {
    return fields.map(field =>
        generateFormField(
            field.name,
            field.sqlType,
            field.required,
            field.componentProps
        )
    );
}
// Usage example:
const field = generateFormField('user_email', 'character varying(255)', true, {
    placeholder: 'Enter your email'
});
