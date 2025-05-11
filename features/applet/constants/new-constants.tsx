// import React from "react";
// import { ComponentType, ComponentProps } from "@/types/customAppTypes";
// import {
//     TextCursorInput,
//     Calendar,
//     ToggleLeft,
//     Check,
//     ListFilter,
//     RadioTower,
//     SlidersHorizontal,
//     PanelBottomClose,
//     SquareTerminal,
//     FileUp,
//     Hash,
//     SquareStack,
//     GripVertical,
//     Search,
//     MapPin,
//     Star,
//     Phone,
//     Tag,
//     ChevronsUpDown,
//     SquareChevronUp,
//     Text,
//     Columns,
//     Sliders,
//     CalendarDays,
//     Loader,
//     Command,
// } from "lucide-react";

// // Map of component types to their respective icons with styling
// export const componentIconMap: Record<string, React.ReactNode> = {
//     input: <TextCursorInput className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
//     textarea: <PanelBottomClose className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
//     select: <ListFilter className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
//     multiselect: <GripVertical className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />,
//     radio: <RadioTower className="h-5 w-5 text-pink-500 dark:text-pink-400" />,
//     checkbox: <Check className="h-5 w-5 text-green-500 dark:text-green-400" />,
//     slider: <SlidersHorizontal className="h-5 w-5 text-orange-500 dark:text-orange-400" />,
//     number: <Hash className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
//     date: <Calendar className="h-5 w-5 text-red-500 dark:text-red-400" />,
//     switch: <ToggleLeft className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />,
//     button: <SquareStack className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
//     rangeSlider: <SlidersHorizontal className="h-5 w-5 text-teal-500 dark:text-teal-400" />,
//     numberPicker: <Hash className="h-5 w-5 text-fuchsia-500 dark:text-fuchsia-400" />,
//     jsonField: <SquareTerminal className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
//     fileUpload: <FileUp className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
//     searchableSelect: <Search className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
//     directMultiSelect: <GripVertical className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />,
//     multiDate: <CalendarDays className="h-5 w-5 text-red-500 dark:text-red-400" />,
//     simpleNumber: <Hash className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
//     stepperNumber: <Hash className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
//     sortable: <GripVertical className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />,
//     tagInput: <Tag className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
//     dependentDropdown: <ChevronsUpDown className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
//     addressBlock: <MapPin className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
//     starRating: <Star className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />,
//     phoneNumber: <Phone className="h-5 w-5 text-green-500 dark:text-green-400" />,
//     buttonGroup: <Command className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
//     buttonSelection: <SquareChevronUp className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
//     richText: <Text className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
//     colorPicker: <Columns className="h-5 w-5 text-pink-500 dark:text-pink-400" />,
//     rangeSelector: <Sliders className="h-5 w-5 text-orange-500 dark:text-orange-400" />,
//     dateRange: <CalendarDays className="h-5 w-5 text-red-500 dark:text-red-400" />,
//     progress: <Loader className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
// };

// // Map of component types to their display names
// export const componentTypeNames: Record<string, string> = {
//     input: "Text Input",
//     textarea: "Text Area",
//     select: "Dropdown",
//     multiselect: "Multi-Select",
//     radio: "Radio Group",
//     checkbox: "Checkbox Group",
//     slider: "Slider",
//     number: "Number",
//     date: "Date Picker",
//     switch: "Switch",
//     button: "Button",
//     rangeSlider: "Range Slider",
//     numberPicker: "Number Picker",
//     jsonField: "JSON Field",
//     fileUpload: "File Upload",
//     searchableSelect: "Searchable Select",
//     directMultiSelect: "Direct Multi-Select",
//     multiDate: "Multi-Date Picker",
//     simpleNumber: "Simple Number Input",
//     stepperNumber: "Stepper Number Input",
//     sortable: "Sortable List",
//     tagInput: "Tag Input",
//     dependentDropdown: "Dependent Dropdown",
//     addressBlock: "Address Block",
//     starRating: "Star Rating",
//     phoneNumber: "Phone Number",
//     buttonGroup: "Button Group",
//     buttonSelection: "Button Selection",
//     richText: "Rich Text Editor",
//     colorPicker: "Color Picker",
//     rangeSelector: "Range Selector",
//     dateRange: "Date Range Picker",
//     progress: "Progress Indicator",
// };

