export type VariableComponentType =
    | "textarea" // Default - multi-line text
    | "toggle" // On/Off with custom labels
    | "radio" // Single select from options
    | "checkbox" // Multi-select from options
    | "select" // Dropdown single select
    | "number"; // Number input with optional min/max/step

export interface VariableCustomComponent {
    type: VariableComponentType;
    options?: string[];
    allowOther?: boolean;
    toggleValues?: [string, string];
    min?: number;
    max?: number;
    step?: number;
}

export interface PromptVariable {
    name: string;
    defaultValue: string;
    customComponent?: VariableCustomComponent;
}
