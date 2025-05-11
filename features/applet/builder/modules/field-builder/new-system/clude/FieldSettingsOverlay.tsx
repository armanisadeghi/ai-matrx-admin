// "use client";
// import React, { useState, useEffect } from "react";
// import { useAppDispatch, useAppSelector } from "@/lib/redux";
// import {
//     selectFieldById,
//     selectFieldComponent,
//     selectFieldLabel,
//     selectFieldDescription,
//     selectFieldHelpText,
//     selectFieldPlaceholder,
//     selectFieldRequired,
//     selectFieldDisabled,
//     selectFieldIncludeOther,
//     selectFieldComponentProps,
//     selectFieldIsDirty,
// } from "@/lib/redux/app-builder/selectors/fieldSelectors";
// import {
//     setLabel,
//     setDescription,
//     setHelpText,
//     setPlaceholder,
//     setRequired,
//     setDisabled,
//     setIncludeOther,
//     setComponentProps,
// } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
// import FullScreenOverlay, { TabDefinition } from "@/components/FullScreenOverlay";
// import SmartOptionsManager from "./SmartOptionsManager";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Switch } from "@/components/ui/switch";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";
// import { fieldHelpTextItems } from "./fieldHelpText";
// import {
//     getWidthDropdownOptions,
//     getDirectionDropdownOptions,
//     getGridColsDropdownOptions,
//     widthOptions,
//     directionOptions,
//     gridColsOptions,
// } from "@/lib/utils/fieldUtils";
// import { ComponentProps, ComponentType } from "@/types/customAppTypes";

// interface FieldSettingsOverlayProps {
//     isOpen: boolean;
//     onClose: () => void;
//     fieldId: string;
// }

// export const FieldSettingsOverlay: React.FC<FieldSettingsOverlayProps> = ({ isOpen, onClose, fieldId }) => {
//     const dispatch = useAppDispatch();

//     // Redux selectors for field properties
//     const field = useAppSelector((state) => selectFieldById(state, fieldId));
//     const component = useAppSelector((state) => selectFieldComponent(state, fieldId));
//     const label = useAppSelector((state) => selectFieldLabel(state, fieldId)) || "";
//     const description = useAppSelector((state) => selectFieldDescription(state, fieldId)) || "";
//     const helpText = useAppSelector((state) => selectFieldHelpText(state, fieldId)) || "";
//     const placeholder = useAppSelector((state) => selectFieldPlaceholder(state, fieldId)) || "";
//     const required = useAppSelector((state) => selectFieldRequired(state, fieldId)) || false;
//     const disabled = useAppSelector((state) => selectFieldDisabled(state, fieldId)) || false;
//     const includeOther = useAppSelector((state) => selectFieldIncludeOther(state, fieldId)) || false;
//     const componentProps = useAppSelector((state) => selectFieldComponentProps(state, fieldId)) || {};
//     const isDirty = useAppSelector((state) => selectFieldIsDirty(state, fieldId)) || false;

//     // Basic info tab component
//     const BasicInfoTab = () => (
//         <div className="space-y-6 max-w-3xl mx-auto">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                     <div className="flex items-center gap-1">
//                         <Label htmlFor="label" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                             Label
//                         </Label>
//                         <HelpIcon text={fieldHelpTextItems.label} />
//                     </div>
//                     <Input
//                         id="label"
//                         name="label"
//                         value={label}
//                         onChange={(e) => dispatch(setLabel({ id: fieldId, label: e.target.value }))}
//                         className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
//                     />
//                 </div>

//                 <div className="space-y-2">
//                     <div className="flex items-center gap-1">
//                         <Label htmlFor="placeholder" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                             Placeholder
//                         </Label>
//                         <HelpIcon text={fieldHelpTextItems.placeholder} />
//                     </div>
//                     <Input
//                         id="placeholder"
//                         name="placeholder"
//                         value={placeholder}
//                         onChange={(e) => dispatch(setPlaceholder({ id: fieldId, placeholder: e.target.value }))}
//                         className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
//                     />
//                 </div>
//             </div>