// // Helper function to get the display name for a component type
// export const getComponentTypeName = (componentType: string): string => {
//     return componentTypeNames[componentType] || componentType;
// };

// // Default icon to use if component type is not found in the map
// export const getDefaultIcon = (): React.ReactNode => {
//     return <TextCursorInput className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
// };

// // Helper function to get the icon for a component type
// export const getComponentIcon = (componentType: string): React.ReactNode => {
//     return componentIconMap[componentType] || getDefaultIcon();
// };

// // Group components by category for better organization in UI
// export const componentCategories = {
//     "Text Input": ["input", "textarea", "richText"],
//     "Selection": ["select", "multiselect", "searchableSelect", "dependentDropdown", "directMultiSelect"],
//     "Choice": ["radio", "checkbox", "buttonGroup", "buttonSelection", "switch", "tagInput"],
//     "Numeric": ["number", "simpleNumber", "stepperNumber", "slider", "rangeSlider", "starRating"],
//     "Date & Time": ["date", "multiDate", "dateRange"],
//     "Advanced": ["jsonField", "fileUpload", "sortable", "colorPicker", "progress"],
//     "Specialized": ["addressBlock", "phoneNumber"]
// };

// // Get components by category
// export const getComponentsByCategory = (category: string): string[] => {
//     return componentCategories[category] || [];
// };

// // Get category for a component
// export const getCategoryForComponent = (componentType: string): string => {
//     for (const [category, components] of Object.entries(componentCategories)) {
//         if (components.includes(componentType)) {
//             return category;
//         }
//     }
//     return "Other";
// };

// export const FIELD_DEFAULT_COMPONENT_PROPS: ComponentProps = {
//     min: 0,
//     max: 100,
//     step: 1,
//     rows: 3,
//     minDate: "",
//     maxDate: "",
//     onLabel: "Yes",
//     offLabel: "No",
//     multiSelect: false,
//     maxItems: undefined,
//     minItems: 0,
//     gridCols: "grid-cols-1",
//     autoComplete: "off",
//     direction: "vertical",
//     customContent: undefined,
//     showSelectAll: false,
//     width: "w-full",
//     valuePrefix: "",
//     valueSuffix: "",
//     maxLength: undefined,
//     spellCheck: false,
//     path: undefined,
//     saveTo: "public",
//     useMiniUploader: true,
//     maxHeight: undefined,
//     includeOther: false,
// };

// export const widthOptions = [
//     { value: "w-full", label: "Full width (100%)" },
//     { value: "w-1/2", label: "Half width (50%)" },
//     { value: "w-1/3", label: "One-third width (33%)" },
//     { value: "w-2/3", label: "Two-thirds width (66%)" },
//     { value: "w-1/4", label: "Quarter width (25%)" },
//     { value: "w-3/4", label: "Three-quarters width (75%)" },
//     { value: "w-1/5", label: "One-fifth width (20%)" },
//     { value: "w-2/5", label: "Two-fifths width (40%)" },
//     { value: "w-3/5", label: "Three-fifths width (60%)" },
//     { value: "w-4/5", label: "Four-fifths width (80%)" },
//     { value: "w-auto", label: "Auto width" },
//     { value: "w-fit", label: "Fit content" },
//     { value: "w-min", label: "Min content" },
//     { value: "w-max", label: "Max content" },
// ];

// export const getWidthLabel = (widthClass: string): string => {
//     const option = widthOptions.find((opt) => opt.value === widthClass);
//     return option ? option.label : widthClass;
// };

// export const getWidthClass = (label: string): string | undefined => {
//     const option = widthOptions.find((opt) => opt.label === label);
//     return option ? option.value : undefined;
// };

