import React from "react";
import { ComponentProps, ComponentType } from "@/types/customAppTypes";
import {
    TextCursorInput,
    PanelBottomClose,
    ListFilter,
    GripVertical,
    RadioTower,
    Check,
    SlidersHorizontal,
    Hash,
    Calendar,
    ToggleLeft,
    SquareStack,
    SquareTerminal,
    FileUp,
    Search,
    Tag,
    ChevronsUpDown,
    MapPin,
    Star,
    Phone,
    Layers,
} from "lucide-react";

// Unified component information including icon, display name, and component details
export interface ComponentInfo {
    icon: React.ReactNode;
    displayName: string;
    description?: string; // Optional field for component description
    examples?: string; // Optional field for examples of how to use the component
    category?: string; // Optional field for component category
    fieldComponent?: string; // Corresponding field component file
}

// The complete unified mapping
export const componentMap: Record<ComponentType, ComponentInfo> = {
    // Text inputs
    input: {
        icon: <TextCursorInput className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
        displayName: "Text Input",
        description: "A small, single line text input field. Good for a few words or a short sentence.",
        examples: "Name, Address, Phone Number",
        fieldComponent: "InputField.tsx",
        category: "Text Entry",
    },
    textarea: {
        icon: <PanelBottomClose className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
        displayName: "Text Area",
        description: "A multi-line text input field. Good for longer text, paragraphs, or multi-line input.",
        examples: "Bio, Description, Notes",
        fieldComponent: "TextareaField.tsx",
        category: "Text Entry",
    },

    // Selections
    select: {
        icon: <ListFilter className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
        displayName: "Dropdown",
        description: "A dropdown list of options. Good for selecting one option from a list.",
        examples: "Country, State, City",
        fieldComponent: "SelectField.tsx",
        category: "Option List Selection",
    },
    multiselect: {
        icon: <GripVertical className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />,
        displayName: "Multi-Select",
        description: "A dropdown list of options that allows multiple selections. Good for selecting multiple options from a list.",
        examples: "Tags, Colors, Ingredients",
        fieldComponent: "SelectField.tsx", // Uses SelectField with multi prop
        category: "Option List Selection",
    },
    searchableSelect: {
        icon: <Search className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
        displayName: "Searchable Select",
        description: "A dropdown list of options that allows searching for an option. Good for selecting one option from a large list.",
        examples: "Country, State, City",
        fieldComponent: "SearchableSelectField.tsx",
        category: "Option List Selection",
    },
    multiSearchableSelect: {
        icon: <Search className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
        displayName: "Multi Searchable Select",
        description:
            "A dropdown list of options that allows searching for multiple options. Good for selecting multiple options from a large list.",
        examples: "Tags, Colors, Ingredients",
        fieldComponent: "MultiSearchableSelectField.tsx",
        category: "Option List Selection",
    },
    directMultiSelect: {
        icon: <GripVertical className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />,
        displayName: "Direct Multi-Select",
        description:
            "Shows a list of all options in a column. Good for selecting multiple options from a short list where you want to show all options at once.",
        examples: "Tags, Colors, Ingredients",
        fieldComponent: "DirectMultiSelectField.tsx",
        category: "Option List Selection",
    },
    dependentDropdown: {
        icon: <ChevronsUpDown className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
        displayName: "Dependent Dropdown",
        description:
            "A dropdown list where the first selection determines the options in the second dropdown, then a third, or fourth, etc.",
        examples: "Select a country, then select a state, then select a city",
        fieldComponent: "DependentDropdownField.tsx",
        category: "Option List Selection",
    },

    // Toggle & Option Groups
    radio: {
        icon: <RadioTower className="h-5 w-5 text-pink-500 dark:text-pink-400" />,
        displayName: "Radio Group",
        description: "A group of radio buttons. Good for selecting one option from a list.",
        examples: "What is your age? 18-25, 26-35, 36-45, etc.",
        fieldComponent: "RadioGroupField.tsx",
        category: "Option List Selection",
    },
    checkbox: {
        icon: <Check className="h-5 w-5 text-green-500 dark:text-green-400" />,
        displayName: "Checkbox Group",
        description: "A group of checkboxes. Good for selecting multiple options from a list.",
        examples: "Select all of your favorite activities. (hiking, reading, cooking, programming, etc.)",
        fieldComponent: "CheckboxGroupField.tsx",
        category: "Option List Selection",
    },
    switch: {
        icon: <ToggleLeft className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />,
        displayName: "Switch",
        description:
            "A toggle switch. Good for things that are either one of two values. Defaults to 'on' and 'off' but can be customized.",
        examples: "Do you want to receive email updates? Yes, No",
        fieldComponent: "SwitchField.tsx",
        category: "Two-Option Selection",
    },

    buttonSelection: {
        icon: <SquareStack className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
        displayName: "Button Selection",
        description: "A group of buttons that allows the user to select one or more options from a list by clicking them on or off.",
        examples: "Select shopping categories: (groceries, electronics, clothing, etc.)",
        fieldComponent: "ButtonSelectionField.tsx",
        category: "Option List Selection",
    },

    buttonColumn: {
        icon: <SquareStack className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
        displayName: "Button Column",
        description:
            "A column with individual buttons for each row to allow users to select one or more. Great when you have limited options or when you want to make the options highly visible.",
        examples: "Select shopping categories: (groceries, electronics, clothing, etc.)",
        fieldComponent: "ButtonColumnField.tsx",
        category: "Option List Selection",
    },

    // Number inputs
    number: {
        icon: <Hash className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
        displayName: "Number",
        fieldComponent: "InputField.tsx", // With type="number"
    },
    numberPicker: {
        icon: <Hash className="h-5 w-5 text-fuchsia-500 dark:text-fuchsia-400" />,
        displayName: "Number Picker",
        fieldComponent: "NumberPickerField.tsx", // Implied from structure
    },
    simpleNumber: {
        icon: <Hash className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
        displayName: "Simple Number",
        fieldComponent: "SimpleNumberField.tsx",
    },
    stepperNumber: {
        icon: <Hash className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
        displayName: "Stepper Number",
        fieldComponent: "StepperNumberField.tsx",
    },

    numberInput: {
        icon: <Hash className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
        displayName: "Number Input",
        fieldComponent: "NumberInputField.tsx",
    },

    // Range inputs
    slider: {
        icon: <SlidersHorizontal className="h-5 w-5 text-orange-500 dark:text-orange-400" />,
        displayName: "Slider",
        fieldComponent: "SliderField.tsx",
    },
    rangeSlider: {
        icon: <SlidersHorizontal className="h-5 w-5 text-teal-500 dark:text-teal-400" />,
        displayName: "Range Slider",
        fieldComponent: "RangeSlider.tsx",
    },

    // Date inputs
    date: {
        icon: <Calendar className="h-5 w-5 text-red-500 dark:text-red-400" />,
        displayName: "Date Picker",
        fieldComponent: "DateField.tsx",
    },
    multiDate: {
        icon: <Calendar className="h-5 w-5 text-red-500 dark:text-red-400" />,
        displayName: "Multi-Date",
        fieldComponent: "MultiDateField.tsx",
    },

    // Special inputs
    jsonField: {
        icon: <SquareTerminal className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
        displayName: "JSON Field",
        fieldComponent: "JSONField.tsx",
    },
    fileUpload: {
        icon: <FileUp className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
        displayName: "File Upload",
        fieldComponent: "FileUploadField.tsx",
    },
    sortable: {
        icon: <GripVertical className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />,
        displayName: "Sortable",
        fieldComponent: "SortableField.tsx",
    },
    tagInput: {
        icon: <Tag className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
        displayName: "Tag Input",
        fieldComponent: "TagInputField.tsx",
    },
    addressBlock: {
        icon: <MapPin className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
        displayName: "Address Block",
        fieldComponent: "AddressBlockField.tsx",
    },
    starRating: {
        icon: <Star className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />,
        displayName: "Star Rating",
        fieldComponent: "StarRatingField.tsx",
    },
    phoneNumber: {
        icon: <Phone className="h-5 w-5 text-green-500 dark:text-green-400" />,
        displayName: "Phone Number",
        fieldComponent: "PhoneNumberField.tsx",
    },
};