//             <div className="space-y-2">
//                 <div className="flex items-center gap-1">
//                     <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                         Description
//                     </Label>
//                     <HelpIcon text={fieldHelpTextItems.description} />
//                 </div>
//                 <Textarea
//                     id="description"
//                     name="description"
//                     value={description}
//                     onChange={(e) => dispatch(setDescription({ id: fieldId, description: e.target.value }))}
//                     rows={3}
//                     className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
//                 />
//             </div>

//             <div className="space-y-2">
//                 <div className="flex items-center gap-1">
//                     <Label htmlFor="helpText" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                         Help Text
//                     </Label>
//                     <HelpIcon text={fieldHelpTextItems.helpText} />
//                 </div>
//                 <Textarea
//                     id="helpText"
//                     name="helpText"
//                     value={helpText}
//                     onChange={(e) => dispatch(setHelpText({ id: fieldId, helpText: e.target.value }))}
//                     rows={3}
//                     className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
//                 />
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <Card className="border-gray-200 dark:border-gray-700">
//                     <CardContent className="p-4 space-y-2">
//                         <div className="flex items-center space-x-2">
//                             <Checkbox
//                                 id="required"
//                                 checked={required}
//                                 onCheckedChange={(checked) => dispatch(setRequired({ id: fieldId, required: !!checked }))}
//                             />
//                             <Label htmlFor="required" className="text-gray-800 dark:text-gray-200">
//                                 Required
//                             </Label>
//                             <HelpIcon text={fieldHelpTextItems.required} />
//                         </div>

//                         <div className="text-sm text-gray-500 dark:text-gray-400 ml-6">
//                             The field must have a value when the form is submitted
//                         </div>
//                     </CardContent>
//                 </Card>

//                 <Card className="border-gray-200 dark:border-gray-700">
//                     <CardContent className="p-4 space-y-2">
//                         <div className="flex items-center space-x-2">
//                             <Checkbox
//                                 id="disabled"
//                                 checked={disabled}
//                                 onCheckedChange={(checked) => dispatch(setDisabled({ id: fieldId, disabled: !!checked }))}
//                             />
//                             <Label htmlFor="disabled" className="text-gray-800 dark:text-gray-200">
//                                 Disabled
//                             </Label>
//                             <HelpIcon text={fieldHelpTextItems.disabled || "Disable this field to prevent user interaction"} />
//                         </div>

//                         <div className="text-sm text-gray-500 dark:text-gray-400 ml-6">Prevents users from interacting with this field</div>
//                     </CardContent>
//                 </Card>
//             </div>
//         </div>
//     );

//     // Options Manager tab component - just renders the existing SmartOptionsManager
//     const OptionsManagerTab = () => (
//         <div className="max-w-3xl mx-auto">
//             <SmartOptionsManager fieldId={fieldId} />
//         </div>
//     );

//     // Options Details tab component
//     const OptionsDetailsTab = () => {
//         const hasOptions = ["select", "multiselect", "radio", "checkbox", "button"].includes(component || "");
//         const canHaveOther = ["select", "multiselect", "radio", "checkbox", "button"].includes(component || "");

//         return (
//             <div className="space-y-6 max-w-3xl mx-auto">
//                 {hasOptions && (
//                     <>
//                         <Card className="border-gray-200 dark:border-gray-700">
//                             <CardContent className="p-4 space-y-4">
//                                 <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Selection Settings</h3>

//                                 {component === "multiselect" && (
//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                         <div className="space-y-2">
//                                             <div className="flex items-center gap-1">
//                                                 <Label htmlFor="minItems" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                                     Minimum Items
//                                                 </Label>
//                                                 <HelpIcon text={fieldHelpTextItems.minItems || "Minimum number of selections required"} />
//                                             </div>
//                                             <Input
//                                                 type="number"
//                                                 id="minItems"
//                                                 name="minItems"
//                                                 value={componentProps.minItems || 0}
//                                                 onChange={(e) =>
//                                                     dispatch(
//                                                         setComponentProps({
//                                                             id: fieldId,
//                                                             componentProps: {
//                                                                 ...componentProps,
//                                                                 minItems: parseInt(e.target.value),
//                                                             },
//                                                         })
//                                                     )
//                                                 }
//                                                 min={0}
//                                                 className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                             />
//                                         </div>

