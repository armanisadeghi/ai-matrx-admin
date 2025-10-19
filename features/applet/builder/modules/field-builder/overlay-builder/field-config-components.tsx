// src/features/field-settings/tabs/BasicTab.tsx
"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import {
    selectFieldLabel,
    selectFieldDescription,
    selectFieldHelpText,
    selectFieldWidth,
    selectFieldDirection,
    selectFieldGridCols,
    selectFieldRows,
    selectFieldMin,
    selectFieldMax,
    selectFieldStep,
    selectFieldValuePrefix,
    selectFieldMultiSelect,
    selectFieldMaxItems,
    selectFieldMinItems,
    selectFieldShowSelectAll,
    selectFieldIncludeOther,
    selectFieldValueSuffix,
    selectFieldMinDate,
    selectFieldMaxDate,
    selectFieldAutoComplete,
    selectFieldSpellCheck,
    selectFieldPlaceholder,
    selectFieldRequired,
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { setLabel, setDescription, setHelpText, setPlaceholder, setRequired } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { fieldHelpTextItems, FieldLabelAndHelpText } from "@/constants/app-builder-help-text";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import HelpIcon from "@/components/official/HelpIcon";
import {
    selectFieldMaxLength,
    selectFieldOnLabel,
    selectFieldOffLabel,
    selectFieldCustomContent,
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { setMaxLength, setOnLabel, setOffLabel, setCustomContent } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { Card, CardContent } from "@/components/ui/card";
import {
    setWidth,
    setDirection,
    setMinDate,
    setMaxDate,
    setAutoComplete,
    setMin,
    setMax,
    setStep,
    setRows,
    setValuePrefix,
    setValueSuffix,
    setGridCols,
    setSpellCheck,
} from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { widthOptions, directionOptions, gridColsOptions } from "@/features/applet/constants/field-constants";
import { fieldDirection } from "@/types/customAppTypes";
import {
    setMultiSelect,
    setMaxItems,
    setMinItems,
    setShowSelectAll,
    setIncludeOther,
} from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { getAutoCompleteDropdownOptions } from "@/features/applet/constants/field-constants";

// INDIVIDUAL COMPONENTS

interface FieldComponentProps {
    fieldId: string;
}

// Field Label Component
export const FieldLabelComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const label = useAppSelector((state) => selectFieldLabel(state, fieldId));

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setLabel({ id: fieldId, label: e.target.value }));
    };

    return (
        <div>
            <div className="flex items-center gap-1">
                <FieldLabelAndHelpText fieldName="label" fieldLabel="Label" required={false} />
            </div>
            <Input
                id="label"
                name="label"
                value={label || ""}
                onChange={handleLabelChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
        </div>
    );
};

// Field Description Component
export const FieldDescriptionComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const description = useAppSelector((state) => selectFieldDescription(state, fieldId));

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(setDescription({ id: fieldId, description: e.target.value }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="description" fieldLabel="Description" required={false} />
            <Textarea
                id="description"
                name="description"
                value={description || ""}
                onChange={handleDescriptionChange}
                rows={3}
                className="resize-none mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
        </div>
    );
};

// Help Text Component
export const FieldHelpTextComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const helpText = useAppSelector((state) => selectFieldHelpText(state, fieldId));

    const handleHelpTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(setHelpText({ id: fieldId, helpText: e.target.value }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="helpText" fieldLabel="Help Text" required={false} />
            <Textarea
                id="helpText"
                name="helpText"
                value={helpText || ""}
                onChange={handleHelpTextChange}
                rows={3}
                className="resize-none mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
        </div>
    );
};

// Placeholder Component
export const FieldPlaceholderComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const placeholder = useAppSelector((state) => selectFieldPlaceholder(state, fieldId));

    const handlePlaceholderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setPlaceholder({ id: fieldId, placeholder: e.target.value }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="placeholder" fieldLabel="Placeholder" required={false} />
            <Input
                id="placeholder"
                name="placeholder"
                value={placeholder || ""}
                onChange={handlePlaceholderChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
        </div>
    );
};

