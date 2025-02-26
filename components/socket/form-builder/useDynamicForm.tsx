'use client';

import { useState, useCallback } from "react";
import { Schema, SchemaField } from "@/constants/socket-constants";
import { formatJsonForClipboard } from "../utils/json-utils";

export type FormErrors = Record<string, boolean>;
export type FormNotices = Record<string, string>;

export const useDynamicForm = (
    schema: Schema,
    onChange: (data: Record<string, any>) => void,
    initialData: Record<string, any> = {},
    onSubmit: (data: Record<string, any>) => void,
) => {
    const [formData, setFormData] = useState<Record<string, any>>(initialData);
    const [errors, setErrors] = useState<FormErrors>({});
    const [notices, setNotices] = useState<FormNotices>({});

    const cleanObjectData = useCallback((value: any): any => {
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
    }, []);

    const handleChange = useCallback((key: string, value: any) => {
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
    }, [onChange]);

    const handleBlur = useCallback((key: string, field: SchemaField, value: any) => {
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
        } else if (field.REQUIRED && (value === undefined || value === "")) {
            setErrors((prev) => ({ ...prev, [key]: true }));
        } else {
            setErrors((prev) => ({ ...prev, [key]: false }));
        }
    }, [cleanObjectData, handleChange]);

    const handleSubmit = useCallback(() => {
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
    }, [formData, schema, onSubmit, cleanObjectData]);

    const handleReset = useCallback(() => {
        const defaultData = Object.fromEntries(
            Object.entries(schema).map(([key, field]) => [key, field.DEFAULT])
        );
        
        setFormData(defaultData);
        setErrors({});
        setNotices({});
        onChange(defaultData);
    }, [schema, onChange]);

    const handleCopyToClipboard = useCallback(() => {
        const textToCopy = formatJsonForClipboard(formData);
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {})
            .catch((err) => {
                console.error("Failed to copy to clipboard:", err);
            });
    }, [formData]);

    const handleDeleteArrayItem = useCallback((key: string, index: number) => {
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
    }, [onChange]);

    return {
        formData,
        errors,
        notices,
        handleChange,
        handleBlur,
        handleSubmit,
        handleReset,
        handleCopyToClipboard,
        handleDeleteArrayItem,
    };
};

export type DynamicFormHook = ReturnType<typeof useDynamicForm>;