//                                         <div className="space-y-2">
//                                             <div className="flex items-center gap-1">
//                                                 <Label htmlFor="maxItems" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                                     Maximum Items
//                                                 </Label>
//                                                 <HelpIcon text={fieldHelpTextItems.maxItems || "Maximum number of selections allowed"} />
//                                             </div>
//                                             <Input
//                                                 type="number"
//                                                 id="maxItems"
//                                                 name="maxItems"
//                                                 value={componentProps.maxItems !== undefined ? componentProps.maxItems : ""}
//                                                 onChange={(e) =>
//                                                     dispatch(
//                                                         setComponentProps({
//                                                             id: fieldId,
//                                                             componentProps: {
//                                                                 ...componentProps,
//                                                                 maxItems: e.target.value ? parseInt(e.target.value) : undefined,
//                                                             },
//                                                         })
//                                                     )
//                                                 }
//                                                 min={0}
//                                                 className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                                 placeholder="No limit"
//                                             />
//                                         </div>
//                                     </div>
//                                 )}

//                                 {(component === "select" || component === "multiselect") && (
//                                     <div className="flex items-center space-x-2">
//                                         <Checkbox
//                                             id="showSelectAll"
//                                             checked={componentProps.showSelectAll || false}
//                                             onCheckedChange={(checked) =>
//                                                 dispatch(
//                                                     setComponentProps({
//                                                         id: fieldId,
//                                                         componentProps: {
//                                                             ...componentProps,
//                                                             showSelectAll: !!checked,
//                                                         },
//                                                     })
//                                                 )
//                                             }
//                                         />
//                                         <Label htmlFor="showSelectAll" className="text-gray-800 dark:text-gray-200">
//                                             Show "Select All" Option
//                                         </Label>
//                                         <HelpIcon
//                                             text={fieldHelpTextItems.showSelectAll || "Adds a 'Select All' option for quick selection"}
//                                         />
//                                     </div>
//                                 )}

//                                 {component === "select" && (
//                                     <div className="space-y-2">
//                                         <div className="flex items-center gap-1">
//                                             <Label htmlFor="autoComplete" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                                 Autocomplete
//                                             </Label>
//                                             <HelpIcon text={fieldHelpTextItems.autoComplete || "Browser autocomplete behavior"} />
//                                         </div>
//                                         <Select
//                                             value={componentProps.autoComplete || "off"}
//                                             onValueChange={(value) =>
//                                                 dispatch(
//                                                     setComponentProps({
//                                                         id: fieldId,
//                                                         componentProps: {
//                                                             ...componentProps,
//                                                             autoComplete: value,
//                                                         },
//                                                     })
//                                                 )
//                                             }
//                                         >
//                                             <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
//                                                 <SelectValue placeholder="Select autocomplete behavior" />
//                                             </SelectTrigger>
//                                             <SelectContent>
//                                                 <SelectItem value="off">Off</SelectItem>
//                                                 <SelectItem value="on">On</SelectItem>
//                                                 <SelectItem value="name">Name</SelectItem>
//                                                 <SelectItem value="email">Email</SelectItem>
//                                                 <SelectItem value="tel">Telephone</SelectItem>
//                                             </SelectContent>
//                                         </Select>
//                                     </div>
//                                 )}
//                             </CardContent>
//                         </Card>

//                         {canHaveOther && (
//                             <Card className="border-gray-200 dark:border-gray-700">
//                                 <CardContent className="p-4 space-y-4">
//                                     <div className="flex items-center space-x-2">
//                                         <Checkbox
//                                             id="includeOther"
//                                             checked={includeOther}
//                                             onCheckedChange={(checked) =>
//                                                 dispatch(setIncludeOther({ id: fieldId, includeOther: !!checked }))
//                                             }
//                                         />
//                                         <Label htmlFor="includeOther" className="text-gray-800 dark:text-gray-200">
//                                             Allow "Other" Text Input
//                                         </Label>
//                                         <HelpIcon text={fieldHelpTextItems.includeOther} />
//                                     </div>
//                                     <div className="text-sm text-gray-500 dark:text-gray-400 ml-6">
//                                         Adds an "Other" option with a text input for custom responses
//                                     </div>
//                                 </CardContent>
//                             </Card>
//                         )}