// Required Component
export const FieldRequiredComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const required = useAppSelector((state) => selectFieldRequired(state, fieldId));

    const handleRequiredChange = (checked: boolean) => {
        dispatch(setRequired({ id: fieldId, required: checked }));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                    id="required"
                    checked={required || false}
                    onCheckedChange={(checked) => handleRequiredChange(!!checked)}
                    className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
                />
                <FieldLabelAndHelpText fieldName="required" fieldLabel="Required" required={false} />
            </div>
        </div>
    );
};

// MinDate Component
export const FieldMinDateComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const minDate = useAppSelector((state) => selectFieldMinDate(state, fieldId));

    const handleMinDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setMinDate({ id: fieldId, minDate: e.target.value }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="minDate" fieldLabel="Minimum Date" required={false} />
            <Input
                type="date"
                id="minDate"
                name="minDate"
                value={minDate || ""}
                onChange={handleMinDateChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
            />
        </div>
    );
};

// MaxDate Component
export const FieldMaxDateComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const maxDate = useAppSelector((state) => selectFieldMaxDate(state, fieldId));

    const handleMaxDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setMaxDate({ id: fieldId, maxDate: e.target.value }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="maxDate" fieldLabel="Maximum Date" required={false} />
            <Input
                type="date"
                id="maxDate"
                name="maxDate"
                value={maxDate || ""}
                onChange={handleMaxDateChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
            />
        </div>
    );
};

// DateRangeCard Component - Combines MinDate and MaxDate in a card
export const FieldDateRangeComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    return (
        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure date range limitations</p>

                <div className="grid grid-cols-2 gap-4">
                    <FieldMinDateComponent fieldId={fieldId} />
                    <FieldMaxDateComponent fieldId={fieldId} />
                </div>
            </CardContent>
        </Card>
    );
};

// AutoComplete Component
export const FieldAutoCompleteComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const autoComplete = useAppSelector((state) => selectFieldAutoComplete(state, fieldId));
    const autoCompleteOptions = getAutoCompleteDropdownOptions();

    const handleAutoCompleteChange = (value: string) => {
        dispatch(setAutoComplete({ id: fieldId, autoComplete: value }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="autoComplete" fieldLabel="Autocomplete" required={false} />
            <Select value={autoComplete || "off"} onValueChange={handleAutoCompleteChange}>
                <SelectTrigger className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select autocomplete behavior" />
                </SelectTrigger>
                <SelectContent>
                    {autoCompleteOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export const FieldMinComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const min = useAppSelector((state) => selectFieldMin(state, fieldId));

    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setMin({ id: fieldId, min: parseFloat(e.target.value) || 0 }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="min" fieldLabel="Minimum" required={false} />
            <Input
                type="number"
                id="min"
                name="min"
                value={min === null ? 0 : min}
                onChange={handleMinChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
            />
        </div>
    );
};

// Max Component
export const FieldMaxComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const max = useAppSelector((state) => selectFieldMax(state, fieldId));

    const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setMax({ id: fieldId, max: parseFloat(e.target.value) || 0 }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="max" fieldLabel="Maximum" required={false} />
            <Input
                type="number"
                id="max"
                name="max"
                value={max === null ? 100 : max}
                onChange={handleMaxChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
            />
        </div>
    );
};

// Step Component
export const FieldStepComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const step = useAppSelector((state) => selectFieldStep(state, fieldId));

    const handleStepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setStep({ id: fieldId, step: parseFloat(e.target.value) || 1 }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="step" fieldLabel="Step" required={false} />
            <Input
                type="number"
                id="step"
                name="step"
                min="0.01"
                step="0.01"
                value={step === null ? 1 : step}
                onChange={handleStepChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
            />
        </div>
    );
};

// ValuePrefix Component
export const FieldValuePrefixComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const valuePrefix = useAppSelector((state) => selectFieldValuePrefix(state, fieldId));

    const handleValuePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setValuePrefix({ id: fieldId, valuePrefix: e.target.value }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="valuePrefix" fieldLabel="Value Prefix" required={false} />
            <Input
                id="valuePrefix"
                name="valuePrefix"
                value={valuePrefix || ""}
                onChange={handleValuePrefixChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
                placeholder="e.g., $"
            />
        </div>
    );
};

// ValueSuffix Component
export const FieldValueSuffixComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const valueSuffix = useAppSelector((state) => selectFieldValueSuffix(state, fieldId));

    const handleValueSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setValueSuffix({ id: fieldId, valueSuffix: e.target.value }));
    };

    return (
        <div>
            <FieldLabelAndHelpText fieldName="valueSuffix" fieldLabel="Value Suffix" required={false} />
            <Input
                id="valueSuffix"
                name="valueSuffix"
                value={valueSuffix || ""}
                onChange={handleValueSuffixChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
                placeholder="e.g., %"
            />
        </div>
    );
};

// Range Card Component
export const FieldRangeCardComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    return (
        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure the range and step for numeric values.</p>

                <div className="grid grid-cols-3 gap-4">
                    <FieldMinComponent fieldId={fieldId} />
                    <FieldMaxComponent fieldId={fieldId} />
                    <FieldStepComponent fieldId={fieldId} />
                </div>
            </CardContent>
        </Card>
    );
};

// Format Card Component
export const FieldFormatCardComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    return (
        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Number formatting and display</p>

                <div className="grid grid-cols-2 gap-4">
                    <FieldValuePrefixComponent fieldId={fieldId} />
                    <FieldValueSuffixComponent fieldId={fieldId} />
                </div>
            </CardContent>
        </Card>
    );
};