// export const getWidthDropdownOptions = () => {
//     return widthOptions;
// };

// export const isValidWidthClass = (widthClass: string): boolean => {
//     return widthOptions.some((opt) => opt.value === widthClass);
// };

// export const getDefaultWidthClass = (): string => {
//     return FIELD_DEFAULT_COMPONENT_PROPS.width as string;
// };

// export const ensureValidWidthClass = (widthClass?: string): string => {
//     if (!widthClass || !isValidWidthClass(widthClass)) {
//         return getDefaultWidthClass();
//     }
//     return widthClass;
// };

// type Direction = ComponentProps["direction"];

// export const directionOptions: { value: Direction; label: string }[] = [
//     { value: "vertical", label: "Vertical" },
//     { value: "horizontal", label: "Horizontal" },
// ];

// export const getDirectionLabel = (directionValue: Direction): string => {
//     const option = directionOptions.find((opt) => opt.value === directionValue);
//     return option ? option.label : directionValue;
// };

// export const getDirectionValue = (label: string): Direction | undefined => {
//     const option = directionOptions.find((opt) => opt.label === label);
//     return option ? option.value : undefined;
// };

// export const getDirectionDropdownOptions = () => {
//     return directionOptions;
// };

// export const isValidDirectionValue = (directionValue: Direction): boolean => {
//     return directionOptions.some((opt) => opt.value === directionValue);
// };

// export const getDefaultDirectionValue = (): Direction => {
//     return FIELD_DEFAULT_COMPONENT_PROPS.direction as Direction;
// };

// export const ensureValidDirectionValue = (directionValue?: Direction): Direction => {
//     if (!directionValue || !isValidDirectionValue(directionValue)) {
//         return getDefaultDirectionValue();
//     }
//     return directionValue;
// };

// export const gridColsOptions = [
//     { value: "grid-cols-1", label: "1 Column" },
//     { value: "grid-cols-2", label: "2 Columns" },
//     { value: "grid-cols-3", label: "3 Columns" },
//     { value: "grid-cols-4", label: "4 Columns" },
//     { value: "grid-cols-auto", label: "Auto-fit" },
// ];

// export const getGridColsLabel = (gridColsValue: string): string => {
//     const option = gridColsOptions.find((opt) => opt.value === gridColsValue);
//     return option ? option.label : gridColsValue;
// };

// export const getGridColsValue = (label: string): string | undefined => {
//     const option = gridColsOptions.find((opt) => opt.label === label);
//     return option ? option.value : undefined;
// };

// export const getGridColsDropdownOptions = () => {
//     return gridColsOptions;
// };

// export const isValidGridColsValue = (gridColsValue: string): boolean => {
//     return gridColsOptions.some((opt) => opt.value === gridColsValue);
// };

// export const getDefaultGridColsValue = (): string => {
//     return FIELD_DEFAULT_COMPONENT_PROPS.gridCols as string;
// };

// export const ensureValidGridColsValue = (gridColsValue?: string): string => {
//     if (gridColsValue === undefined || !isValidGridColsValue(gridColsValue)) {
//         return getDefaultGridColsValue();
//     }
//     return gridColsValue;
// };

// // Options for auto-complete attributes
// export const autoCompleteOptions = [
//     { value: "off", label: "Off" },
//     { value: "name", label: "Name" },
//     { value: "email", label: "Email" },
//     { value: "username", label: "Username" },
//     { value: "new-password", label: "New Password" },
//     { value: "current-password", label: "Current Password" },
//     { value: "one-time-code", label: "One-time Code" },
//     { value: "organization", label: "Organization" },
//     { value: "street-address", label: "Street Address" },
//     { value: "postal-code", label: "Postal Code" },
//     { value: "tel", label: "Telephone" },
//     { value: "url", label: "URL" },
//     { value: "cc-name", label: "Credit Card Name" },
//     { value: "cc-number", label: "Credit Card Number" },
//     { value: "cc-exp", label: "Credit Card Expiry" },
//     { value: "cc-csc", label: "Credit Card Security Code" },
//     { value: "on", label: "On" },
// ];