//                         {(component === "radio" || component === "checkbox" || component === "button") && (
//                             <Card className="border-gray-200 dark:border-gray-700">
//                                 <CardContent className="p-4 space-y-4">
//                                     <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Layout Settings</h3>

//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                         <div className="space-y-2">
//                                             <div className="flex items-center gap-1">
//                                                 <Label htmlFor="direction" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                                     Direction
//                                                 </Label>
//                                                 <HelpIcon text={fieldHelpTextItems.direction || "Layout direction for options"} />
//                                             </div>
//                                             <Select
//                                                 value={componentProps.direction || "vertical"}
//                                                 onValueChange={(value) =>
//                                                     dispatch(
//                                                         setComponentProps({
//                                                             id: fieldId,
//                                                             componentProps: {
//                                                                 ...componentProps,
//                                                                 direction: value as "vertical" | "horizontal",
//                                                             },
//                                                         })
//                                                     )
//                                                 }
//                                             >
//                                                 <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
//                                                     <SelectValue placeholder="Select direction" />
//                                                 </SelectTrigger>
//                                                 <SelectContent>
//                                                     {directionOptions.map((option) => (
//                                                         <SelectItem key={option.value} value={option.value}>
//                                                             {option.label}
//                                                         </SelectItem>
//                                                     ))}
//                                                 </SelectContent>
//                                             </Select>
//                                         </div>

//                                         <div className="space-y-2">
//                                             <div className="flex items-center gap-1">
//                                                 <Label htmlFor="gridCols" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                                     Grid Columns
//                                                 </Label>
//                                                 <HelpIcon text={fieldHelpTextItems.gridCols || "Number of columns in the layout grid"} />
//                                             </div>
//                                             <Select
//                                                 value={componentProps.gridCols || "grid-cols-1"}
//                                                 onValueChange={(value) =>
//                                                     dispatch(
//                                                         setComponentProps({
//                                                             id: fieldId,
//                                                             componentProps: {
//                                                                 ...componentProps,
//                                                                 gridCols: value,
//                                                             },
//                                                         })
//                                                     )
//                                                 }
//                                             >
//                                                 <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
//                                                     <SelectValue placeholder="Select grid columns" />
//                                                 </SelectTrigger>
//                                                 <SelectContent>
//                                                     {gridColsOptions.map((option) => (
//                                                         <SelectItem key={option.value} value={option.value}>
//                                                             {option.label}
//                                                         </SelectItem>
//                                                     ))}
//                                                 </SelectContent>
//                                             </Select>
//                                         </div>
//                                     </div>
//                                 </CardContent>
//                             </Card>
//                         )}
//                     </>
//                 )}