// Rows Component
export const FieldRowsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const rows = useAppSelector((state) => selectFieldRows(state, fieldId));

    const handleRowsDecrease = () => {
        if (rows && rows > 1) {
            dispatch(setRows({ id: fieldId, rows: rows - 1 }));
        }
    };

    const handleRowsIncrease = () => {
        dispatch(setRows({ id: fieldId, rows: rows ? rows + 1 : 1 }));
    };

    return (
        <div>
            <div className="flex items-center gap-1">
                <Label htmlFor="rows" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Rows / Items Per View
                </Label>
                <HelpIcon text={fieldHelpTextItems.rows || "Number of rows or items to display before scrolling"} />
            </div>
            <div className="flex items-center mt-1 border rounded-md border-gray-200 dark:border-gray-700 bg-textured">
                <button
                    type="button"
                    onClick={handleRowsDecrease}
                    className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-md"
                    aria-label="Decrease rows"
                >
                    <span className="text-lg">−</span>
                </button>
                <div className="flex-1 px-3 py-2 text-center text-gray-900 dark:text-gray-100">{rows || 0} rows</div>
                <button
                    type="button"
                    onClick={handleRowsIncrease}
                    className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-md"
                    aria-label="Increase rows"
                >
                    <span className="text-lg">+</span>
                </button>
            </div>
        </div>
    );
};

export const FieldMultiSelectComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const multiSelect = useAppSelector((state) => selectFieldMultiSelect(state, fieldId));

    const handleMultiSelectChange = (checked: boolean) => {
        dispatch(setMultiSelect({ id: fieldId, multiSelect: checked }));
    };

    return (
        <div className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
                id="multiSelect"
                checked={multiSelect || false}
                onCheckedChange={(checked) => handleMultiSelectChange(!!checked)}
                className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
            />
            <Label
                htmlFor="multiSelect"
                className="text-gray-800 dark:text-gray-200 cursor-pointer"
                onClick={() => handleMultiSelectChange(!multiSelect)}
            >
                Allow Multiple Selection
            </Label>
            <HelpIcon text={fieldHelpTextItems.multiSelect || "Allow users to select multiple options"} />
        </div>
    );
};

// ShowSelectAll Component
export const FieldShowSelectAllComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const showSelectAll = useAppSelector((state) => selectFieldShowSelectAll(state, fieldId));

    const handleShowSelectAllChange = (checked: boolean) => {
        dispatch(setShowSelectAll({ id: fieldId, showSelectAll: checked }));
    };

    return (
        <div className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
                id="showSelectAll"
                checked={showSelectAll || false}
                onCheckedChange={(checked) => handleShowSelectAllChange(!!checked)}
                className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
            />
            <Label
                htmlFor="showSelectAll"
                className="text-gray-800 dark:text-gray-200 cursor-pointer"
                onClick={() => handleShowSelectAllChange(!showSelectAll)}
            >
                Show "Select All" Option
            </Label>
            <HelpIcon text={fieldHelpTextItems.showSelectAll || "Shows a 'Select All' option for multi-select fields"} />
        </div>
    );
};

