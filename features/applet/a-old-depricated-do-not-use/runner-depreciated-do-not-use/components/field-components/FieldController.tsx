// "use client";

// import React from "react";
// import {
//     GroupFieldConfig,
//     TabSearchConfig,
//     SelectFieldConfig,
//     ButtonFieldConfig,
//     TextareaFieldConfig,
//     InputFieldConfig,
//     SelectField,
//     ButtonField,
//     TextareaField,
//     InputField,
//     NumberInputField,
//     CheckboxGroupField,
//     RadioGroupField,
//     SliderField,
//     MultiSelectField,
//     CheckboxGroupFieldConfig,
//     RadioGroupFieldConfig,
//     SliderFieldConfig,
//     MultiSelectFieldConfig,
// } from ".";
// import { SwitchField, SwitchFieldConfig } from "./SwitchField";
// import { ComponentType, FieldDefinition } from "@/types/customAppTypes";


// // ========================== TODO: Some of these types need to be added to the field controller. ============================================

// export const componentOptions: { value: ComponentType; label: string }[] = [
//     { value: "textarea", label: "Textarea" },
//     { value: "input", label: "Input" },
//     { value: "select", label: "Select" },
//     { value: "multiselect", label: "Multiselect" },
//     { value: "radio", label: "Radio" },
//     { value: "checkbox", label: "Checkbox" },
//     { value: "slider", label: "Slider" },
//     { value: "number", label: "Number" },
//     { value: "date", label: "Date" },
//     { value: "switch", label: "Switch" },
//     { value: "button", label: "Button" },
//     { value: "rangeSlider", label: "Range Slider" },
//     { value: "numberPicker", label: "Number Picker" },
//     { value: "jsonField", label: "JSON Field" },
//     { value: "fileUpload", label: "File Upload" },
// ];


// export const fieldController = (field: FieldDefinition, isMobile: boolean) => {
//     switch (field.type) {
//         case "select": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <SelectField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as SelectFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//         case "button": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <ButtonField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as ButtonFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//         case "textarea": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <TextareaField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as TextareaFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//         case "date": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <InputField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={{ type: "date", ...customConfig }}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//         case "number": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <NumberInputField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as InputFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//         case "checkbox": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <CheckboxGroupField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as CheckboxGroupFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//         case "radio": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <RadioGroupField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as RadioGroupFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//         case "slider": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <SliderField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as SliderFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//         case "multiselect": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <MultiSelectField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as MultiSelectFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//         case "switch": {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <SwitchField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as SwitchFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }

//         default: {
//             const { customConfig, ...commonProps } = field;
//             return (
//                 <InputField
//                     id={field.brokerId}
//                     label={field.label}
//                     placeholder={field.placeholder || ""}
//                     customConfig={customConfig as InputFieldConfig}
//                     isMobile={isMobile}
//                 />
//             );
//         }
//     }
// };