//                 {(component === "textarea" || component === "multiselect") && (
//                     <Card className="border-gray-200 dark:border-gray-700">
//                         <CardContent className="p-4 space-y-4">
//                             <div className="space-y-2">
//                                 <div className="flex items-center gap-1">
//                                     <Label htmlFor="rows" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                         Rows
//                                     </Label>
//                                     <HelpIcon text={fieldHelpTextItems.rows} />
//                                 </div>
//                                 <div className="flex items-center border rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
//                                     <button
//                                         type="button"
//                                         onClick={() => {
//                                             const currentRows = componentProps.rows || 3;
//                                             if (currentRows > 1) {
//                                                 dispatch(
//                                                     setComponentProps({
//                                                         id: fieldId,
//                                                         componentProps: {
//                                                             ...componentProps,
//                                                             rows: currentRows - 1,
//                                                         },
//                                                     })
//                                                 );
//                                             }
//                                         }}
//                                         className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-md"
//                                         aria-label="Decrease rows"
//                                     >
//                                         <span className="text-lg">−</span>
//                                     </button>
//                                     <div className="flex-1 px-3 py-2 text-center text-gray-900 dark:text-gray-100">
//                                         {componentProps.rows || 3} rows
//                                     </div>
//                                     <button
//                                         type="button"
//                                         onClick={() => {
//                                             const currentRows = componentProps.rows || 3;
//                                             dispatch(
//                                                 setComponentProps({
//                                                     id: fieldId,
//                                                     componentProps: {
//                                                         ...componentProps,
//                                                         rows: currentRows + 1,
//                                                     },
//                                                 })
//                                             );
//                                         }}
//                                         className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-md"
//                                         aria-label="Increase rows"
//                                     >
//                                         <span className="text-lg">+</span>
//                                     </button>
//                                 </div>
//                             </div>
//                         </CardContent>
//                     </Card>
//                 )}

//                 {component === "switch" && (
//                     <Card className="border-gray-200 dark:border-gray-700">
//                         <CardContent className="p-4 space-y-4">
//                             <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Switch Labels</h3>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                 <div className="space-y-2">
//                                     <div className="flex items-center gap-1">
//                                         <Label htmlFor="onLabel" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                             ON Label
//                                         </Label>
//                                         <HelpIcon text={fieldHelpTextItems.onLabel || "Text displayed when switch is ON"} />
//                                     </div>
//                                     <Input
//                                         id="onLabel"
//                                         name="onLabel"
//                                         value={componentProps.onLabel || "Yes"}
//                                         onChange={(e) =>
//                                             dispatch(
//                                                 setComponentProps({
//                                                     id: fieldId,
//                                                     componentProps: {
//                                                         ...componentProps,
//                                                         onLabel: e.target.value,
//                                                     },
//                                                 })
//                                             )
//                                         }
//                                         className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                         placeholder="Yes"
//                                     />
//                                 </div>

//                                 <div className="space-y-2">
//                                     <div className="flex items-center gap-1">
//                                         <Label htmlFor="offLabel" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                             OFF Label
//                                         </Label>
//                                         <HelpIcon text={fieldHelpTextItems.offLabel || "Text displayed when switch is OFF"} />
//                                     </div>
//                                     <Input
//                                         id="offLabel"
//                                         name="offLabel"
//                                         value={componentProps.offLabel || "No"}
//                                         onChange={(e) =>
//                                             dispatch(
//                                                 setComponentProps({
//                                                     id: fieldId,
//                                                     componentProps: {
//                                                         ...componentProps,
//                                                         offLabel: e.target.value,
//                                                     },
//                                                 })
//                                             )
//                                         }
//                                         className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                         placeholder="No"
//                                     />
//                                 </div>
//                             </div>
//                         </CardContent>
//                     </Card>
//                 )}

//                 {!hasOptions && !["textarea", "multiselect", "switch", "date"].includes(component || "") && (
//                     <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
//                         No additional options settings available for this component type
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     // Styling tab component
//     const StylingTab = () => (
//         <div className="space-y-6 max-w-3xl mx-auto">
//             <Card className="border-gray-200 dark:border-gray-700">
//                 <CardContent className="p-4 space-y-4">
//                     <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Appearance</h3>

//                     <div className="space-y-2">
//                         <div className="flex items-center gap-1">
//                             <Label htmlFor="width" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                 Width
//                             </Label>
//                             <HelpIcon text={fieldHelpTextItems.width || "Control the width of the field"} />
//                         </div>
//                         <Select
//                             value={componentProps.width || "w-full"}
//                             onValueChange={(value) =>
//                                 dispatch(
//                                     setComponentProps({
//                                         id: fieldId,
//                                         componentProps: {
//                                             ...componentProps,
//                                             width: value,
//                                         },
//                                     })
//                                 )
//                             }
//                         >
//                             <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
//                                 <SelectValue placeholder="Select width" />
//                             </SelectTrigger>
//                             <SelectContent>
//                                 {widthOptions.map((option) => (
//                                     <SelectItem key={option.value} value={option.value}>
//                                         {option.label}
//                                     </SelectItem>
//                                 ))}
//                             </SelectContent>
//                         </Select>
//                     </div>