// IncludeOther Component
export const FieldIncludeOtherComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const includeOther = useAppSelector((state) => selectFieldIncludeOther(state, fieldId));

    const handleIncludeOtherChange = (checked: boolean) => {
        dispatch(setIncludeOther({ id: fieldId, includeOther: checked }));
    };

    return (
        <div className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
                id="includeOther"
                checked={includeOther || false}
                onCheckedChange={(checked) => handleIncludeOtherChange(!!checked)}
                className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
            />
            <Label
                htmlFor="includeOther"
                className="text-gray-800 dark:text-gray-200 cursor-pointer"
                onClick={() => handleIncludeOtherChange(!includeOther)}
            >
                Include "Other" Option
            </Label>
            <HelpIcon text={fieldHelpTextItems.includeOther || "Add an 'Other' option with a text input"} />
        </div>
    );
};

// Selection Options Card Component
export const FieldSelectionOptionsCardComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    return (
        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-4">
                <FieldMultiSelectComponent fieldId={fieldId} />
                <FieldShowSelectAllComponent fieldId={fieldId} />
                <FieldIncludeOtherComponent fieldId={fieldId} />
            </CardContent>
        </Card>
    );
};

// MinItems Component
export const FieldMinItemsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const minItems = useAppSelector((state) => selectFieldMinItems(state, fieldId));

    const handleMinItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setMinItems({ id: fieldId, minItems: parseInt(e.target.value) || 0 }));
    };

    return (
        <div>
            <div className="flex items-center gap-1">
                <Label htmlFor="minItems" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Minimum Items
                </Label>
                <HelpIcon text={fieldHelpTextItems.minItems || "Minimum number of items that must be selected"} />
            </div>
            <Input
                type="number"
                id="minItems"
                name="minItems"
                min={0}
                value={minItems === null ? 0 : minItems}
                onChange={handleMinItemsChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
        </div>
    );
};

// MaxItems Component
export const FieldMaxItemsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const maxItems = useAppSelector((state) => selectFieldMaxItems(state, fieldId));

    const handleMaxItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === "" ? undefined : parseInt(e.target.value);
        dispatch(setMaxItems({ id: fieldId, maxItems: val }));
    };

    return (
        <div>
            <div className="flex items-center gap-1">
                <Label htmlFor="maxItems" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Maximum Items
                </Label>
                <HelpIcon text={fieldHelpTextItems.maxItems || "Maximum number of items that can be selected"} />
            </div>
            <Input
                type="number"
                id="maxItems"
                name="maxItems"
                min={0}
                value={maxItems === null || maxItems === undefined ? "" : maxItems}
                onChange={handleMaxItemsChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="No limit"
            />
        </div>
    );
};