// // File storage options
// export const storageOptions = [
//     { value: "public", label: "Public Storage" },
//     { value: "private", label: "Private Storage" },
// ];

// export const componentCompatibility = {
//     input: ["autoComplete", "maxLength", "spellCheck", "width", "valuePrefix", "valueSuffix"],
//     textarea: ["rows", "maxLength", "spellCheck", "width"],
//     select: ["width", "valuePrefix", "valueSuffix", "includeOther"],
//     multiselect: ["maxItems", "minItems", "showSelectAll", "width", "includeOther"],
//     radio: ["direction", "gridCols", "width", "includeOther"],
//     checkbox: ["direction", "gridCols", "minItems", "maxItems", "showSelectAll", "width", "includeOther"],
//     slider: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
//     number: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
//     date: ["minDate", "maxDate", "width", "valuePrefix", "valueSuffix"],
//     switch: ["onLabel", "offLabel", "direction", "width"],
//     button: ["width"],
//     rangeSlider: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
//     numberPicker: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
//     jsonField: ["rows", "width"],
//     fileUpload: ["maxItems", "path", "saveTo", "useMiniUploader", "width"],
//     searchableSelect: ["maxItems", "minItems", "showSelectAll", "width", "includeOther"],
//     directMultiSelect: ["maxItems", "minItems", "showSelectAll", "direction", "width", "includeOther"],
//     multiDate: ["minDate", "maxDate", "minItems", "maxItems", "width"],
//     simpleNumber: ["min", "max", "width", "valuePrefix", "valueSuffix"],
//     stepperNumber: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
//     sortable: ["direction", "maxHeight", "width"],
//     tagInput: ["minItems", "maxItems", "width"],
//     dependentDropdown: ["width", "includeOther"],
//     addressBlock: ["width"],
//     starRating: ["min", "max", "step", "width"],
//     phoneNumber: ["width"],
//     buttonGroup: ["direction", "multiSelect", "minItems", "maxItems", "width", "includeOther"],
//     buttonSelection: ["multiSelect", "minItems", "maxItems", "width", "includeOther"],
//     richText: ["rows", "maxLength", "width"],
//     colorPicker: ["width"],
//     rangeSelector: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
//     dateRange: ["minDate", "maxDate", "width"],
//     progress: ["min", "max", "step", "width", "valuePrefix", "valueSuffix"],
// };

// export const getRelevantComponentProps = (componentType: ComponentType, allProps: ComponentProps): Partial<ComponentProps> => {
//     const relevantPropKeys = componentCompatibility[componentType] || [];
//     return Object.entries(allProps)
//         .filter(([key]) => relevantPropKeys.includes(key))
//         .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
// };

// export const getVisiblePropsForComponentType = (componentType: ComponentType): string[] => {
//     return componentCompatibility[componentType] || [];
// };

// // Provide friendly descriptions for each prop
// export const propDescriptions = {
//     min: "Minimum value allowed",
//     max: "Maximum value allowed",
//     step: "Step increment for numeric inputs",
//     rows: "Number of visible rows in textarea",
//     minDate: "Earliest date selectable (format: YYYY-MM-DD or 'today')",
//     maxDate: "Latest date selectable (format: YYYY-MM-DD or 'today')",
//     onLabel: "Text to display when switch is ON",
//     offLabel: "Text to display when switch is OFF",
//     multiSelect: "Allow selection of multiple options",
//     maxItems: "Maximum number of items that can be selected",
//     minItems: "Minimum number of items that must be selected",
//     gridCols: "Number of columns in grid layout",
//     autoComplete: "Browser autocomplete suggestion type",
//     direction: "Layout direction (vertical or horizontal)",
//     customContent: "Custom component content (for advanced use)",
//     showSelectAll: "Show a 'Select All' option",
//     width: "Component width on the page",
//     valuePrefix: "Text to display before the value (e.g., '$')",
//     valueSuffix: "Text to display after the value (e.g., '%')",
//     maxLength: "Maximum number of characters allowed",
//     spellCheck: "Enable browser spell checking",
//     path: "Storage path for uploaded files",
//     saveTo: "Storage location (public or private)",
//     useMiniUploader: "Use compact file uploader interface",
//     maxHeight: "Maximum height for container",
//     includeOther: "Add an 'Other' option with text input"
// };