//                     {(component === "textarea" || component === "text" || component === "email" || component === "password") && (
//                         <div className="space-y-4">
//                             <div className="flex items-center space-x-2">
//                                 <Checkbox
//                                     id="spellCheck"
//                                     checked={componentProps.spellCheck || false}
//                                     onCheckedChange={(checked) =>
//                                         dispatch(
//                                             setComponentProps({
//                                                 id: fieldId,
//                                                 componentProps: {
//                                                     ...componentProps,
//                                                     spellCheck: !!checked,
//                                                 },
//                                             })
//                                         )
//                                     }
//                                 />
//                                 <Label htmlFor="spellCheck" className="text-gray-800 dark:text-gray-200">
//                                     Enable Spell Check
//                                 </Label>
//                                 <HelpIcon text={fieldHelpTextItems.spellCheck || "Enables browser spell checking"} />
//                             </div>

//                             <div className="space-y-2">
//                                 <div className="flex items-center gap-1">
//                                     <Label htmlFor="maxLength" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                         Maximum Length
//                                     </Label>
//                                     <HelpIcon text={fieldHelpTextItems.maxLength || "Maximum number of characters allowed"} />
//                                 </div>
//                                 <Input
//                                     type="number"
//                                     id="maxLength"
//                                     name="maxLength"
//                                     value={componentProps.maxLength !== undefined ? componentProps.maxLength : ""}
//                                     onChange={(e) =>
//                                         dispatch(
//                                             setComponentProps({
//                                                 id: fieldId,
//                                                 componentProps: {
//                                                     ...componentProps,
//                                                     maxLength: e.target.value ? parseInt(e.target.value) : undefined,
//                                                 },
//                                             })
//                                         )
//                                     }
//                                     min={0}
//                                     className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                     placeholder="No limit"
//                                 />
//                             </div>
//                         </div>
//                     )}
//                 </CardContent>
//             </Card>

//             <Card className="border-gray-200 dark:border-gray-700">
//                 <CardContent className="p-4 space-y-4">
//                     <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Value Display</h3>

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div className="space-y-2">
//                             <div className="flex items-center gap-1">
//                                 <Label htmlFor="valuePrefix" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                     Value Prefix
//                                 </Label>
//                                 <HelpIcon text={fieldHelpTextItems.valuePrefix || "Text to display before the value (e.g. $)"} />
//                             </div>
//                             <Input
//                                 id="valuePrefix"
//                                 name="valuePrefix"
//                                 value={componentProps.valuePrefix || ""}
//                                 onChange={(e) =>
//                                     dispatch(
//                                         setComponentProps({
//                                             id: fieldId,
//                                             componentProps: {
//                                                 ...componentProps,
//                                                 valuePrefix: e.target.value,
//                                             },
//                                         })
//                                     )
//                                 }
//                                 className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                 placeholder="e.g. $"
//                             />
//                         </div>

//                         <div className="space-y-2">
//                             <div className="flex items-center gap-1">
//                                 <Label htmlFor="valueSuffix" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                     Value Suffix
//                                 </Label>
//                                 <HelpIcon text={fieldHelpTextItems.valueSuffix || "Text to display after the value (e.g. kg)"} />
//                             </div>
//                             <Input
//                                 id="valueSuffix"
//                                 name="valueSuffix"
//                                 value={componentProps.valueSuffix || ""}
//                                 onChange={(e) =>
//                                     dispatch(
//                                         setComponentProps({
//                                             id: fieldId,
//                                             componentProps: {
//                                                 ...componentProps,
//                                                 valueSuffix: e.target.value,
//                                             },
//                                         })
//                                     )
//                                 }
//                                 className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                 placeholder="e.g. kg"
//                             />
//                         </div>
//                     </div>
//                 </CardContent>
//             </Card>
//         </div>
//     );