// Helper function to get component information
export const getComponentInfo = (componentType: ComponentType | string): ComponentInfo => {
    if (componentType in componentMap) {
        return componentMap[componentType as ComponentType];
    }

    // Default component info if type not found
    return {
        icon: <TextCursorInput className="h-5 w-5 text-gray-500 dark:text-gray-400" />,
        displayName: String(componentType),
    };
};

// Derive options for select components
export const componentOptions = Object.entries(componentMap).map(([value, info]) => ({
    value: value as ComponentType,
    label: info.displayName,
}));

// Helper functions for easier access
export const getComponentIcon = (componentType: ComponentType | string): React.ReactNode => {
    return getComponentInfo(componentType).icon;
};

export const getComponentTypeName = (componentType: ComponentType | string): string => {
    return getComponentInfo(componentType).displayName;
};

// Default icon function (maintained for backward compatibility)
export const getDefaultIcon = (): React.ReactNode => {
    return <TextCursorInput className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
};

export const FIELD_DEFAULT_COMPONENT_PROPS: ComponentProps = {
    min: 0,
    max: 100,
    step: 1,
    rows: 3,
    minDate: "",
    maxDate: "",
    onLabel: "Yes",
    offLabel: "No",
    multiSelect: false,
    maxItems: 99999,
    minItems: 0,
    gridCols: "grid-cols-1",
    autoComplete: "off",
    direction: "vertical",
    customContent: "",
    showSelectAll: false,
    width: "w-full",
    valuePrefix: "",
    valueSuffix: "",
    maxLength: 999999,
    spellCheck: false,
};

