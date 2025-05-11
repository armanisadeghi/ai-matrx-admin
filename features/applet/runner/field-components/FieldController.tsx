"use client";

import React from "react";
import {
    RadioGroupField,
    DirectMultiSelectField,
    SearchableSelectField,
    MultiSearchableSelectField,
    CheckboxGroupField,
    DateField,
    MultiDateField,
    TextareaField,
    SelectField,
    SimpleNumberField,
    SwitchField,
    ButtonGroupField,
    StepperNumberField,
    SliderField,
    InputField,
    SortableField,
    JsonField,
    FileUploadField,
    ButtonSelectionField,
} from "@/features/applet/runner/fields";
import { ComponentType } from "@/types/customAppTypes";

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

export interface FieldControllerProps {
    field: FieldDefinition;
    appletId: string;
    isMobile?: boolean;
}

export const fieldController = ({ field, appletId, isMobile }: FieldControllerProps) => {
    switch (field.component) {
        case "textarea": {
            console.log(`Field Controller Rendered: 'textarea' using TextareaField`);
            return <TextareaField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "select": {
            console.log(`Field Controller Rendered: 'select' using SelectField`);
            return <SelectField field={field} appletId={appletId} isMobile={isMobile} />;
        }
        case "radio": {
            console.log(`Field Controller Rendered: 'radio' using RadioGroupField`);
            return <RadioGroupField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "checkbox": {
            console.log(`Field Controller Rendered: 'checkbox' using CheckboxGroupField`);
            return <CheckboxGroupField field={field} appletId={appletId} isMobile={isMobile} />;
        }
        case "date": {
            console.log(`Field Controller Rendered: 'date' using DateField`);
            return <DateField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "multiDate": {
            console.log(`Field Controller Rendered: 'multiDate' using MultiDateField`);
            return <MultiDateField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "searchableSelect": {
            console.log(`Field Controller Rendered: 'searchableSelect' using SearchableSelectField`);
            return <SearchableSelectField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "directMultiSelect": {
            console.log(`Field Controller Rendered: 'directMultiSelect' using DirectMultiSelectField`);
            return <DirectMultiSelectField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "multiselect": {
            console.log(`Field Controller Rendered: 'multiselect' using MultiSearchableSelectField`);
            return <MultiSearchableSelectField field={field} appletId={appletId} isMobile={isMobile} />;
        }
        case "buttonSelection":
        case "button": {
            console.log(`Field Controller Rendered: 'button' using ButtonSelectionField`);
            return <ButtonSelectionField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "sortable": {
            console.log(`Field Controller Rendered: 'sortable' using SortableField`);
            return <SortableField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "buttonGroup":
        case "buttonColumn": {
            console.log(`Field Controller Rendered: 'buttonColumn' using ButtonGroupField`);
            return <ButtonGroupField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "number": {
            console.log(`Field Controller Rendered: 'number' using StepperNumberField`);
            return <StepperNumberField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "simpleNumber": {
            console.log(`Field Controller Rendered: 'simpleNumber' using SimpleNumberField`);
            return <SimpleNumberField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "slider": {
            console.log(`Field Controller Rendered: 'slider' using SliderField`);
            return <SliderField field={field} appletId={appletId} isMobile={isMobile} />;
        }
        case "switch": {
            console.log(`Field Controller Rendered: 'switch' using SwitchField`);
            return <SwitchField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "jsonField": {
            console.log(`Field Controller Rendered: 'jsonField' using JsonField`);
            return <JsonField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "fileUpload": {
            console.log(`Field Controller Rendered: 'fileUpload' using FileUploadField`);
            return <FileUploadField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        default: {
            console.log(`Field Controller Rendered: '${field.component || "default"}' using InputField`);
            return <InputField field={field} appletId={appletId} isMobile={isMobile} />;
        }
    }
};

/* for testing.

        case "textarea":
        case "radio": {
            return (
                <div className="flex flex-col gap-6 w-full">
                    <TextareaField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <SelectField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <RadioGroupField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <CheckboxGroupField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <DateField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <MultiDateField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <SearchableSelectField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <DirectMultiSelectField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <MultiSearchableSelectField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <ButtonSelectionField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <SortableField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <ButtonGroupField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <StepperNumberField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <SimpleNumberField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <SliderField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <SwitchField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <JsonField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <FileUploadField field={field} appletId={appletId} isMobile={isMobile} />
                    <hr className="border-gray-300 dark:border-gray-700" />

                    <InputField field={field} appletId={appletId} isMobile={isMobile} />
                </div>
            );
        }

*/
