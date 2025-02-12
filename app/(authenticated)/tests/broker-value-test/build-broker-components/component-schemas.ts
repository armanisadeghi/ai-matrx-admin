// Schema definitions for component configurations
export const COMPONENT_SCHEMAS = {
    BrokerInput: {
        additionalParams: {
            type: 'object',
            properties: {
                type: 'string',
                validation: {
                    pattern: 'string',
                    message: 'string'
                }
            }
        }
    },
    
    BrokerNumberInput: {
        min: 'number',
        max: 'number',
        step: 'number'
    },
    
    BrokerSlider: {
        min: 'number',
        max: 'number',
        step: 'number',
        additionalParams: {
            type: 'object',
            properties: {
                showValue: 'boolean',
                valuePrefix: 'string',
                valueSuffix: 'string'
            }
        }
    },

    BrokerCheckbox: {
        options: 'options',
        includeOther: 'boolean',
        orientation: 'orientation'
    },

    BrokerRadioGroup: {
        options: 'options',
        includeOther: 'boolean',
        orientation: 'orientation'
    },

    BrokerSelect: {
        options: 'options',
        includeOther: 'boolean',
        additionalParams: {
            type: 'object',
            properties: {
                placeholder: 'string'
            }
        }
    },

    BrokerCustomSelect: {
        options: 'options',
        includeOther: 'boolean'
    },

    BrokerSwitch: {
        additionalParams: {
            type: 'object',
            properties: {
                labelPosition: {
                    type: 'select',
                    options: ['left', 'right']
                }
            }
        }
    },

    BrokerTextarea: {
        placeholder: 'string'
    },

    BrokerTextareaGrow: {
        placeholder: 'string',
        minHeight: 'size'
    },

    BrokerTextArrayInput: {
        placeholder: 'string',
        additionalParams: {
            type: 'object',
            properties: {
                chipClassName: 'string'
            }
        }
    }
} as const;

// Default values for new components
export const DEFAULT_VALUES = {
    BrokerSlider: {
        min: 0,
        max: 100,
        step: 1,
        additionalParams: {
            showValue: true,
            valuePrefix: '',
            valueSuffix: ''
        }
    },
    BrokerCheckbox: {
        options: [
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' }
        ],
        includeOther: false,
        orientation: 'vertical'
    },
    BrokerRadioGroup: {
        options: [
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' }
        ],
        includeOther: false,
        orientation: 'vertical'
    },
    BrokerSelect: {
        options: [
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' }
        ],
        includeOther: false
    }
    // Add other default values as needed
} as const;
