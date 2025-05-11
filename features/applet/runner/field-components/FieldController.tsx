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
            return <TextareaField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "select": {
            return <SelectField field={field} appletId={appletId} isMobile={isMobile} />;
        }
        case "radio": {
            return <CheckboxGroupField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "radio": {
            return <RadioGroupField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "checkbox": {
            return <CheckboxGroupField field={field} appletId={appletId} isMobile={isMobile} />;
        }
        case "date": {
            return <DateField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "multiDate": {
            return <MultiDateField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "searchableSelect": {
            return <SearchableSelectField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "directMultiSelect": {
            return <DirectMultiSelectField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "multiselect": {
            return <MultiSearchableSelectField field={field} appletId={appletId} isMobile={isMobile} />;
        }
        case "button": {
            return <ButtonSelectionField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "sortable": {
            return <SortableField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "buttonColumn": {
            return <ButtonGroupField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "number": {
            return <StepperNumberField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "simpleNumber": {
            return <SimpleNumberField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "slider": {
            return <SliderField field={field} appletId={appletId} isMobile={isMobile} />;
        }
        case "switch": {
            return <SwitchField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "jsonField": {
            return <JsonField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        case "fileUpload": {
            return <FileUploadField field={field} appletId={appletId} isMobile={isMobile} />;
        }

        default: {
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
