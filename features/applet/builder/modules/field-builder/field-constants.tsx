import React from "react";
import {
    TextCursorInput,
    Calendar,
    ToggleLeft,
    Check,
    ListFilter,
    RadioTower,
    SlidersHorizontal,
    PanelBottomClose,
    SquareTerminal,
    FileUp,
    Hash,
    SquareStack,
    GripVertical
} from "lucide-react";

// Map of component types to their respective icons with styling
export const componentIconMap: Record<string, React.ReactNode> = {
    input: <TextCursorInput className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
    textarea: <PanelBottomClose className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
    select: <ListFilter className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
    multiselect: <GripVertical className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />,
    radio: <RadioTower className="h-5 w-5 text-pink-500 dark:text-pink-400" />,
    checkbox: <Check className="h-5 w-5 text-green-500 dark:text-green-400" />,
    slider: <SlidersHorizontal className="h-5 w-5 text-orange-500 dark:text-orange-400" />,
    number: <Hash className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
    date: <Calendar className="h-5 w-5 text-red-500 dark:text-red-400" />,
    switch: <ToggleLeft className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />,
    button: <SquareStack className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
    rangeSlider: <SlidersHorizontal className="h-5 w-5 text-teal-500 dark:text-teal-400" />,
    numberPicker: <Hash className="h-5 w-5 text-fuchsia-500 dark:text-fuchsia-400" />,
    jsonField: <SquareTerminal className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
    fileUpload: <FileUp className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
};

// Map of component types to their display names
export const componentTypeNames: Record<string, string> = {
    input: "Text Input",
    textarea: "Text Area",
    select: "Dropdown",
    multiselect: "Multi-Select",
    radio: "Radio Group",
    checkbox: "Checkbox",
    slider: "Slider",
    number: "Number",
    date: "Date Picker",
    switch: "Switch",
    button: "Button",
    rangeSlider: "Range Slider",
    numberPicker: "Number Picker",
    jsonField: "JSON Field",
    fileUpload: "File Upload",
};

// Helper function to get the display name for a component type
export const getComponentTypeName = (componentType: string): string => {
    return componentTypeNames[componentType] || componentType;
};

// Default icon to use if component type is not found in the map
export const getDefaultIcon = (): React.ReactNode => {
    return <TextCursorInput className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
};

// Helper function to get the icon for a component type
export const getComponentIcon = (componentType: string): React.ReactNode => {
    return componentIconMap[componentType] || getDefaultIcon();
};