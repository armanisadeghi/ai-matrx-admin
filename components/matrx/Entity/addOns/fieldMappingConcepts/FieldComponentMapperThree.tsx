// Validation Types and Interfaces
import {FormFieldType} from "@/components/matrx/AnimatedForm/FlexAnimatedForm";

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
    isValid: boolean;
    message?: string;
    severity?: ValidationSeverity;
    code?: string;
}

export interface ValidationConfig {
    name: string;                    // Name of the validation function
    params?: Record<string, any>;    // Parameters for the validation
    message?: string;                // Custom error message
    severity?: ValidationSeverity;   // Severity level
    async?: boolean;                 // Whether validation is async
    dependsOn?: string[];           // Field dependencies
    apiEndpoint?: string;           // Optional API endpoint for external validation
    timeout?: number;               // Timeout for async validations
    validateOn?: ('change' | 'blur' | 'submit')[]; // When to trigger validation
}

// Enhanced Component Configurations
export interface BaseComponentConfig {
    type: FormFieldType;
    defaultValue?: any;
    validations?: ValidationConfig[];
    transformers?: {
        input?: string[];    // Names of transform functions for input
        output?: string[];   // Names of transform functions for output
    };
    formatters?: {
        display?: string;    // Name of display formatter
        edit?: string;       // Name of edit formatter
    };
    dependencies?: {
        visibleWhen?: {
            field: string;
            condition: string;
            value: any;
        }[];
        enabledWhen?: {
            field: string;
            condition: string;
            value: any;
        }[];
    };
    permissions?: {
        read?: string[];
        write?: string[];
    };
    hints?: {
        placeholder?: string;
        tooltip?: string;
        helpText?: string;
    };
    appearance?: {
        size?: 'sm' | 'md' | 'lg';
        variant?: 'outline' | 'filled' | 'underline';
        className?: string;
    };
}

// Example of specific component configurations
export interface TextInputConfig extends BaseComponentConfig {
    type: 'text';
    autocomplete?: string;
    mask?: {
        pattern: string;
        placeholder?: string;
    };
    suggestions?: {
        source: string;      // Name of suggestion provider
        minChars?: number;
        maxItems?: number;
    };
}

export interface NumberInputConfig extends BaseComponentConfig {
    type: 'number';
    format?: {
        precision?: number;
        locale?: string;
        notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
        prefix?: string;
        suffix?: string;
    };
    range?: {
        min?: number;
        max?: number;
        step?: number;
        allowOutOfRange?: boolean;
    };
}

// Example of predefined validations
export const StandardValidations = {
    uuid: {
        name: 'uuidFormat',
        message: 'Must be a valid UUID',
        validateOn: ['blur', 'submit']
    },
    email: {
        name: 'emailFormat',
        message: 'Must be a valid email address',
        validateOn: ['blur', 'submit']
    },
    required: {
        name: 'required',
        message: 'This field is required',
        validateOn: ['submit']
    },
    // Complex validation example
    passwordStrength: {
        name: 'passwordStrength',
        params: {
            minLength: 8,
            requireNumbers: true,
            requireSpecialChars: true,
            requireUppercase: true,
            requireLowercase: true
        },
        validateOn: ['change'],
        severity: 'warning'
    },
    // Async validation example
    uniqueUsername: {
        name: 'uniqueUsername',
        async: true,
        apiEndpoint: '/api/validate/username',
        timeout: 1000,
        validateOn: ['blur']
    }
} as const;

// Example SQL to Component mapping with enhanced configuration
export const sqlToComponentMapping: Record<string, BaseComponentConfig> = {
    'uuid': {
        type: 'text',
        validations: [
            //@ts-ignore
            StandardValidations.uuid,
            //@ts-ignore
            StandardValidations.required
        ],
        formatters: {
            display: 'shortUUID',
            edit: 'fullUUID'
        }
    },
    'email': {
        type: 'text',
        validations: [
            //@ts-ignore
            StandardValidations.email,
            {
                name: 'domainAllowed',
                params: {
                    domains: ['company.com', 'subsidiary.com']
                }
            }
        ],
        transformers: {
            input: ['toLowerCase', 'trimWhitespace'],
            output: ['normalizeEmail']
        }
    },
    'password': {
        type: 'password',
        validations: [
            //@ts-ignore
            StandardValidations.required,
            //@ts-ignore
            StandardValidations.passwordStrength
        ],
        hints: {
            helpText: 'Password must be at least 8 characters long and contain...',
            tooltip: 'Click to see password requirements'
        }
    }
};

// Example of how to define a custom validation
export interface CustomValidationConfig {
    name: string;
    validator: (value: any, params?: any) => ValidationResult | Promise<ValidationResult>;
    defaultMessage: string;
    defaultParams?: Record<string, any>;
}

// Registration system for custom validations
export class ValidationRegistry {
    private static validators: Map<string, CustomValidationConfig> = new Map();

    static register(config: CustomValidationConfig) {
        this.validators.set(config.name, config);
    }

    static get(name: string): CustomValidationConfig | undefined {
        return this.validators.get(name);
    }
}
