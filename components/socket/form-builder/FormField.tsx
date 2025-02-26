import React, { useMemo } from "react";
import { FancyInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FancyTextarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash, Link } from "lucide-react";
import { formatLabel, formatPlaceholder } from "../utils/label-util";
import { SchemaField } from "@/constants/socket-constants";
import ArrayField from "./ArrayField";
import * as LucideIcons from "lucide-react";

export type FieldType = "input" | "textarea" | "switch";
export interface FieldOverride {
    type: FieldType;
    props?: Record<string, any>;
}
export type FieldOverrides = Record<string, FieldOverride>;

interface FormFieldProps {
    fieldKey: string;
    field: SchemaField;
    path: string;
    value: any;
    errors: { [key: string]: boolean };
    notices: { [key: string]: string };
    formData: any;
    onChange: (key: string, value: any) => void;
    onBlur: (key: string, field: SchemaField, value: any) => void;
    onDeleteArrayItem?: (key: string, index: number) => void;
    fieldOverrides?: FieldOverrides;
}

const FormField: React.FC<FormFieldProps> = ({
    fieldKey,
    field,
    path = "",
    value,
    errors,
    notices,
    formData,
    onChange,
    onBlur,
    onDeleteArrayItem,
    fieldOverrides = {},
}) => {
    const fullPath = path ? `${path}.${fieldKey}` : fieldKey;
    const hasError = errors[fullPath];
    const notice = notices[fullPath] || "";

    const getFieldOverride = (path: string): FieldOverride | undefined => {
        return fieldOverrides[path];
    };

    if (field.DATA_TYPE === "array") {
        if (!Array.isArray(value) || value.length === 0) {
            value = field.DEFAULT && Array.isArray(field.DEFAULT) && field.DEFAULT.length > 0 ? field.DEFAULT : field.REFERENCE ? [{}] : [];
        }

        if (!field.REFERENCE) {
            return (
                <ArrayField
                    fieldKey={fieldKey}
                    field={field}
                    fullPath={fullPath}
                    value={value}
                    hasError={hasError}
                    onChange={onChange}
                    onBlur={onBlur}
                />
            );
        }    

        const handleRemoveItem = (index: number) => {
            if (value.length <= 1) {
                const updatedValue = [{}];
                onChange(fullPath, updatedValue);
            } else {
                const updatedValue = value.filter((_, i) => i !== index);
                onChange(fullPath, updatedValue);
            }
            onDeleteArrayItem?.(fullPath, index);
        };

        return (
            <div className="w-full">
                <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-1 text-slate-700 dark:text-slate-300 font-medium">{formatLabel(fieldKey)}</div>
                    <div className="col-span-11">
                        <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                            {value.map((item: any, index: number) => (
                                <div key={`${fullPath}[${index}]`} className="relative">
                                    {Object.entries(field.REFERENCE).map(([nestedKey, nestedField]) => (
                                        <FormField
                                            key={`${fullPath}[${index}].${nestedKey}`}
                                            fieldKey={nestedKey}
                                            field={nestedField as SchemaField}
                                            path={`${fullPath}[${index}]`}
                                            value={item?.[nestedKey] ?? (nestedField as SchemaField).DEFAULT}
                                            errors={errors}
                                            notices={notices}
                                            formData={formData}
                                            onChange={onChange}
                                            onBlur={onBlur}
                                            onDeleteArrayItem={onDeleteArrayItem}
                                            fieldOverrides={fieldOverrides}
                                        />
                                    ))}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="absolute right-0 top-0 mt-2 mr-2"
                                        onClick={() => handleRemoveItem(index)}
                                    >
                                        <Trash className="w-5 h-5 p-0" />
                                    </Button>
                                    {index < value.length - 1 && <hr className="my-4 border-slate-300 dark:border-slate-600" />}
                                </div>
                            ))}
                            <Button
                                onClick={() => {
                                    const newArray = [...value, {}];
                                    onChange(fullPath, newArray);
                                }}
                                variant="outline"
                                className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <Plus className="w-5 h-5 mr-1" />
                                {formatLabel(fieldKey)} Entry
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Handle object/reference fields
    if (field.REFERENCE) {
        if (typeof value !== "object" || value === null) value = field.DEFAULT || {};
        return (
            <div className="w-full mb-4">
                <div className="grid grid-cols-12 gap-4 mb-2">
                    <div className="col-span-1 text-slate-700 dark:text-slate-300 font-medium">{formatLabel(fieldKey)}</div>
                    <div className="col-span-11">
                        <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                            {Object.entries(field.REFERENCE).map(([nestedKey, nestedField]) => (
                                <FormField
                                    key={`${fullPath}.${nestedKey}`}
                                    fieldKey={nestedKey}
                                    field={nestedField as SchemaField}
                                    path={fullPath}
                                    value={value?.[nestedKey] ?? (nestedField as SchemaField).DEFAULT}
                                    errors={errors}
                                    notices={notices}
                                    formData={formData}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    onDeleteArrayItem={onDeleteArrayItem}
                                    fieldOverrides={fieldOverrides}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Handle primitive fields
    const labelContent = (
        <div className="flex items-start gap-1">
            <span className="text-slate-700 dark:text-slate-300">{formatLabel(fieldKey)}</span>
            {field.REQUIRED && <span className="text-red-500 text-sm leading-none">*</span>}
        </div>
    );

    const override = getFieldOverride(fullPath);
    const iconName = field.iconName || "File";
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.File;
    const inputField = () => {
        if (field.DATA_TYPE === "boolean" || (field.DATA_TYPE === null && typeof field.DEFAULT === "boolean")) {
            return (
                <Switch
                    checked={!!value}
                    onCheckedChange={(checked) => onChange(fullPath, checked)}
                    onBlur={() => onBlur(fullPath, field, value)}
                    {...(override?.props || {})}
                />
            );
        }

        if (field.DATA_TYPE === "object") {
            const stringValue = typeof value === "string" ? value : JSON.stringify(value, null, 2);
            return (
                <div>
                    <FancyTextarea
                        value={stringValue}
                        onChange={(e) => onChange(fullPath, e.target.value)}
                        onBlur={() => onBlur(fullPath, field, stringValue)}
                        className={`w-full font-mono text-sm bg-background border-input ${hasError ? "border-red-500" : ""} min-h-[200px]`}
                        placeholder={`${formatPlaceholder(fieldKey)} as JSON`}
                        {...(override?.props || {})}
                    />
                    {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
                </div>
            );
        }

        if (override) {
            switch (override.type) {
                case "textarea":
                    return (
                        <FancyTextarea
                            value={value || ""}
                            prefix={<Icon className="w-4 h-4" />}
                            onChange={(e) => onChange(fullPath, e.target.value)}
                            onBlur={() => onBlur(fullPath, field, value)}
                            className={`w-full bg-background ${hasError ? "border-red-500" : ""}`}
                            placeholder={formatPlaceholder(fieldKey)}
                            {...(override.props || {})}
                        />
                    );
                case "switch":
                    return (
                        <Switch
                            checked={!!value}
                            onCheckedChange={(checked) => onChange(fullPath, checked)}
                            onBlur={() => onBlur(fullPath, field, value)}
                            {...(override.props || {})}
                        />
                    );
                case "input":
                default:
                    return (
                        <FancyInput
                            type="text"
                            prefix={<Icon className="w-4 h-4" />}
                            value={value || ""}
                            onChange={(e) => onChange(fullPath, e.target.value)}
                            onBlur={() => onBlur(fullPath, field, value)}
                            className={`w-full bg-background ${hasError ? "border-red-500" : ""}`}
                            placeholder={formatPlaceholder(fieldKey)}
                            {...(override.props || {})}
                        />
                    );
            }
        }

        return (
            <FancyInput
                type="text"
                prefix={<Icon className="w-4 h-4" />}
                value={value || ""}
                onChange={(e) => onChange(fullPath, e.target.value)}
                onBlur={() => onBlur(fullPath, field, value)}
                className={`w-full bg-background ${hasError ? "border-red-500" : ""}`}
                placeholder={formatPlaceholder(fieldKey)}
            />
        );
    };

    return (
        <div className="grid grid-cols-12 gap-4 mb-4">
            <Label className="col-span-1 text-sm font-medium">{labelContent}</Label>
            <div className="col-span-11">{inputField()}</div>
        </div>
    );
};

export default FormField;