// Width Component
export const FieldWidthComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const width = useAppSelector((state) => selectFieldWidth(state, fieldId));

    const handleWidthChange = (value: string) => {
        dispatch(setWidth({ id: fieldId, width: value }));
    };

    return (
        <div>
            <div className="flex items-center gap-1">
                <Label htmlFor="width" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Width
                </Label>
                <HelpIcon text={fieldHelpTextItems.width || "Controls the width of the field"} />
            </div>
            <Select value={width || undefined} onValueChange={handleWidthChange}>
                <SelectTrigger className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select width" />
                </SelectTrigger>
                <SelectContent>
                    {widthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

// Direction Component
export const FieldDirectionComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const direction = useAppSelector((state) => selectFieldDirection(state, fieldId));

    const handleDirectionChange = (value: fieldDirection) => {
        dispatch(setDirection({ id: fieldId, direction: value }));
    };

    return (
        <div>
            <div className="flex items-center gap-1">
                <Label htmlFor="direction" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Layout Direction
                </Label>
                <HelpIcon text={fieldHelpTextItems.direction || "Controls the layout direction"} />
            </div>
            <Select value={direction || undefined} onValueChange={handleDirectionChange}>
                <SelectTrigger className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                    {directionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

// Grid Columns Component
export const FieldGridColsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const gridCols = useAppSelector((state) => selectFieldGridCols(state, fieldId));

    const handleGridColsChange = (value: string) => {
        dispatch(setGridCols({ id: fieldId, gridCols: value }));
    };

    return (
        <div>
            <div className="flex items-center gap-1">
                <Label htmlFor="gridCols" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Grid Columns
                </Label>
                <HelpIcon text={fieldHelpTextItems.gridCols || "Number of columns in the grid layout"} />
            </div>
            <Select value={gridCols || undefined} onValueChange={handleGridColsChange}>
                <SelectTrigger className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select grid columns" />
                </SelectTrigger>
                <SelectContent>
                    {gridColsOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

// Spell Check Component
export const FieldSpellCheckComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const spellCheck = useAppSelector((state) => selectFieldSpellCheck(state, fieldId));

    const handleSpellCheckChange = (checked: boolean) => {
        dispatch(setSpellCheck({ id: fieldId, spellCheck: checked }));
    };

    return (
        <div className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
                id="spellCheck"
                checked={spellCheck || false}
                onCheckedChange={(checked) => handleSpellCheckChange(!!checked)}
                className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
            />
            <Label
                htmlFor="spellCheck"
                className="text-gray-800 dark:text-gray-200 cursor-pointer"
                onClick={() => handleSpellCheckChange(!spellCheck)}
            >
                Enable Spell Check
            </Label>
            <HelpIcon text={fieldHelpTextItems.spellCheck || "Enables browser spell checking"} />
        </div>
    );
};

// MaxLength Component
export const FieldMaxLengthComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const maxLength = useAppSelector((state) => selectFieldMaxLength(state, fieldId));

    const handleMaxLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === "" ? undefined : parseInt(e.target.value);
        dispatch(setMaxLength({ id: fieldId, maxLength: val }));
    };

    return (
        <div>
            <div className="flex items-center gap-1">
                <Label htmlFor="maxLength" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Maximum Length
                </Label>
                <HelpIcon text={fieldHelpTextItems.maxLength || "Maximum number of characters allowed"} />
            </div>
            <Input
                type="number"
                id="maxLength"
                name="maxLength"
                min={0}
                value={maxLength === null || maxLength === undefined ? "" : maxLength}
                onChange={handleMaxLengthChange}
                className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
                placeholder="No limit"
            />
        </div>
    );
};

// Toggle Labels Component
export const FieldToggleLabelsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const onLabel = useAppSelector((state) => selectFieldOnLabel(state, fieldId));
    const offLabel = useAppSelector((state) => selectFieldOffLabel(state, fieldId));

    const handleOnLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setOnLabel({ id: fieldId, onLabel: e.target.value }));
    };

    const handleOffLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setOffLabel({ id: fieldId, offLabel: e.target.value }));
    };

    return (
        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Label settings for toggle components</p>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <FieldLabelAndHelpText fieldName="onLabel" fieldLabel="On Label" required={false} />
                        <Input
                            id="onLabel"
                            name="onLabel"
                            value={onLabel || ""}
                            onChange={handleOnLabelChange}
                            className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
                            placeholder="Yes"
                        />
                    </div>

                    <div>
                        <div className="flex items-center gap-1">
                            <Label htmlFor="offLabel" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                OFF Label
                            </Label>
                            <HelpIcon text={fieldHelpTextItems.offLabel || "Label for the 'off' state (e.g., No)"} />
                        </div>
                        <Input
                            id="offLabel"
                            name="offLabel"
                            value={offLabel || ""}
                            onChange={handleOffLabelChange}
                            className="mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
                            placeholder="No"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Custom Content Component
export const FieldCustomContentComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();
    const customContent = useAppSelector((state) => selectFieldCustomContent(state, fieldId));

    const handleCustomContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(setCustomContent({ id: fieldId, customContent: e.target.value }));
    };

    return (
        <div>
            <div className="flex items-center gap-1 mb-2">
                <Label htmlFor="customContent" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Custom Content
                </Label>
                <HelpIcon text={fieldHelpTextItems.customContent || "Custom content for the field (HTML/Markdown supported)"} />
            </div>
            <Textarea
                id="customContent"
                name="customContent"
                value={(customContent || "") as string}
                onChange={handleCustomContentChange}
                rows={5}
                className="resize-none mt-1 border-gray-200 dark:border-gray-700 bg-textured text-gray-900 dark:text-gray-100"
                placeholder="Enter custom content here (supports HTML and Markdown)..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This field accepts HTML and Markdown for rich formatting.</p>
        </div>
    );
};
