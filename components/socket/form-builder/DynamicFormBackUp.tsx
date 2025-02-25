// Updated DynamicForm component with field overrides
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatLabel, formatPlaceholder } from "../utils/label-util";

import { Schema, SchemaField } from "@/constants/socket-constants";
import { RefreshCcw, Send, Copy, Plus, Trash } from "lucide-react";
import { formatJsonForClipboard } from "../utils/json-utils";

// Define field override types
export type FieldType = "input" | "textarea" | "switch";

export interface FieldOverride {
    type: FieldType;
    props?: Record<string, any>; // Additional props to pass to the field component
}

export type FieldOverrides = Record<string, FieldOverride>;

interface DynamicFormProps {
    schema: Schema;
    onChange: (data: any) => void;
    initialData?: any;
    onSubmit: (data: any) => void;
    fieldOverrides?: FieldOverrides; // New prop for field overrides
}

const DynamicForm: React.FC<DynamicFormProps> = ({
    schema,
    onChange,
    initialData = {},
    onSubmit,
    fieldOverrides = {}, // Default to empty object
}) => {
    const [formData, setFormData] = React.useState(initialData);
    const [errors, setErrors] = React.useState<{ [key: string]: boolean }>({});
    const [notices, setNotices] = React.useState<{ [key: string]: string }>({});

    const cleanObjectData = (value: any): any => {
        if (typeof value === "string") {
            try {
                const parsed = JSON.parse(value);
                return cleanObjectData(parsed);
            } catch {
                return value;
            }
        }
        if (Array.isArray(value)) {
            return value.map(cleanObjectData);
        }
        if (typeof value === "object" && value !== null) {
            const cleaned: Record<string, any> = {};
            for (const [key, val] of Object.entries(value)) {
                cleaned[key] = cleanObjectData(val);
            }
            return cleaned;
        }
        return value;
    };

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => {
            const newData = { ...prev };
            const path = key.split(/\.|\[|\]/).filter(Boolean);
            let current = newData;
            for (let i = 0; i < path.length - 1; i++) {
                const segment = path[i];
                if (!current[segment]) {
                    current[segment] = /^\d+$/.test(path[i + 1]) ? [] : {};
                }
                current = current[segment];
            }
            current[path[path.length - 1]] = value;
            onChange(newData);
            return newData;
        });
        setErrors((prev) => ({ ...prev, [key]: false }));
        setNotices((prev) => ({ ...prev, [key]: "" }));
    };

    const handleBlur = (key: string, field: SchemaField, value: any) => {
        if (field.DATA_TYPE === "object") {
            try {
                const cleanedValue = cleanObjectData(value);
                const prettyValue = JSON.stringify(cleanedValue, null, 2);
                handleChange(key, prettyValue);
                setNotices((prev) => ({ ...prev, [key]: "" }));
            } catch {
                setNotices((prev) => ({ ...prev, [key]: "Invalid JSON format" }));
            }
            return;
        }
        if (field.VALIDATION) {
            console.log("field.VALIDATION Validation not set up... ", field.VALIDATION);
            // const isValid = field.VALIDATION(value);
            // setErrors((prev) => ({ ...prev, [key]: !isValid }));
        } else if (field.REQUIRED && (value === undefined || value === "")) {
            setErrors((prev) => ({ ...prev, [key]: true }));
        } else {
            setErrors((prev) => ({ ...prev, [key]: false }));
        }
    };

    const handleSubmit = () => {
        const validatedData = { ...formData };
        Object.entries(schema).forEach(([key, field]) => {
            const value = validatedData[key] ?? field.DEFAULT;
            if (field.DATA_TYPE === "object" && typeof value === "string") {
                try {
                    validatedData[key] = cleanObjectData(value);
                } catch {
                    setErrors((prev) => ({ ...prev, [key]: true }));
                }
            }
        });
        onSubmit(validatedData);
    };

    const handleReset = () => {
        const defaultData = Object.fromEntries(Object.entries(schema).map(([key, field]) => [key, field.DEFAULT]));
        setFormData(defaultData);
        setErrors({});
        setNotices({});
        onChange(defaultData);
    };

    const handleCopyToClipboard = () => {
        const textToCopy = formatJsonForClipboard(formData);
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {})
            .catch((err) => {
                console.error("Failed to copy to clipboard:", err);
            });
    };

    const handleDeleteArrayItem = (key: string, index: number) => {
        setFormData((prev) => {
            const newData = { ...prev };
            const array = newData[key];
            if (Array.isArray(array)) {
                const updatedArray = array.filter((_, i) => i !== index);
                newData[key] = updatedArray;
                onChange(newData);
                return newData;
            }
            return prev;
        });
    };

    // Function to get the field override for a given path
    const getFieldOverride = (path: string): FieldOverride | undefined => {
        return fieldOverrides[path];
    };

    const renderField = (key: string, field: SchemaField, path: string = "") => {
        const fullPath = path ? `${path}.${key}` : key;
        let value =
            path
                .split(/\.|\[|\]/)
                .filter(Boolean)
                .reduce((obj, k) => obj?.[k], formData)?.[key] ?? field.DEFAULT;
        const hasError = errors[fullPath];
        const notice = notices[fullPath] || "";

        if (field.DATA_TYPE === "array" && field.REFERENCE) {
            if (!Array.isArray(value)) value = field.DEFAULT;
            return (
                <div key={fullPath} className="w-full">
                    <div className="grid grid-cols-12 gap-2 mb-2">
                        <div className="col-span-1 text-slate-700 dark:text-slate-300 font-medium">{formatLabel(key)}</div>
                        <div className="col-span-11">
                            <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                                {value.map((_, index) => (
                                    <div key={`${fullPath}[${index}]`} className="relative">
                                        {Object.entries(field.REFERENCE).map(([nestedKey, nestedField]) =>
                                            renderField(nestedKey, nestedField as SchemaField, `${fullPath}[${index}]`)
                                        )}
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="absolute right-0 top-0 mt-2 mr-2"
                                            onClick={() => handleDeleteArrayItem(key, index)}
                                        >
                                            <Trash className="w-5 h-5 p-0" />
                                        </Button>
                                        {index < value.length - 1 && <hr className="my-4 border-slate-300 dark:border-slate-600" />}
                                    </div>
                                ))}
                                <Button
                                    onClick={() => {
                                        const newArray = [...value, {}];
                                        handleChange(fullPath, newArray);
                                    }}
                                    variant="outline"
                                    className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <Plus className="w-5 h-5 mr-1" />
                                    {formatLabel(key)} Entry
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (field.REFERENCE) {
            if (typeof value !== "object" || value === null) value = field.DEFAULT;
            return (
                <div key={fullPath} className="w-full mb-4">
                    <div className="grid grid-cols-12 gap-4 mb-2">
                        <div className="col-span-1 text-slate-700 dark:text-slate-300 font-medium">{formatLabel(key)}</div>
                        <div className="col-span-11">
                            <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                                {Object.entries(field.REFERENCE).map(([nestedKey, nestedField]) =>
                                    renderField(nestedKey, nestedField as SchemaField, fullPath)
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        const labelContent = (
            <div className="flex items-start gap-1">
                <span className="text-slate-700 dark:text-slate-300">{formatLabel(key)}</span>
                {field.REQUIRED && <span className="text-red-500 text-sm leading-none">*</span>}
            </div>
        );

        // Get field override if exists
        const override = getFieldOverride(fullPath);

        const inputField = () => {
            // Handle boolean fields
            if (field.DATA_TYPE === "boolean" || (field.DATA_TYPE === null && typeof field.DEFAULT === "boolean")) {
                return (
                    <Switch
                        checked={!!value}
                        onCheckedChange={(checked) => handleChange(fullPath, checked)}
                        onBlur={() => handleBlur(fullPath, field, value)}
                        {...(override?.props || {})}
                    />
                );
            }

            // Handle object fields
            if (field.DATA_TYPE === "object") {
                const stringValue = typeof value === "string" ? value : JSON.stringify(value, null, 2);
                return (
                    <div>
                        <Textarea
                            value={stringValue}
                            onChange={(e) => handleChange(fullPath, e.target.value)}
                            onBlur={() => handleBlur(fullPath, field, stringValue)}
                            className={`w-full font-mono text-sm bg-background border-input ${
                                hasError ? "border-red-500" : ""
                            } min-h-[200px]`}
                            placeholder={`${formatPlaceholder(key)} as JSON`}
                            {...(override?.props || {})}
                        />
                        {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
                    </div>
                );
            }

            // Apply overrides for regular fields
            if (override) {
                switch (override.type) {
                    case "textarea":
                        return (
                            <Textarea
                                value={value || ""}
                                onChange={(e) => handleChange(fullPath, e.target.value)}
                                onBlur={() => handleBlur(fullPath, field, value)}
                                className={`w-full bg-background ${hasError ? "border-red-500" : ""}`}
                                placeholder={formatPlaceholder(key)}
                                {...(override.props || {})}
                            />
                        );
                    case "switch":
                        return (
                            <Switch
                                checked={!!value}
                                onCheckedChange={(checked) => handleChange(fullPath, checked)}
                                onBlur={() => handleBlur(fullPath, field, value)}
                                {...(override.props || {})}
                            />
                        );
                    case "input":
                    default:
                        return (
                            <Input
                                type="text"
                                value={value || ""}
                                onChange={(e) => handleChange(fullPath, e.target.value)}
                                onBlur={() => handleBlur(fullPath, field, value)}
                                className={`w-full bg-background ${hasError ? "border-red-500" : ""}`}
                                placeholder={formatPlaceholder(key)}
                                {...(override.props || {})}
                            />
                        );
                }
            }

            // Default to Input if no override
            return (
                <Input
                    type="text"
                    value={value || ""}
                    onChange={(e) => handleChange(fullPath, e.target.value)}
                    onBlur={() => handleBlur(fullPath, field, value)}
                    className={`w-full bg-background ${hasError ? "border-red-500" : ""}`}
                    placeholder={formatPlaceholder(key)}
                />
            );
        };

        return (
            <div key={fullPath} className="grid grid-cols-12 gap-4 mb-4">
                <Label className="col-span-1 text-sm font-medium">{labelContent}</Label>
                <div className="col-span-11">{inputField()}</div>
            </div>
        );
    };

    return (
        <div className="w-full bg-slate-100 dark:bg-slate-800 p-4 pb-0 rounded">
            <div className="w-full space-y-4">{Object.entries(schema).map(([key, field]) => renderField(key, field))}</div>
            <div className="mt-3 flex justify-end gap-4">
                <Button
                    type="submit"
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    onClick={handleSubmit}
                >
                    <Send className="w-4 h-4 mr-1" />
                    Submit
                </Button>
                <Button
                    variant="outline"
                    className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                    onClick={handleReset}
                >
                    <RefreshCcw className="w-4 h-4 mr-1" />
                    Reset
                </Button>
                <Button
                    variant="outline"
                    className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                    onClick={handleCopyToClipboard}
                >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Data
                </Button>
            </div>
        </div>
    );
};

export default DynamicForm;