// // Group props by category
// export const propCategories = {
//     "Basic": ["width", "direction", "rows", "maxLength", "autoComplete", "spellCheck"],
//     "Numeric": ["min", "max", "step", "valuePrefix", "valueSuffix"],
//     "Selection": ["multiSelect", "minItems", "maxItems", "showSelectAll", "includeOther"],
//     "Date": ["minDate", "maxDate"],
//     "Labels": ["onLabel", "offLabel"],
//     "Advanced": ["customContent", "path", "saveTo", "useMiniUploader", "maxHeight", "gridCols"],
// };

// // Get props by category
// export const getPropsByCategory = (category: string): string[] => {
//     return propCategories[category] || [];
// };

// // Get category for a prop
// export const getCategoryForProp = (prop: string): string => {
//     for (const [category, props] of Object.entries(propCategories)) {
//         if (props.includes(prop)) {
//             return category;
//         }
//     }
//     return "Other";
// };

// export const getComponentTypeDefaults = (componentType: ComponentType): Partial<ComponentProps> => {
//     const baseDefaults = {
//         ...FIELD_DEFAULT_COMPONENT_PROPS,
//     };
    
//     const specificDefaults: Record<ComponentType, Partial<ComponentProps>> = {
//         input: {
//             maxLength: FIELD_DEFAULT_COMPONENT_PROPS.maxLength,
//             autoComplete: FIELD_DEFAULT_COMPONENT_PROPS.autoComplete,
//             spellCheck: FIELD_DEFAULT_COMPONENT_PROPS.spellCheck
//         },
//         textarea: {
//             rows: FIELD_DEFAULT_COMPONENT_PROPS.rows,
//             maxLength: FIELD_DEFAULT_COMPONENT_PROPS.maxLength,
//             spellCheck: FIELD_DEFAULT_COMPONENT_PROPS.spellCheck
//         },
//         select: {
//         },
//         multiselect: {
//             maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
//             minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
//             showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
//         },
//         searchableSelect: {
//             maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
//             minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
//             showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
//         },
//         directMultiSelect: {
//             maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
//             minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
//             showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
//             direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
//         },
//         multiDate: {
//             minDate: FIELD_DEFAULT_COMPONENT_PROPS.minDate,
//             maxDate: FIELD_DEFAULT_COMPONENT_PROPS.maxDate,
//             minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
//             maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems
//         },
//         radio: {
//             direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
//             gridCols: FIELD_DEFAULT_COMPONENT_PROPS.gridCols,
//         },
//         checkbox: {
//             direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
//             gridCols: FIELD_DEFAULT_COMPONENT_PROPS.gridCols,
//             minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
//             maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
//             showSelectAll: FIELD_DEFAULT_COMPONENT_PROPS.showSelectAll,
//         },
//         slider: {
//             min: FIELD_DEFAULT_COMPONENT_PROPS.min,
//             max: FIELD_DEFAULT_COMPONENT_PROPS.max,
//             step: FIELD_DEFAULT_COMPONENT_PROPS.step,
//             valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
//             valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix
//         },
//         number: {
//             min: FIELD_DEFAULT_COMPONENT_PROPS.min,
//             max: FIELD_DEFAULT_COMPONENT_PROPS.max,
//             step: FIELD_DEFAULT_COMPONENT_PROPS.step,
//             valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
//             valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix
//         },
//         simpleNumber: {
//             min: FIELD_DEFAULT_COMPONENT_PROPS.min,
//             max: FIELD_DEFAULT_COMPONENT_PROPS.max,
//             valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
//             valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix
//         },
//         stepperNumber: {
//             min: FIELD_DEFAULT_COMPONENT_PROPS.min,
//             max: FIELD_DEFAULT_COMPONENT_PROPS.max,
//             step: FIELD_DEFAULT_COMPONENT_PROPS.step,
//             valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
//             valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix
//         },
//         date: {
//             minDate: FIELD_DEFAULT_COMPONENT_PROPS.minDate,
//             maxDate: FIELD_DEFAULT_COMPONENT_PROPS.maxDate,
//             valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
//             valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix
//         },
//         switch: {
//             onLabel: FIELD_DEFAULT_COMPONENT_PROPS.onLabel,
//             offLabel: FIELD_DEFAULT_COMPONENT_PROPS.offLabel,
//             direction: FIELD_DEFAULT_COMPONENT_PROPS.direction
//         },
//         button: {},
//         rangeSlider: {
//             min: FIELD_DEFAULT_COMPONENT_PROPS.min,
//             max: FIELD_DEFAULT_COMPONENT_PROPS.max,
//             step: FIELD_DEFAULT_COMPONENT_PROPS.step,
//             valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
//             valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix
//         },
//         numberPicker: {
//             min: FIELD_DEFAULT_COMPONENT_PROPS.min,
//             max: FIELD_DEFAULT_COMPONENT_PROPS.max,
//             step: FIELD_DEFAULT_COMPONENT_PROPS.step,
//             valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
//             valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix
//         },
//         jsonField: {
//             rows: 8
//         },
//         fileUpload: {
//             maxItems: 1,
//             // path: FIELD_DEFAULT_COMPONENT_PROPS.path,
//             // saveTo: FIELD_DEFAULT_COMPONENT_PROPS.saveTo,
//         },
//         sortable: {
//             direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
//             rows: FIELD_DEFAULT_COMPONENT_PROPS.rows
//         },
//         tagInput: {
//             minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
//             maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems
//         },
//         dependentDropdown: {
//         },
//         addressBlock: {},
//         starRating: {
//             min: 0,
//             max: 5,
//             step: 0.5
//         },
//         phoneNumber: {},
//         buttonGroup: {
//             direction: FIELD_DEFAULT_COMPONENT_PROPS.direction,
//             multiSelect: true,
//             minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
//             maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
//         },
//         buttonSelection: {
//             multiSelect: true,
//             minItems: FIELD_DEFAULT_COMPONENT_PROPS.minItems,
//             maxItems: FIELD_DEFAULT_COMPONENT_PROPS.maxItems,
//         },
//         richText: {
//             rows: 8,
//             maxLength: FIELD_DEFAULT_COMPONENT_PROPS.maxLength
//         },
//         colorPicker: {},
//         rangeSelector: {
//             min: FIELD_DEFAULT_COMPONENT_PROPS.min,
//             max: FIELD_DEFAULT_COMPONENT_PROPS.max,
//             step: FIELD_DEFAULT_COMPONENT_PROPS.step,
//             valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
//             valueSuffix: FIELD_DEFAULT_COMPONENT_PROPS.valueSuffix
//         },
//         dateRange: {
//             minDate: FIELD_DEFAULT_COMPONENT_PROPS.minDate,
//             maxDate: FIELD_DEFAULT_COMPONENT_PROPS.maxDate
//         },
//         progress: {
//             min: 0,
//             max: 100,
//             step: 1,
//             valuePrefix: FIELD_DEFAULT_COMPONENT_PROPS.valuePrefix,
//             valueSuffix: "%"
//         },
//     };
    