export const widthOptions = [
    { value: "w-full", label: "Full width (100%)" },
    { value: "w-1/2", label: "Half width (50%)" },
    { value: "w-1/3", label: "One-third width (33%)" },
    { value: "w-2/3", label: "Two-thirds width (66%)" },
    { value: "w-1/4", label: "Quarter width (25%)" },
    { value: "w-3/4", label: "Three-quarters width (75%)" },
    { value: "w-1/5", label: "One-fifth width (20%)" },
    { value: "w-2/5", label: "Two-fifths width (40%)" },
    { value: "w-3/5", label: "Three-fifths width (60%)" },
    { value: "w-4/5", label: "Four-fifths width (80%)" },
    { value: "w-auto", label: "Auto width" },
    { value: "w-fit", label: "Fit content" },
    { value: "w-min", label: "Min content" },
    { value: "w-max", label: "Max content" },
];

export const getWidthLabel = (widthClass: string): string => {
    const option = widthOptions.find((opt) => opt.value === widthClass);
    return option ? option.label : widthClass;
};

export const getWidthClass = (label: string): string | undefined => {
    const option = widthOptions.find((opt) => opt.label === label);
    return option ? option.value : undefined;
};

export const getWidthDropdownOptions = () => {
    return widthOptions;
};

export const isValidWidthClass = (widthClass: string): boolean => {
    return widthOptions.some((opt) => opt.value === widthClass);
};

export const getDefaultWidthClass = (): string => {
    return FIELD_DEFAULT_COMPONENT_PROPS.width as string;
};

export const ensureValidWidthClass = (widthClass?: string): string => {
    if (!widthClass || !isValidWidthClass(widthClass)) {
        return getDefaultWidthClass();
    }
    return widthClass;
};

type Direction = ComponentProps["direction"];

export const directionOptions: { value: Direction; label: string }[] = [
    { value: "vertical", label: "Vertical" },
    { value: "horizontal", label: "Horizontal" },
];

export const getDirectionLabel = (directionValue: Direction): string => {
    const option = directionOptions.find((opt) => opt.value === directionValue);
    return option ? option.label : directionValue;
};

export const getDirectionValue = (label: string): Direction | undefined => {
    const option = directionOptions.find((opt) => opt.label === label);
    return option ? option.value : undefined;
};

export const getDirectionDropdownOptions = () => {
    return directionOptions;
};

export const isValidDirectionValue = (directionValue: Direction): boolean => {
    return directionOptions.some((opt) => opt.value === directionValue);
};

