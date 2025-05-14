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
    NumberInputField,
} from "@/features/applet/runner/fields";
import { FieldDefinition } from "@/types/customAppTypes";
import DraggableTableField from "./concepts/DraggableTableField";
import DraggableEditableTableField from "./concepts/DraggableEditableTableField";
import DragEditModifyTableField from "./concepts/DragEditModifyTableField";
import DragTableRowAndColumnField from "./concepts/DragTableRowAndColumnField";


export interface FieldControllerProps {
    field: FieldDefinition;
    appletId: string;
    isMobile?: boolean;
    source?: string;
}

export const AppletFieldController = ({ field, appletId, isMobile, source = "applet" }: FieldControllerProps) => {
    switch (field.component) {
        case "textarea": {
            return <TextareaField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "select": {
            return <SelectField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }
        case "radio": {
            return <RadioGroupField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "checkbox": {
            return <CheckboxGroupField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }
        case "date": {
            return <DateField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "multiDate": {
            return <MultiDateField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "searchableSelect": {
            return <SearchableSelectField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "directMultiSelect": {
            return <DirectMultiSelectField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "multiselect": {
            console.log(`Field Controller Rendered: 'multiselect' using MultiSearchableSelectField`);
            return <MultiSearchableSelectField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "dependentDropdown": {
            return <DependentDropdownField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        // @ts-ignore   ===== This needs to be updated for all components and then removed.
        case "button":
            console.log("========== button. not buttonSelection using ButtonSelectionField ==========");

        case "buttonSelection": {
            return <ButtonSelectionField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "sortable": {
            return <SortableField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "draggableTable": {
            return <DraggableTableField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }
        
        case "draggableEditableTable": {
            return <DraggableEditableTableField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "dragEditModifyTable": {
            return <DragEditModifyTableField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "dragTableRowAndColumn": {
            return <DragTableRowAndColumnField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }


        case "buttonColumn": {
            return <ButtonColumnField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "number": {
            console.log(`Field Controller Rendered: 'number' using StepperNumberField`);
            return <StepperNumberField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "simpleNumber": {
            return <SimpleNumberField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "numberInput": {
            return <NumberInputField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "slider": {
            return <SliderField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }
        case "switch": {
            return <SwitchField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "jsonField": {
            return <JsonField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "fileUpload": {
            return <FileUploadField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "addressBlock": {
            return <AddressBlockField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "starRating": {
            return <StarRatingField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "phoneNumber": {
            return <PhoneNumberField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "rangeSlider": {
            return <RangeSliderField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "tagInput": {
            return <TagInputField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        case "input": {
            return <InputField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }

        default: {
            console.log(`ERROR!!!!!! Invalid field component: '${field.component || "default"}' using InputField ============`);
            return <InputField field={field} appletId={appletId} isMobile={isMobile} source={source} disabled={false} />;
        }
    }
};

export default AppletFieldController;