//     const relevantProps = componentCompatibility[componentType] || [];
//     const filteredBaseDefaults = Object.fromEntries(
//         Object.entries(baseDefaults).filter(([key]) => relevantProps.includes(key))
//     );
    
//     return { ...filteredBaseDefaults, ...specificDefaults[componentType] };
// };

// // Helper function to validate common props
// export const validateProps = (componentType: ComponentType, props: Partial<ComponentProps>): { isValid: boolean; errors: Record<string, string> } => {
//     const errors: Record<string, string> = {};
    
//     // Validate numeric props
//     if (props.min !== undefined && props.max !== undefined && props.min > props.max) {
//         errors.min = "Minimum value cannot be greater than maximum value";
//         errors.max = "Maximum value cannot be less than minimum value";
//     }
    
//     // Validate minItems/maxItems
//     if (props.minItems !== undefined && props.maxItems !== undefined && props.minItems > props.maxItems) {
//         errors.minItems = "Minimum items cannot be greater than maximum items";
//         errors.maxItems = "Maximum items cannot be less than minimum items";
//     }
    
//     // Validate date ranges
//     if (props.minDate && props.maxDate && props.minDate !== "today" && props.maxDate !== "today") {
//         try {
//             const minDateObj = new Date(props.minDate);
//             const maxDateObj = new Date(props.maxDate);
//             if (minDateObj > maxDateObj) {
//                 errors.minDate = "Minimum date cannot be after maximum date";
//                 errors.maxDate = "Maximum date cannot be before minimum date";
//             }
//         } catch (e) {
//             // If date parsing fails, we'll skip this validation
//         }
//     }
    