export const getDefaultDirectionValue = (): Direction => {
    return FIELD_DEFAULT_COMPONENT_PROPS.direction as Direction;
};

export const ensureValidDirectionValue = (directionValue?: Direction): Direction => {
    if (!directionValue || !isValidDirectionValue(directionValue)) {
        return getDefaultDirectionValue();
    }
    return directionValue;
};

export const gridColsOptions = [
    { value: "grid-cols-1", label: "1 Column" },
    { value: "grid-cols-2", label: "2 Columns" },
    { value: "grid-cols-3", label: "3 Columns" },
    { value: "grid-cols-4", label: "4 Columns" },
    { value: "grid-cols-auto", label: "Auto-fit" },
];

export const getGridColsLabel = (gridColsValue: string): string => {
    const option = gridColsOptions.find((opt) => opt.value === gridColsValue);
    return option ? option.label : gridColsValue;
};

export const getGridColsValue = (label: string): string | undefined => {
    const option = gridColsOptions.find((opt) => opt.label === label);
    return option ? option.value : undefined;
};

export const getGridColsDropdownOptions = () => {
    return gridColsOptions;
};

export const isValidGridColsValue = (gridColsValue: string): boolean => {
    return gridColsOptions.some((opt) => opt.value === gridColsValue);
};

export const getDefaultGridColsValue = (): string => {
    return FIELD_DEFAULT_COMPONENT_PROPS.gridCols as string;
};

export const ensureValidGridColsValue = (gridColsValue?: string): string => {
    if (gridColsValue === undefined || !isValidGridColsValue(gridColsValue)) {
        return getDefaultGridColsValue();
    }
    return gridColsValue;
};


export const autoCompleteOptions = [
  { value: "off", label: "Off" },
  { value: "on", label: "On" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "username", label: "Username" },
  { value: "new-password", label: "New Password" },
  { value: "current-password", label: "Current Password" },
  { value: "one-time-code", label: "One-Time Code" },
  { value: "cc-name", label: "Credit Card Name" },
  { value: "cc-number", label: "Credit Card Number" },
  { value: "cc-exp", label: "Credit Card Expiration" },
  { value: "cc-csc", label: "Credit Card CSC" },
  { value: "street-address", label: "Street Address" },
  { value: "address-line1", label: "Address Line 1" },
  { value: "address-line2", label: "Address Line 2" },
  { value: "address-level1", label: "State/Province" },
  { value: "address-level2", label: "City" },
  { value: "postal-code", label: "Postal Code" },
  { value: "country", label: "Country" },
  { value: "tel", label: "Telephone" },
  { value: "bday", label: "Birthday" },
  { value: "given-name", label: "First Name" },
  { value: "family-name", label: "Last Name" },
  { value: "nickname", label: "Nickname" },
  { value: "honorific-prefix", label: "Prefix (Mr., Ms., etc.)" },
  { value: "honorific-suffix", label: "Suffix (Jr., Sr., etc.)" },
  { value: "sex", label: "Gender" },
  { value: "url", label: "Website URL" },
  { value: "photo", label: "Photo" },
  { value: "impp", label: "Instant Messaging" },

  // Contact information
  { value: "tel-country-code", label: "Country Code" },
  { value: "tel-national", label: "National Phone Number" },
  { value: "tel-area-code", label: "Area Code" },
  { value: "tel-local", label: "Local Phone Number" },
  { value: "tel-extension", label: "Phone Extension" },

  // Organization
  { value: "organization", label: "Organization" },
  { value: "organization-title", label: "Job Title" },

  // Transaction
  { value: "transaction-currency", label: "Currency" },
  { value: "transaction-amount", label: "Amount" },

  // Language
  { value: "language", label: "Preferred Language" },

  // More credit card fields
  { value: "cc-exp-month", label: "CC Expiration Month" },
  { value: "cc-exp-year", label: "CC Expiration Year" },
  { value: "cc-type", label: "Credit Card Type" },

  // Additional address fields
  { value: "address-level3", label: "Suburb/District" },
  { value: "address-level4", label: "Sublocality" },
  { value: "country-name", label: "Country Name" },

  // Shipping/Billing (these can be prefixed)
  { value: "shipping", label: "Shipping (prefix)" },
  { value: "billing", label: "Billing (prefix)" },

  // Birthday components
  { value: "bday-day", label: "Birth Day" },
  { value: "bday-month", label: "Birth Month" },
  { value: "bday-year", label: "Birth Year" },
];

