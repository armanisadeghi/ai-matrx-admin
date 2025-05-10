"use client";

import React from "react";
import {
    GroupFieldConfig,
    TabSearchConfig,
    SelectFieldConfig,
    ButtonFieldConfig,
    TextareaFieldConfig,
    InputFieldConfig,
    SelectField,
    ButtonField,
    TextareaField,
    InputField,
    NumberInputField,
    CheckboxGroupField,
    RadioGroupField,
    SliderField,
    MultiSelectField,
    CheckboxGroupFieldConfig,
    RadioGroupFieldConfig,
    SliderFieldConfig,
    MultiSelectFieldConfig,
} from ".";
import { SwitchField, SwitchFieldConfig } from "./SwitchField";

// ========================== TODO: Some of these types need to be added to the field controller. ============================================

export const componentOptions: { value: ComponentType; label: string }[] = [
    { value: "textarea", label: "Textarea" },
    { value: "input", label: "Input" },
    { value: "select", label: "Select" },
    { value: "multiselect", label: "Multiselect" },
    { value: "radio", label: "Radio" },
    { value: "checkbox", label: "Checkbox" },
    { value: "slider", label: "Slider" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "switch", label: "Switch" },
    { value: "button", label: "Button" },
    { value: "rangeSlider", label: "Range Slider" },
    { value: "numberPicker", label: "Number Picker" },
    { value: "jsonField", label: "JSON Field" },
    { value: "fileUpload", label: "File Upload" },
];
export type ComponentType =
    | "input"
    | "textarea"
    | "select"
    | "multiselect"
    | "radio"
    | "checkbox"
    | "slider"
    | "number"
    | "date"
    | "switch"
    | "button"
    | "rangeSlider"
    | "numberPicker"
    | "jsonField"
    | "fileUpload";

export interface FieldOption {
    id: string;
    label: string;
    description?: string;
    helpText?: string;
    iconName?: string;
}

export interface ComponentProps {
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
    minDate?: string;
    maxDate?: string;
    onLabel?: string;
    offLabel?: string;
}

export interface FieldDefinition {
    id: string;
    label: string;
    description?: string;
    helpText?: string;
    group?: string;
    iconName?: string;
    component: ComponentType;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    defaultValue?: any;
    options?: FieldOption[];
    componentProps: ComponentProps;
    includeOther?: boolean;
}

export const fieldController = (field: FieldDefinition, isMobile?: boolean) => {
    switch (field.component) {
        case "textarea": {
            return <TextareaField field={field} isMobile={isMobile} />;
        }
        case "select": {
            return <SelectField id={field.id} label={field.label} placeholder={field.placeholder || ""} isMobile={isMobile} />;
        }
        case "button": {
            return <ButtonField id={field.id} label={field.label} placeholder={field.placeholder || ""} isMobile={isMobile} />;
        }

        case "date": {
            return (
                <InputField
                    id={field.id}
                    label={field.label}
                    placeholder={field.placeholder || ""}
                    customConfig={{ type: "date" }}
                    isMobile={isMobile}
                />
            );
        }
        case "number": {
            return <NumberInputField id={field.id} label={field.label} placeholder={field.placeholder || ""} isMobile={isMobile} />;
        }
        case "checkbox": {
            return <CheckboxGroupField id={field.id} label={field.label} placeholder={field.placeholder || ""} isMobile={isMobile} />;
        }
        case "radio": {
            return <RadioGroupField id={field.id} label={field.label} placeholder={field.placeholder || ""} isMobile={isMobile} />;
        }
        case "slider": {
            return <SliderField id={field.id} label={field.label} placeholder={field.placeholder || ""} isMobile={isMobile} />;
        }
        case "multiselect": {
            return <MultiSelectField id={field.id} label={field.label} placeholder={field.placeholder || ""} isMobile={isMobile} />;
        }
        case "switch": {
            return <SwitchField id={field.id} label={field.label} placeholder={field.placeholder || ""} isMobile={isMobile} />;
        }

        default: {
            return <InputField id={field.id} label={field.label} placeholder={field.placeholder || ""} isMobile={isMobile} />;
        }
    }
};