//     // Validate step (must be positive)
//     if (props.step !== undefined && props.step <= 0) {
//         errors.step = "Step value must be greater than zero";
//     }
    
//     // Validate rows (must be positive)
//     if (props.rows !== undefined && props.rows <= 0) {
//         errors.rows = "Rows value must be greater than zero";
//     }
    
//     // Component-specific validations
//     switch (componentType) {
//         case "slider":
//         case "rangeSlider":
//         case "number":
//         case "numberPicker":
//         case "stepperNumber":
//             // For numeric components, step should divide evenly into max-min
//             if (props.min !== undefined && props.max !== undefined && props.step !== undefined) {
//                 const range = props.max - props.min;
//                 if (range % props.step !== 0) {
//                     errors.step = `Step value should divide evenly into the range (${range})`;
//                 }
//             }
//             break;
            
//         case "starRating":
//             // Star rating should have reasonable max (typically 5-10)
//             if (props.max !== undefined && props.max > 10) {
//                 errors.max = "Star ratings typically use a maximum of 5-10 stars";
//             }
//             break;
            
//         case "fileUpload":
//             // File upload saveTo should be valid
//             if (props.saveTo && !['public', 'private'].includes(props.saveTo)) {
//                 errors.saveTo = "Storage location must be 'public' or 'private'";
//             }
//             break;
//     }
    
//     return { 
//         isValid: Object.keys(errors).length === 0,
//         errors 
//     };
// };

// // Helper to transform component props for specific components
// export const transformComponentProps = (componentType: ComponentType, props: Partial<ComponentProps>): Partial<ComponentProps> => {
//     const transformedProps = { ...props };
    
//     // Component-specific transformations
//     switch (componentType) {
//         case "date":
//         case "multiDate":
//         case "dateRange":
//             // Handle "today" special value
//             if (transformedProps.minDate === "today") {
//                 // Keep as "today" - will be handled in component
//             }
//             if (transformedProps.maxDate === "today") {
//                 // Keep as "today" - will be handled in component
//             }
//             break;
            
//         case "switch":
//             // Ensure default value for switch is boolean
//             if (transformedProps.defaultValue !== undefined) {
//                 transformedProps.defaultValue = !!transformedProps.defaultValue;
//             }
//             break;
            
//         case "fileUpload":
//             // Ensure maxItems is at least 1 for single upload
//             if (transformedProps.multiSelect === false && (!transformedProps.maxItems || transformedProps.maxItems < 1)) {
//                 transformedProps.maxItems = 1;
//             }
//             break;
//     }
    
//     return transformedProps;
// };

// // Helper to determine if a component is multi-select by nature
// export const isMultiSelectComponent = (componentType: ComponentType): boolean => {
//     return [
//         "multiselect", 
//         "checkbox", 
//         "directMultiSelect", 
//         "multiDate", 
//         "tagInput", 
//         "buttonGroup"
//     ].includes(componentType);
// };