export const getAutoCompleteLabel = (autoCompleteValue: string): string => {
  const option = autoCompleteOptions.find((opt) => opt.value === autoCompleteValue);
  return option ? option.label : autoCompleteValue;
};

export const getAutoCompleteValue = (label: string): string | undefined => {
  const option = autoCompleteOptions.find((opt) => opt.label === label);
  return option ? option.value : undefined;
};

export const getAutoCompleteDropdownOptions = () => {
  return autoCompleteOptions;
};

export const isValidAutoCompleteValue = (autoCompleteValue: string): boolean => {
  return autoCompleteOptions.some((opt) => opt.value === autoCompleteValue);
};

export const getDefaultAutoCompleteValue = (): string => {
  return FIELD_DEFAULT_COMPONENT_PROPS.autoComplete as string;
};

export const ensureValidAutoCompleteValue = (autoCompleteValue?: string): string => {
  if (autoCompleteValue === undefined || !isValidAutoCompleteValue(autoCompleteValue)) {
      return getDefaultAutoCompleteValue();
  }
  return autoCompleteValue;
};


export const componentCompatibility = {
    input: ["autoComplete", "maxLength", "spellCheck", "width", "valuePrefix", "valueSuffix"],
    textarea: ["rows", "maxLength", "spellCheck", "width"],
    select: ["width", "valuePrefix", "valueSuffix"],
    multiselect: ["maxItems", "minItems", "showSelectAll", "width"],
    radio: ["direction", "gridCols", "width"],
    checkbox: ["direction", "gridCols", "width"],
    slider: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
    number: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
    date: ["minDate", "maxDate", "width"],
    switch: ["onLabel", "offLabel", "width"],
    button: ["width"],
    rangeSlider: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
    numberPicker: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
    jsonField: ["rows", "width"],
    fileUpload: ["maxItems", "width"],
    searchableSelect: ["maxItems", "minItems", "showSelectAll", "width"],
    directMultiSelect: ["maxItems", "minItems", "showSelectAll", "width"],
    multiDate: ["minDate", "maxDate", "width"],
    simpleNumber: ["min", "max", "width", "valuePrefix", "valueSuffix"],
    sortable: ["direction", "gridCols", "width"],
    tagInput: ["width"],
    dependentDropdown: ["width"],
    addressBlock: ["width"],
    starRating: ["width"],
    phoneNumber: ["width"],
};

