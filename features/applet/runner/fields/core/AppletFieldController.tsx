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
import DraggableTableField from "../concepts/DraggableTableField";
import DraggableEditableTableField from "../concepts/DraggableEditableTableField";
import DragEditModifyTableField from "../concepts/DragEditModifyTableField";
import DragTableRowAndColumnField from "../concepts/DragTableRowAndColumnField";

import ConceptBrokerOptionsField from "../concept-broker-options/SearchableSelectField";


export interface CommonFieldProps {
    field: FieldDefinition;
    sourceId: string;
    isMobile?: boolean;
    source?: string;
    disabled?: boolean;
    className?: string;
}

export const AppletFieldController = ({ field, sourceId, isMobile, source = "applet", disabled = false, className="" }: CommonFieldProps) => {
    switch (field.component) {
        case "textarea": {
            return <TextareaField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "select": {
            return <SelectField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }
        case "radio": {
            return <RadioGroupField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "checkbox": {
            return <CheckboxGroupField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }
        case "date": {
            return <DateField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "multiDate": {
            return <MultiDateField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "searchableSelect": {
            return <SearchableSelectField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "directMultiSelect": {
            return <DirectMultiSelectField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "multiselect": {
            console.log(`Field Controller Rendered: 'multiselect' using MultiSearchableSelectField`);
            return <MultiSearchableSelectField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "dependentDropdown": {
            return <DependentDropdownField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        // @ts-ignore   ===== This needs to be updated for all components and then removed.
        case "button":
            console.log("========== button. not buttonSelection using ButtonSelectionField ==========");

        case "buttonSelection": {
            return <ButtonSelectionField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "sortable": {
            return <SortableField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "draggableTable": {
            return <DraggableTableField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }
        
        case "draggableEditableTable": {
            return <DraggableEditableTableField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "dragEditModifyTable": {
            return <DragEditModifyTableField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "dragTableRowAndColumn": {
            return <DragTableRowAndColumnField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }


        case "buttonColumn": {
            return <ButtonColumnField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "number": {
            console.log(`Field Controller Rendered: 'number' using StepperNumberField`);
            return <StepperNumberField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "simpleNumber": {
            return <SimpleNumberField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "numberInput": {
            return <NumberInputField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "slider": {
            return <SliderField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }
        case "switch": {
            return <SwitchField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "jsonField": {
            return <JsonField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "fileUpload": {
            return <FileUploadField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "addressBlock": {
            return <AddressBlockField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "starRating": {
            return <StarRatingField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "phoneNumber": {
            return <PhoneNumberField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "rangeSlider": {
            return <RangeSliderField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "tagInput": {
            return <TagInputField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "input": {
            return <InputField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        case "conceptBrokerOptions": {
            return <ConceptBrokerOptionsField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }

        default: {
            console.log(`ERROR!!!!!! Invalid field component: '${field.component || "default"}' using InputField ============`);
            return <InputField field={field} sourceId={sourceId} isMobile={isMobile} source={source} disabled={disabled} className={className} />;
        }
    }
};

export default AppletFieldController;
