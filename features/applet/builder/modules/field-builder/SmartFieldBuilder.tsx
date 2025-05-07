"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import SmartOptionsManager from "./SmartOptionsManager";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HelpIcon from "@/features/applet/layouts/helpers/HelpIcon";
import {
    selectFieldById,
    selectFieldComponent,
    selectFieldLabel,
    selectFieldDescription,
    selectFieldHelpText,
    selectFieldPlaceholder,
    selectFieldRequired,
    selectFieldDisabled,
    selectFieldIncludeOther,
    selectFieldComponentProps,
    selectFieldIsDirty,
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import {
    setLabel,
    setDescription,
    setHelpText,
    setPlaceholder,
    setRequired,
    setComponent,
    setIncludeOther,
    setComponentProps,
    startFieldCreation,
} from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { componentOptions } from "@/features/applet/runner/components/field-components/FieldController";
import { ComponentType } from "@/features/applet/builder/builder.types";

interface SmartFieldBuilderProps {
    fieldId: string;
}

const helpTextItems = {
    label: "The label or name. This is the most promanent thing the user will see.",
    description:
        "The description is not always visible, depending on your chosen layout. It's a good practice to have one just in case, But the system is designed to work seamlessly without it.",
    helpText:
        "If you don't enter a value, it's perfectly fine. \nIf you enter any text, then the user will see an icon exactly like the one you just hovered and they will see exactly the same thing you're looking at now.",
    placeholder:
        "For most fields, this is not relevant and the system provides a default placeholder, but you can customize it for a better user experience.",
    required:
        "If you make a field required, be aware that this will override any Broker configuration because the user won't be able to submit the form without entering a value.",
    includeOther:
        "If you have a component with 'options', this will allow them to enter their own custom value into an input field as normal text.",
    min: "The minimum value of the field. The system will enforce this minimum so only enter a value if you absolutely do not want anything less than this minimum.",
    max: "The maximum value of the field. The system will enforce this maximum so only enter a value if you absolutely do not want anything more than this maximum.",
    step: "This is primarily relevant for slider fields. It's the amount the slider will increment or decrement by when the user clicks the arrows or drags the slider.",
    rows: "This is primarily relevant for textareas and multiselect fields. It's the number of rows the textarea will see, but it does not impact the amount of text they can enter.\n\nIt's a good practice to play with the rows and watch the preview change to see what feels right for you.",
    minDate:
        "The minimum date of the field. The system will enforce this minimum so only enter a value if you absolutely do not want anything less than this minimum date.",
    maxDate:
        "The maximum date of the field. The system will enforce this maximum so only enter a value if you absolutely do not want anything more than this maximum date.",
    onLabel: "The default is 'Yes' but you can enter anything you wish to use such as True, On, Open, etc.",
    offLabel: "The default is 'No' but you can enter anything you wish to use such as False, Off, Closed, etc.",
    options:
        "This is perhaps the most useful and powerful feature for components. This will allow you to provide users with highly relevant options which can generate highly customized results depending on your workflow or recipe.\n\nYou can often capture a complex text input with this single value, but it's more work for you to set up.",
};

export const SmartFieldBuilder: React.FC<SmartFieldBuilderProps> = ({ fieldId }) => {
    const dispatch = useAppDispatch();

    // Redux selectors for field properties
    const field = useAppSelector((state) => selectFieldById(state, fieldId));
    const component = useAppSelector((state) => selectFieldComponent(state, fieldId));
    const label = useAppSelector((state) => selectFieldLabel(state, fieldId));
    const description = useAppSelector((state) => selectFieldDescription(state, fieldId)) || "";
    const helpText = useAppSelector((state) => selectFieldHelpText(state, fieldId)) || "";
    const placeholder = useAppSelector((state) => selectFieldPlaceholder(state, fieldId)) || "";
    const required = useAppSelector((state) => selectFieldRequired(state, fieldId)) || false;
    const disabled = useAppSelector((state) => selectFieldDisabled(state, fieldId)) || false;
    const includeOther = useAppSelector((state) => selectFieldIncludeOther(state, fieldId)) || false;
    const componentProps = useAppSelector((state) => selectFieldComponentProps(state, fieldId)) || {};

    // Ensure field exists
    useEffect(() => {
        if (!field) {
            dispatch(startFieldCreation({ id: fieldId }));
        }
    }, [fieldId, field, dispatch]);

    if (!field) {
        return <div className="p-4">Loading field...</div>;
    }

    const hasOptions = ["select", "multiselect", "radio", "checkbox"].includes(component || "");

    const canHaveOther = ["select", "multiselect", "radio", "checkbox"].includes(component || "");

    return (
        <div className="py-3 px-2 space-y-4">
            <div>
                <div className="flex items-center gap-1">
                    <Label htmlFor="component" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Component Type
                    </Label>
                </div>
                <Select
                    value={component || "textarea"}
                    onValueChange={(value) => dispatch(setComponent({ id: fieldId, component: value as ComponentType }))}
                >
                    <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1">
                        <SelectValue placeholder="Select component type" />
                    </SelectTrigger>
                    <SelectContent>
                        {[...componentOptions]
                            .sort((a, b) => a.label.localeCompare(b.label))
                            .map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <div className="flex items-center gap-1">
                    <Label htmlFor="label" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Label
                    </Label>
                    <HelpIcon text={helpTextItems.label} />
                </div>
                <Input
                    id="label"
                    name="label"
                    value={label || ""}
                    onChange={(e) => dispatch(setLabel({ id: fieldId, label: e.target.value }))}
                    className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
            </div>

            <div>
                <div className="flex items-center gap-1">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Description
                    </Label>
                    <HelpIcon text={helpTextItems.description} />
                </div>
                <Textarea
                    id="description"
                    name="description"
                    value={description}
                    onChange={(e) => dispatch(setDescription({ id: fieldId, description: e.target.value }))}
                    rows={3}
                    className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
            </div>

            <div>
                <div className="flex items-center gap-1">
                    <Label htmlFor="helpText" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Help Text
                    </Label>
                    <HelpIcon text={helpTextItems.helpText} />
                </div>
                <Textarea
                    id="helpText"
                    name="helpText"
                    value={helpText}
                    onChange={(e) => dispatch(setHelpText({ id: fieldId, helpText: e.target.value }))}
                    rows={2}
                    className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
            </div>

            <div>
                <div className="flex items-center gap-1">
                    <Label htmlFor="placeholder" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Placeholder
                    </Label>
                    <HelpIcon text={helpTextItems.placeholder} />
                </div>
                <Input
                    id="placeholder"
                    name="placeholder"
                    value={placeholder}
                    onChange={(e) => dispatch(setPlaceholder({ id: fieldId, placeholder: e.target.value }))}
                    className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
            </div>

            <div className="flex items-center space-x-2 pl-1">
                <Checkbox
                    id="required"
                    checked={required}
                    onCheckedChange={(checked) => dispatch(setRequired({ id: fieldId, required: !!checked }))}
                />
                <Label htmlFor="required" className="text-gray-800 dark:text-gray-200">
                    Required
                </Label>
                <HelpIcon text={helpTextItems.required} />
            </div>

            {/* Include "Other" option checkbox for applicable component types */}
            {canHaveOther && (
                <div className="flex items-center space-x-2 pl-1">
                    <Checkbox
                        id="includeOther"
                        checked={includeOther}
                        onCheckedChange={(checked) => dispatch(setIncludeOther({ id: fieldId, includeOther: !!checked }))}
                    />
                    <Label htmlFor="includeOther" className="text-gray-800 dark:text-gray-200">
                        Allow "Other" Text Input
                    </Label>
                    <HelpIcon text={helpTextItems.includeOther} />
                </div>
            )}

            {/* Switch component specific properties */}
            {component === "switch" && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center gap-1">
                            <Label htmlFor="onLabel" className="text-xs text-gray-700 dark:text-gray-300">
                                ON Label
                            </Label>
                            <HelpIcon text={helpTextItems.onLabel} />
                        </div>
                        <Input
                            id="onLabel"
                            name="onLabel"
                            value={componentProps.onLabel || "Yes"}
                            onChange={(e) =>
                                dispatch(
                                    setComponentProps({
                                        id: fieldId,
                                        componentProps: {
                                            ...componentProps,
                                            onLabel: e.target.value,
                                        },
                                    })
                                )
                            }
                            className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder="Yes"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-1">
                            <Label htmlFor="offLabel" className="text-xs text-gray-700 dark:text-gray-300">
                                OFF Label
                            </Label>
                            <HelpIcon text={helpTextItems.offLabel} />
                        </div>
                        <Input
                            id="offLabel"
                            name="offLabel"
                            value={componentProps.offLabel || "No"}
                            onChange={(e) =>
                                dispatch(
                                    setComponentProps({
                                        id: fieldId,
                                        componentProps: {
                                            ...componentProps,
                                            offLabel: e.target.value,
                                        },
                                    })
                                )
                            }
                            className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder="No"
                        />
                    </div>
                </div>
            )}

            {(component === "rangeSlider" || component === "slider" || component === "number" || component === "numberPicker") && (
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <div className="flex items-center gap-1">
                            <Label htmlFor="min" className="text-xs text-gray-700 dark:text-gray-300">
                                Min
                            </Label>
                            <HelpIcon text={helpTextItems.min} />
                        </div>
                        <Input
                            type="number"
                            id="min"
                            name="min"
                            value={componentProps.min}
                            onChange={(e) =>
                                dispatch(
                                    setComponentProps({
                                        id: fieldId,
                                        componentProps: {
                                            ...componentProps,
                                            min: parseFloat(e.target.value),
                                        },
                                    })
                                )
                            }
                            className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-1">
                            <Label htmlFor="max" className="text-xs text-gray-700 dark:text-gray-300">
                                Max
                            </Label>
                            <HelpIcon text={helpTextItems.max} />
                        </div>
                        <Input
                            type="number"
                            id="max"
                            name="max"
                            value={componentProps.max}
                            onChange={(e) =>
                                dispatch(
                                    setComponentProps({
                                        id: fieldId,
                                        componentProps: {
                                            ...componentProps,
                                            max: parseFloat(e.target.value),
                                        },
                                    })
                                )
                            }
                            className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-1">
                            <Label htmlFor="step" className="text-xs text-gray-700 dark:text-gray-300">
                                Step
                            </Label>
                            <HelpIcon text={helpTextItems.step} />
                        </div>
                        <Input
                            type="number"
                            id="step"
                            name="step"
                            value={componentProps.step}
                            onChange={(e) =>
                                dispatch(
                                    setComponentProps({
                                        id: fieldId,
                                        componentProps: {
                                            ...componentProps,
                                            step: parseFloat(e.target.value),
                                        },
                                    })
                                )
                            }
                            className="h-8 mt-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                </div>
            )}

            {(component === "textarea" || component === "multiselect") && (
                <div>
                    <div className="flex items-center gap-1">
                        <Label htmlFor="rows" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Rows
                        </Label>
                        <HelpIcon text={helpTextItems.rows} />
                    </div>
                    <div className="flex items-center mt-1 border rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <button
                            type="button"
                            onClick={() => {
                                const currentRows = componentProps.rows || 3;
                                if (currentRows > 1) {
                                    dispatch(
                                        setComponentProps({
                                            id: fieldId,
                                            componentProps: {
                                                ...componentProps,
                                                rows: currentRows - 1,
                                            },
                                        })
                                    );
                                }
                            }}
                            className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-md"
                            aria-label="Decrease rows"
                        >
                            <span className="text-lg">−</span>
                        </button>
                        <div className="flex-1 px-3 py-2 text-center text-gray-900 dark:text-gray-100">{componentProps.rows || 3} rows</div>
                        <button
                            type="button"
                            onClick={() => {
                                const currentRows = componentProps.rows || 3;
                                dispatch(
                                    setComponentProps({
                                        id: fieldId,
                                        componentProps: {
                                            ...componentProps,
                                            rows: currentRows + 1,
                                        },
                                    })
                                );
                            }}
                            className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-md"
                            aria-label="Increase rows"
                        >
                            <span className="text-lg">+</span>
                        </button>
                    </div>
                </div>
            )}

            {component === "date" && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center gap-1">
                            <Label htmlFor="minDate" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Min Date
                            </Label>
                            <HelpIcon text={helpTextItems.minDate} />
                        </div>
                        <Input
                            type="date"
                            id="minDate"
                            name="minDate"
                            value={componentProps.minDate || ""}
                            onChange={(e) =>
                                dispatch(
                                    setComponentProps({
                                        id: fieldId,
                                        componentProps: {
                                            ...componentProps,
                                            minDate: e.target.value,
                                        },
                                    })
                                )
                            }
                            className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-1">
                            <Label htmlFor="maxDate" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Max Date
                            </Label>
                            <HelpIcon text={helpTextItems.maxDate} />
                        </div>
                        <Input
                            type="date"
                            id="maxDate"
                            name="maxDate"
                            value={componentProps.maxDate || ""}
                            onChange={(e) =>
                                dispatch(
                                    setComponentProps({
                                        id: fieldId,
                                        componentProps: {
                                            ...componentProps,
                                            maxDate: e.target.value,
                                        },
                                    })
                                )
                            }
                            className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                </div>
            )}
            {/* Options management for select, multiselect, radio, checkbox */}
            {hasOptions && <SmartOptionsManager fieldId={fieldId} />}
        </div>
    );
};

export default SmartFieldBuilder;
