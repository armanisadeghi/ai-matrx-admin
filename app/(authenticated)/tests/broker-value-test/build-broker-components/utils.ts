import { DataInputComponent } from "@/components/brokers/types";

interface ComponentSchema {
    fields: Record<string, FieldSchema>;
    required: string[];
  }
  
  // Define the schema for each component type
  const componentSchemas: Record<string, ComponentSchema> = {
    checkbox: {
      fields: {
        options: {
          type: 'options',
          required: true,
          defaultValue: []
        },
        includeOther: {
          type: 'boolean',
          defaultValue: false
        },
        orientation: {
          type: 'orientation',
          defaultValue: 'default'
        }
      },
      required: ['options']
    },
    colorPicker: {
      fields: {},
      required: []
    },
    input: {
      fields: {
        placeholder: {
          type: 'text'
        },
        additionalParams: {
          type: 'text',
          validation: {
            pattern: '^\\{.*\\}$',
            message: 'Must be valid JSON'
          }
        }
      },
      required: []
    },
    // ... define schemas for other components
  };
  
  // Utility to validate a component configuration against its schema
  export const validateComponentConfig = (
    componentType: string,
    config: any
  ): { isValid: boolean; errors: string[] } => {
    const schema = componentSchemas[componentType];
    if (!schema) {
      return { isValid: false, errors: ['Invalid component type'] };
    }
  
    const errors: string[] = [];
  
    // Check required fields
    for (const requiredField of schema.required) {
      if (!config[requiredField]) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }
  
    // Validate field values
    Object.entries(config).forEach(([field, value]) => {
      const fieldSchema = schema.fields[field];
      if (!fieldSchema) {
        errors.push(`Unknown field: ${field}`);
        return;
      }
  
      if (fieldSchema.validation) {
        const { min, max, pattern } = fieldSchema.validation;
        
        if (min !== undefined && value < min) {
          errors.push(`${field} must be at least ${min}`);
        }
        
        if (max !== undefined && value > max) {
          errors.push(`${field} must be at most ${max}`);
        }
        
        if (pattern && typeof value === 'string' && !new RegExp(pattern).test(value)) {
          errors.push(fieldSchema.validation.message || `${field} has invalid format`);
        }
      }
    });
  
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  // Utility to get available fields for a component type
  export const getAvailableFields = (componentType: string): string[] => {
    const schema = componentSchemas[componentType];
    if (!schema) return [];
    return Object.keys(schema.fields);
  };
  
  // Function to generate default values for a component
  export const generateDefaultConfig = (componentType: string): Partial<DataInputComponent> => {
    const schema = componentSchemas[componentType];
    if (!schema) return {};
  
    const config: Partial<DataInputComponent> = {};
    
    Object.entries(schema.fields).forEach(([field, fieldSchema]) => {
      if (fieldSchema.defaultValue !== undefined) {
        config[field] = fieldSchema.defaultValue;
      }
    });
  
    return config;
  };
  
  