export const getRelevantComponentProps = (componentType: ComponentType, allProps: ComponentProps): Partial<ComponentProps> => {
    const relevantPropKeys = componentCompatibility[componentType] || [];
    return Object.entries(allProps)
        .filter(([key]) => relevantPropKeys.includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
};

export const getVisiblePropsForComponentType = (componentType: ComponentType): string[] => {
    return componentCompatibility[componentType] || [];
};

export const getComponentTypeDefaults = (componentType: ComponentType): Partial<ComponentProps> => {
    const baseDefaults = {
        ...FIELD_DEFAULT_COMPONENT_PROPS,
    };

    const specificDefaults: Record<ComponentType, Partial<ComponentProps>> = {
        input: {
            maxLength: FIELD_DEFAULT_COMPONENT_PROPS.maxLength,
            autoComplete: FIELD_DEFAULT_COMPONENT_PROPS.autoComplete,
            spellCheck: FIELD_DEFAULT_COMPONENT_PROPS.spellCheck,
        },
        textarea: {
            rows: FIELD_DEFAULT_COMPONENT_PROPS.rows,
            maxLength: FIELD_DEFAULT_COMPONENT_PROPS.maxLength,
            spellCheck: FIELD_DEFAULT_COMPONENT_PROPS.spellCheck,
        },

        buttonColumn: {
            direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
            gridCols: FIELD_DEFAULT_COMPONENT_PROPS.gridCols,
            maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
            minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
            showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
        },
        buttonSelection: {
            direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
            gridCols: FIELD_DEFAULT_COMPONENT_PROPS.gridCols,
            maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
            minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
            showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
        },

        select: {},
        multiselect: {
            maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
            minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
            showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
        },
        searchableSelect: {
            maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
            minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
            showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
        },
        multiSearchableSelect: {
            maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
            minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
            showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
        },
        directMultiSelect: {
            maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
            minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
            showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
        },
        multiDate: {
            minDate: FIELD_DEFAULT_COMPONENT_PROPS.minDate,
            maxDate: FIELD_DEFAULT_COMPONENT_PROPS.maxDate,
        },
        radio: {
            direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
            gridCols: FIELD_DEFAULT_COMPONENT_PROPS.gridCols,
        },
        checkbox: {
            direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
            gridCols: FIELD_DEFAULT_COMPONENT_PROPS.gridCols,
        },
        slider: {
            min: FIELD_DEFAULT_COMPONENT_PROPS.min,
            max: FIELD_DEFAULT_COMPONENT_PROPS.max,
            step: FIELD_DEFAULT_COMPONENT_PROPS.step,
            valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
            valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix,
        },
        number: {
            min: FIELD_DEFAULT_COMPONENT_PROPS.min,
            max: FIELD_DEFAULT_COMPONENT_PROPS.max,
            step: FIELD_DEFAULT_COMPONENT_PROPS.step,
            valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
            valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix,
        },
        stepperNumber: {
            min: FIELD_DEFAULT_COMPONENT_PROPS.min,
            max: FIELD_DEFAULT_COMPONENT_PROPS.max,
            step: FIELD_DEFAULT_COMPONENT_PROPS.step,
            valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
            valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix,
        },
        simpleNumber: {
            min: FIELD_DEFAULT_COMPONENT_PROPS.min,
            max: FIELD_DEFAULT_COMPONENT_PROPS.max,
            valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
            valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix,
        },
        date: {
            minDate: FIELD_DEFAULT_COMPONENT_PROPS.minDate,
            maxDate: FIELD_DEFAULT_COMPONENT_PROPS.maxDate,
        },
        switch: {
            onLabel: FIELD_DEFAULT_COMPONENT_PROPS.onLabel,
            offLabel: FIELD_DEFAULT_COMPONENT_PROPS.offLabel,
        },
        rangeSlider: {
            min: FIELD_DEFAULT_COMPONENT_PROPS.min,
            max: FIELD_DEFAULT_COMPONENT_PROPS.max,
            step: FIELD_DEFAULT_COMPONENT_PROPS.step,
            valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
            valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix,
        },
        numberPicker: {
            min: FIELD_DEFAULT_COMPONENT_PROPS.min,
            max: FIELD_DEFAULT_COMPONENT_PROPS.max,
            step: FIELD_DEFAULT_COMPONENT_PROPS.step,
            valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
            valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix,
        },
        numberInput: {
            min: FIELD_DEFAULT_COMPONENT_PROPS.min,
            max: FIELD_DEFAULT_COMPONENT_PROPS.max,
            step: FIELD_DEFAULT_COMPONENT_PROPS.step,
            valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
            valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix,
        },
        jsonField: {
            rows: 5,
        },
        fileUpload: {
            maxItems: 1,
        },
        sortable: {
            direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
            gridCols: FIELD_DEFAULT_COMPONENT_PROPS.gridCols,
        },
        tagInput: {
            width: FIELD_DEFAULT_COMPONENT_PROPS.width,
        },
        dependentDropdown: {
            width: FIELD_DEFAULT_COMPONENT_PROPS.width,
        },
        addressBlock: {
            width: FIELD_DEFAULT_COMPONENT_PROPS.width,
        },
        starRating: {
            width: FIELD_DEFAULT_COMPONENT_PROPS.width,
        },
        phoneNumber: {
            width: FIELD_DEFAULT_COMPONENT_PROPS.width,
        },
    };

    return { ...baseDefaults, ...specificDefaults[componentType] };
};
