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
    ButtonColumnField,
    StepperNumberField,
    SliderField,
    InputField,
    SortableField,
    JsonField,
    FileUploadField,
    ButtonSelectionField,
    TagInputField,
    DependentDropdownField,
    AddressBlockField,
    StarRatingField,
    PhoneNumberField,
    RangeSliderField,
} from "@/features/applet/runner/fields";import { ComponentType } from "@/types/customAppTypes";

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
    source?: string;
}



export const fieldController = ({ field, appletId, isMobile, source="applet" }: FieldControllerProps) => {
    switch (field.component) {
        case "textarea": {
            console.log(`Field Controller Rendered: 'textarea' using TextareaField`);
            return <TextareaField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "select": {
            console.log(`Field Controller Rendered: 'select' using SelectField`);
            return <SelectField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }
        case "radio": {
            console.log(`Field Controller Rendered: 'radio' using RadioGroupField`);
            return <RadioGroupField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "checkbox": {
            console.log(`Field Controller Rendered: 'checkbox' using CheckboxGroupField`);
            return <CheckboxGroupField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }
        case "date": {
            console.log(`Field Controller Rendered: 'date' using DateField`);
            return <DateField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "multiDate": {
            console.log(`Field Controller Rendered: 'multiDate' using MultiDateField`);
            return <MultiDateField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "searchableSelect": {
            console.log(`Field Controller Rendered: 'searchableSelect' using SearchableSelectField`);
            return <SearchableSelectField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "directMultiSelect": {
            console.log(`Field Controller Rendered: 'directMultiSelect' using DirectMultiSelectField`);
            return <DirectMultiSelectField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "multiselect": {
            console.log(`Field Controller Rendered: 'multiselect' using MultiSearchableSelectField`);
            return <MultiSearchableSelectField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "dependentDropdown": {
            console.log(`Field Controller Rendered: 'dependentDropdown' using DependentDropdownField`);
            return <DependentDropdownField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        // @ts-ignore   ===== This needs to be updated for all components and then removed.
        case "button":
            console.log('========== button. nor buttonSelection ==========' )

        case "buttonSelection": {
            console.log(`Field Controller Rendered: 'button' or 'buttonSelection' using ButtonSelectionField`);
            return <ButtonSelectionField field={field} appletId={appletId} isMobile={isMobile}  source={source} />;
        }

        case "sortable": {
            console.log(`Field Controller Rendered: 'sortable' using SortableField`);
            return <SortableField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "buttonColumn": {
            console.log(`Field Controller Rendered: 'buttonColumn' using ButtonColumnField`);
            return <ButtonColumnField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "number": {
            console.log(`Field Controller Rendered: 'number' using StepperNumberField`);
            return <StepperNumberField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "simpleNumber": {
            console.log(`Field Controller Rendered: 'simpleNumber' using SimpleNumberField`);
            return <SimpleNumberField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "slider": {
            console.log(`Field Controller Rendered: 'slider' using SliderField`);
            return <SliderField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }
        case "switch": {
            console.log(`Field Controller Rendered: 'switch' using SwitchField`);
            return <SwitchField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "jsonField": {
            console.log(`Field Controller Rendered: 'jsonField' using JsonField`);
            return <JsonField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "fileUpload": {
            console.log(`Field Controller Rendered: 'fileUpload' using FileUploadField`);
            return <FileUploadField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "addressBlock": {
            console.log(`Field Controller Rendered: 'addressBlock' using AddressBlockField`);
            return <AddressBlockField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "starRating": {
            console.log(`Field Controller Rendered: 'starRating' using StarRatingField`);
            return <StarRatingField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "phoneNumber": {
            console.log(`Field Controller Rendered: 'phoneNumber' using PhoneNumberField`);
            return <PhoneNumberField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "rangeSlider": {
            console.log(`Field Controller Rendered: 'rangeSlider' using RangeSliderField`);
            return <RangeSliderField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        case "tagInput": {
            console.log(`Field Controller Rendered: 'tagInput' using TagInputField`);
            return <TagInputField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
        }

        

        default: {
            console.log(`Field Controller Rendered: '${field.component || "default"}' using InputField`);
            return <InputField field={field} appletId={appletId} isMobile={isMobile} source={source} />;
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