//     // Numeric tab component
//     const NumericTab = () => {
//         const hasNumericProps = ["number", "numberPicker", "slider", "rangeSlider"].includes(component || "");

//         return (
//             <div className="space-y-6 max-w-3xl mx-auto">
//                 {hasNumericProps ? (
//                     <Card className="border-gray-200 dark:border-gray-700">
//                         <CardContent className="p-4 space-y-4">
//                             <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Numeric Controls</h3>

//                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                                 <div className="space-y-2">
//                                     <div className="flex items-center gap-1">
//                                         <Label htmlFor="min" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                             Minimum Value
//                                         </Label>
//                                         <HelpIcon text={fieldHelpTextItems.min || "Minimum allowed value"} />
//                                     </div>
//                                     <Input
//                                         type="number"
//                                         id="min"
//                                         name="min"
//                                         value={componentProps.min !== undefined ? componentProps.min : 0}
//                                         onChange={(e) =>
//                                             dispatch(
//                                                 setComponentProps({
//                                                     id: fieldId,
//                                                     componentProps: {
//                                                         ...componentProps,
//                                                         min: parseFloat(e.target.value),
//                                                     },
//                                                 })
//                                             )
//                                         }
//                                         className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                     />
//                                 </div>

//                                 <div className="space-y-2">
//                                     <div className="flex items-center gap-1">
//                                         <Label htmlFor="max" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                             Maximum Value
//                                         </Label>
//                                         <HelpIcon text={fieldHelpTextItems.max || "Maximum allowed value"} />
//                                     </div>
//                                     <Input
//                                         type="number"
//                                         id="max"
//                                         name="max"
//                                         value={componentProps.max !== undefined ? componentProps.max : 100}
//                                         onChange={(e) =>
//                                             dispatch(
//                                                 setComponentProps({
//                                                     id: fieldId,
//                                                     componentProps: {
//                                                         ...componentProps,
//                                                         max: parseFloat(e.target.value),
//                                                     },
//                                                 })
//                                             )
//                                         }
//                                         className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                     />
//                                 </div>

//                                 <div className="space-y-2">
//                                     <div className="flex items-center gap-1">
//                                         <Label htmlFor="step" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                             Step Size
//                                         </Label>
//                                         <HelpIcon text={fieldHelpTextItems.step || "Increment/decrement step size"} />
//                                     </div>
//                                     <Input
//                                         type="number"
//                                         id="step"
//                                         name="step"
//                                         value={componentProps.step !== undefined ? componentProps.step : 1}
//                                         onChange={(e) =>
//                                             dispatch(
//                                                 setComponentProps({
//                                                     id: fieldId,
//                                                     componentProps: {
//                                                         ...componentProps,
//                                                         step: parseFloat(e.target.value),
//                                                     },
//                                                 })
//                                             )
//                                         }
//                                         min={0.001}
//                                         step={0.001}
//                                         className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                     />
//                                 </div>
//                             </div>
//                         </CardContent>
//                     </Card>
//                 ) : component === "date" ? (
//                     <Card className="border-gray-200 dark:border-gray-700">
//                         <CardContent className="p-4 space-y-4">
//                             <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Date Range</h3>

//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                 <div className="space-y-2">
//                                     <div className="flex items-center gap-1">
//                                         <Label htmlFor="minDate" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                             Minimum Date
//                                         </Label>
//                                         <HelpIcon text={fieldHelpTextItems.minDate || "Earliest selectable date"} />
//                                     </div>
//                                     <Input
//                                         type="date"
//                                         id="minDate"
//                                         name="minDate"
//                                         value={componentProps.minDate || ""}
//                                         onChange={(e) =>
//                                             dispatch(
//                                                 setComponentProps({
//                                                     id: fieldId,
//                                                     componentProps: {
//                                                         ...componentProps,
//                                                         minDate: e.target.value,
//                                                     },
//                                                 })
//                                             )
//                                         }
//                                         className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                     />
//                                 </div>