// // Helper to determine component's default state structure
// export const getDefaultStateStructure = (componentType: ComponentType): 'string' | 'number' | 'boolean' | 'array' | 'object' => {
//     switch (componentType) {
//         case "input":
//         case "textarea":
//         case "select":
//         case "date":
//         case "jsonField":
//         case "phoneNumber":
//         case "richText":
//         case "colorPicker":
//             return 'string';
            
//         case "number":
//         case "slider":
//         case "stepperNumber":
//         case "simpleNumber":
//         case "starRating":
//         case "numberPicker":
//         case "progress":
//             return 'number';
            
//         case "switch":
//             return 'boolean';
            
//         case "multiselect":
//         case "checkbox":
//         case "directMultiSelect":
//         case "multiDate":
//         case "fileUpload":
//         case "tagInput":
//         case "buttonGroup":
//         case "buttonSelection":
//         case "dateRange":
//             return 'array';
            
//         case "sortable":
//         case "addressBlock":
//         case "dependentDropdown":
//             return 'object';
            
//         default:
//             return 'string';
//     }
// };

// // Utility to get information about a component
// export const getComponentInfo = (componentType: ComponentType) => {
//     return {
//         name: getComponentTypeName(componentType),
//         icon: getComponentIcon(componentType),
//         category: getCategoryForComponent(componentType),
//         compatibleProps: componentCompatibility[componentType] || [],
//         defaultProps: getComponentTypeDefaults(componentType),
//         stateStructure: getDefaultStateStructure(componentType),
//         isMultiSelect: isMultiSelectComponent(componentType)
//     };
// };

// // Utility to initialize empty state for a component
// export const initializeEmptyState = (componentType: ComponentType): any => {
//     const stateType = getDefaultStateStructure(componentType);
    
//     switch (stateType) {
//         case 'string':
//             return '';
//         case 'number':
//             return 0;
//         case 'boolean':
//             return false;
//         case 'array':
//             return [];
//         case 'object':
//             return {};
//         default:
//             return null;
//     }
// };

// // Utility to get label or placeholder text for a component
// export const getDefaultComponentLabels = (componentType: ComponentType): { label: string; placeholder: string } => {
//     const name = getComponentTypeName(componentType);
    
//     switch (componentType) {
//         case "input":
//             return { label: "Text Input", placeholder: "Enter text..." };
//         case "textarea":
//             return { label: "Text Area", placeholder: "Enter text here..." };
//         case "select":
//             return { label: "Select Option", placeholder: "Select an option..." };
//         case "multiselect":
//             return { label: "Select Options", placeholder: "Select options..." };
//         case "radio":
//             return { label: "Select One", placeholder: "Select an option" };
//         case "checkbox":
//             return { label: "Select Options", placeholder: "Select options" };
//         case "date":
//             return { label: "Select Date", placeholder: "Select a date..." };
//         case "multiDate":
//             return { label: "Select Dates", placeholder: "Select dates..." };
//         case "number":
//         case "simpleNumber":
//             return { label: "Number", placeholder: "Enter a number..." };
//         case "stepperNumber":
//             return { label: "Quantity", placeholder: "0" };
//         case "slider":
//             return { label: "Slider Value", placeholder: "Adjust value..." };
//         case "switch":
//             return { label: "Toggle Option", placeholder: "" };
//         case "fileUpload":
//             return { label: "Upload Files", placeholder: "Select files to upload..." };
//         case "jsonField":
//             return { label: "JSON Data", placeholder: "Enter JSON data..." };
//         case "sortable":
//             return { label: "Sort Items", placeholder: "Drag to reorder..." };
//         case "buttonGroup":
//         case "buttonSelection":
//             return { label: "Select Options", placeholder: "Select options" };
//         default:
//             return { label: name, placeholder: `Enter ${name.toLowerCase()}...` };
//     }
// };