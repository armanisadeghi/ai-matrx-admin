import { ComponentType, FieldDefinition } from "@/features/applet/builder/builder.types";
import { 
  GroupFieldConfig, 
  SelectFieldConfig, 
  InputFieldConfig, 
  TextareaFieldConfig,
  ButtonFieldConfig,
  CheckboxGroupFieldConfig,
  RadioGroupFieldConfig,
  SliderFieldConfig,
  MultiSelectFieldConfig,
  NumberInputFieldConfig
} from "../components/field-components/types";
import { SwitchFieldConfig } from "../components/field-components/SwitchField";

// Convert the entire applet definition
export function convertNewFormatToLegacy(appletDefinition: any[]): any[] {
  return appletDefinition.map(group => ({
    ...group,
    fields: group.fields.map((field: FieldDefinition) => convertNewFieldToLegacy(field))
  }));
}

// This function converts the new FieldDefinition format to the old GroupFieldConfig format
export function convertNewFieldToLegacy(field: FieldDefinition): GroupFieldConfig {
  // Create a base field with common properties
  const legacyField: GroupFieldConfig = {
    brokerId: field.id,
    label: field.label,
    helpText: field.helpText,
    placeholder: field.placeholder,
    type: mapComponentTypeToLegacy(field.component),
    isRequired: field.required || false,
    isMobile: false, // Default value
    customConfig: {}
  };

  // Handle component-specific properties based on the component type
  switch (field.component) {
    case 'textarea': {
      legacyField.customConfig = {
        rows: field.componentProps.rows || 3,
        // Default values for missing fields
        resize: 'vertical',
        // Include any additional properties stored in componentProps
        ...field.componentProps
      } as TextareaFieldConfig;
      break;
    }
    case 'select': {
      legacyField.customConfig = {
        options: field.options?.map(option => ({
          value: option.id,
          label: option.label,
          description: option.description
        })) || [],
        // Include any additional properties from componentProps
        ...field.componentProps
      } as SelectFieldConfig;
      break;
    }
    case 'multiselect': {
      legacyField.customConfig = {
        options: field.options?.map(option => ({
          value: option.id,
          label: option.label,
          description: option.description
        })) || [],
        ...field.componentProps
      } as MultiSelectFieldConfig;
      break;
    }
    case 'number': {
      legacyField.customConfig = {
        min: field.componentProps.min,
        max: field.componentProps.max,
        step: field.componentProps.step,
        ...field.componentProps
      } as NumberInputFieldConfig;
      break;
    }
    case 'slider': {
      legacyField.customConfig = {
        min: field.componentProps.min || 0,
        max: field.componentProps.max || 100,
        step: field.componentProps.step || 1,
        ...field.componentProps
      } as SliderFieldConfig;
      break;
    }
    case 'radio': {
      legacyField.customConfig = {
        options: field.options?.map(option => ({
          value: option.id,
          label: option.label,
          description: option.description
        })) || [],
        ...field.componentProps
      } as RadioGroupFieldConfig;
      break;
    }
    case 'checkbox': {
      legacyField.customConfig = {
        options: field.options?.map(option => ({
          id: option.id,
          value: option.id,
          label: option.label,
          description: option.description
        })) || [],
        ...field.componentProps
      } as CheckboxGroupFieldConfig;
      break;
    }
    case 'date': {
      legacyField.customConfig = {
        minDate: field.componentProps.minDate,
        maxDate: field.componentProps.maxDate,
        ...field.componentProps
      } as InputFieldConfig;
      break;
    }
    case 'switch': {
        legacyField.customConfig = {
          onLabel: field.componentProps.onLabel || 'Yes',
          offLabel: field.componentProps.offLabel || 'No',
          ...field.componentProps
        } as SwitchFieldConfig;
        break;
      }
          default: {
      // For basic input or unknown types
      legacyField.customConfig = {
        ...field.componentProps
      } as InputFieldConfig;
      break;
    }
  }

  return legacyField;
}

// Helper function to map new component types to legacy types
function mapComponentTypeToLegacy(newType: ComponentType): "button" | "select" | "input" | "textarea" | "number" | "date" | "checkbox" | "radio" | "slider" | "multiselect" | "switch" {
    const typeMap: Record<ComponentType, "button" | "select" | "input" | "textarea" | "number" | "date" | "checkbox" | "radio" | "slider" | "multiselect" | "switch"> = {
      'input': 'input',
      'textarea': 'textarea',
      'select': 'select',
      'multiselect': 'multiselect',
      'radio': 'radio',
      'checkbox': 'checkbox',
      'slider': 'slider',
      'number': 'number',
      'date': 'date',
      'switch': 'switch'
    };
  
    return typeMap[newType] || 'input';
  }
  