//                                 <div className="space-y-2">
//                                     <div className="flex items-center gap-1">
//                                         <Label htmlFor="maxDate" className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                                             Maximum Date
//                                         </Label>
//                                         <HelpIcon text={fieldHelpTextItems.maxDate || "Latest selectable date"} />
//                                     </div>
//                                     <Input
//                                         type="date"
//                                         id="maxDate"
//                                         name="maxDate"
//                                         value={componentProps.maxDate || ""}
//                                         onChange={(e) =>
//                                             dispatch(
//                                                 setComponentProps({
//                                                     id: fieldId,
//                                                     componentProps: {
//                                                         ...componentProps,
//                                                         maxDate: e.target.value,
//                                                     },
//                                                 })
//                                             )
//                                         }
//                                         className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
//                                     />
//                                 </div>
//                             </div>
//                         </CardContent>
//                     </Card>
//                 ) : (
//                     <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
//                         No numeric settings available for this component type
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     // Advanced tab component for any additional settings
//     const AdvancedTab = () => (
//         <div className="space-y-6 max-w-3xl mx-auto">
//             <Card className="border-gray-200 dark:border-gray-700">
//                 <CardContent className="p-4 space-y-4">
//                     <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Component Information</h3>

//                     <div className="space-y-2">
//                         <div className="flex justify-between items-center">
//                             <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Component Type:</span>
//                             <span className="text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
//                                 {component}
//                             </span>
//                         </div>

//                         <div className="flex justify-between items-center">
//                             <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Field ID:</span>
//                             <span className="text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
//                                 {fieldId}
//                             </span>
//                         </div>
//                     </div>

//                     <div className="text-sm text-gray-500 dark:text-gray-400 pt-2">
//                         <p>
//                             This field component can be used in any context - settings that may seem irrelevant for this specific component
//                             type are still accessible for maximum flexibility.
//                         </p>
//                     </div>
//                 </CardContent>
//             </Card>
//         </div>
//     );

//     // Define tabs for the full-screen overlay
//     const tabs: TabDefinition[] = [
//         {
//             id: "basic",
//             label: "Basic Info",
//             content: <BasicInfoTab />,
//         },
//         {
//             id: "options",
//             label: "Options",
//             content: <OptionsManagerTab />,
//         },
//         {
//             id: "optionsDetails",
//             label: "Selection Settings",
//             content: <OptionsDetailsTab />,
//         },
//         {
//             id: "styling",
//             label: "Styling",
//             content: <StylingTab />,
//         },
//         {
//             id: "numeric",
//             label: "Numeric",
//             content: <NumericTab />,
//         },
//         {
//             id: "advanced",
//             label: "Advanced",
//             content: <AdvancedTab />,
//         },
//     ];

//     // Component name map for display
//     const getComponentDisplayName = (componentType: string): string => {
//         const componentMap: Record<string, string> = {
//             textarea: "Text Area",
//             text: "Text Field",
//             select: "Dropdown",
//             multiselect: "Multi-Select",
//             checkbox: "Checkboxes",
//             radio: "Radio Buttons",
//             switch: "Toggle Switch",
//             date: "Date Picker",
//             button: "Button Group",
//             slider: "Slider",
//             rangeSlider: "Range Slider",
//             number: "Number Input",
//             numberPicker: "Number Picker",
//             email: "Email Field",
//             password: "Password Field",
//             // Add more mappings as needed
//         };

//         return componentMap[componentType] || componentType;
//     };

//     return (
//         <FullScreenOverlay
//             isOpen={isOpen}
//             onClose={onClose}
//             title={`Configure ${getComponentDisplayName(component || "")} Field: ${label}`}
//             description="Customize all available settings for this field. Not all settings apply to every component type, but all are accessible for maximum flexibility."
//             tabs={tabs}
//             initialTab="basic"
//             showSaveButton={true}
//             onSave={onClose}
//             saveButtonLabel="Save Changes"
//             saveButtonDisabled={!isDirty}
//             showCancelButton={true}
//             onCancel={onClose}
//             cancelButtonLabel="Close"
//             width="max-w-5xl"
//         />
//     );
// };
