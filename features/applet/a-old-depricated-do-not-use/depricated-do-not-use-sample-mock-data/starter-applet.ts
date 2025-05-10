import { 
    AppletContainersConfig, 
    GroupFieldConfig,
    CheckboxGroupFieldConfig
} from "../runner-depreciated-do-not-use/components/field-components/types";

// This is a placeholder field for group checkboxes - we'll replace this dynamically
const placeholderCheckboxGroupField: GroupFieldConfig = {
    brokerId: "checkbox-group-placeholder-id",
    label: "Sample Checkbox Group",
    placeholder: "Select all that apply",
    type: "checkbox",
    customConfig: {
        options: [
            { id: "option-1", label: "Option 1", value: "option-1" },
            { id: "option-2", label: "Option 2", value: "option-2" },
            { id: "option-3", label: "Option 3", value: "option-3" }
        ],
        includeOther: true,
        direction: "vertical"
    }
};

// This is a placeholder field for single checkbox - we'll replace this dynamically
const placeholderSingleCheckboxField: GroupFieldConfig = {
    brokerId: "checkbox-single-placeholder-id",
    label: "Sample Checkbox",
    placeholder: "Sample checkbox placeholder",
    type: "checkbox",
    customConfig: {
        checkboxLabel: "Check me",
        required: false,
        defaultChecked: false,
        value: "true"
    }
};

// Default to checkbox group for initial display
let activeCheckboxField = placeholderCheckboxGroupField;

// Group container that will hold our checkbox field
const checkboxGroupContainer: AppletContainersConfig = {
    id: "sample-checkbox-group",
    label: "Sample Form Section",
    placeholder: "Sample form section with checkbox",
    description: "This section demonstrates a checkbox field",
    fields: [activeCheckboxField]
};

// The full applet configuration
export const starterAppletConfig: AppletContainersConfig[] = [
    checkboxGroupContainer
];

// Export the original fields for reference
export const originalCheckboxGroupField = { ...placeholderCheckboxGroupField };
export const originalSingleCheckboxField = { ...placeholderSingleCheckboxField };

// Helper function to update the field in place
export const updateCheckboxField = (newField: GroupFieldConfig) => {
    // Update the first field in the first container
    if (starterAppletConfig.length > 0 && starterAppletConfig[0].fields.length > 0) {
        starterAppletConfig[0].fields[0] = { ...newField };
        activeCheckboxField = newField;
    }
};

// Helper function to update the group container
export const updateCheckboxGroup = (groupLabel: string, groupPlaceholder: string, groupDescription?: string) => {
    if (starterAppletConfig.length > 0) {
        starterAppletConfig[0].label = groupLabel;
        starterAppletConfig[0].placeholder = groupPlaceholder;
        if (groupDescription) {
            starterAppletConfig[0].description = groupDescription;
        }
    }
}; 