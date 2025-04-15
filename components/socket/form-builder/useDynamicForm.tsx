"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { Schema, SchemaField } from "@/constants/socket-constants";
import { formatJsonForClipboard } from "../utils/json-utils";
export type FormErrors = Record<string, boolean>;
export type FormNotices = Record<string, string>;


export const useDynamicForm = (
    schema: Schema,
    onChange: (data: Record<string, any>) => void,
    initialData: Record<string, any> = {},
    onSubmit: (data: Record<string, any>) => void
) => {
    const didInitializeRef = useRef(false);

    const getInitialFormData = useCallback(() => {
        // Helper function to recursively apply defaults to nested objects and arrays
        const applyDefaults = (field: SchemaField, value: any): any => {
            // If value is already defined, use it
            if (value !== undefined) {
                return value;
            }

            // Handle array type with REFERENCE (nested objects within array)
            if (field.DATA_TYPE === "array" && field.REFERENCE) {
                // Use field.DEFAULT if it exists and is an array, otherwise create array with one empty object
                const arrayValue = field.DEFAULT && Array.isArray(field.DEFAULT) && field.DEFAULT.length > 0 ? [...field.DEFAULT] : [{}];

                // Apply defaults to each item in the array
                return arrayValue.map((item) => {
                    const newItem: Record<string, any> = {};
                    if (field.REFERENCE) {
                        Object.entries(field.REFERENCE).forEach(([nestedKey, nestedField]) => {
                            newItem[nestedKey] = applyDefaults(nestedField as SchemaField, item[nestedKey]);
                        });
                    }
                    return newItem;
                });
            }

            // Handle array type without REFERENCE
            else if (field.DATA_TYPE === "array") {
                return field.DEFAULT && Array.isArray(field.DEFAULT) ? [...field.DEFAULT] : [];
            }

            // Handle object with REFERENCE (nested object)
            else if (field.REFERENCE) {
                const objValue: Record<string, any> = {};
                Object.entries(field.REFERENCE).forEach(([nestedKey, nestedField]) => {
                    objValue[nestedKey] = applyDefaults(
                        nestedField as SchemaField,
                        value && typeof value === "object" ? value[nestedKey] : undefined
                    );
                });
                return objValue;
            }

            // Handle primitive values
            else {
                return field.DEFAULT;
            }
        };

        // Apply defaults to all top-level fields
        const defaultData = Object.fromEntries(
            Object.entries(schema).map(([key, field]) => {
                return [key, applyDefaults(field, initialData[key])];
            })
        );

        return defaultData;
    }, [schema, initialData]);

    const [formData, setFormData] = useState<Record<string, any>>(getInitialFormData);
    const [errors, setErrors] = useState<FormErrors>({});
    const [notices, setNotices] = useState<FormNotices>({});

    // Defer the initial notification to parent
    useEffect(() => {
        if (!didInitializeRef.current) {
            didInitializeRef.current = true;
            
            // Use requestAnimationFrame to ensure this runs after the render cycle
            requestAnimationFrame(() => {
                onChange(formData);
            });
        }
    }, [formData, onChange]);

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

    const handleChange = useCallback(
        (key: string, value: any) => {
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
                
                // Only call onChange if we're past initialization
                // This prevents state updates during render
                if (didInitializeRef.current) {
                    requestAnimationFrame(() => {
                        onChange(newData);
                    });
                }
                
                return newData;
            });

            setErrors((prev) => ({ ...prev, [key]: false }));
            setNotices((prev) => ({ ...prev, [key]: "" }));
        },
        [onChange]
    );

    const handleBlur = useCallback(
        (key: string, field: SchemaField, value: any) => {
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
        },
        [cleanObjectData, handleChange]
    );

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
        const defaultData = getInitialFormData();
        setFormData(defaultData);
        setErrors({});
        setNotices({});
        
        // Safe way to notify parent
        requestAnimationFrame(() => {
            onChange(defaultData);
        });
    }, [getInitialFormData, onChange]);
    
    const handleCopyToClipboard = useCallback(() => {
        const textToCopy = formatJsonForClipboard(formData);
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {})
            .catch((err) => {
                console.error("Failed to copy to clipboard:", err);
            });
    }, [formData]);

    const handleDeleteArrayItem = useCallback(
        (key: string, index: number) => {
            setFormData((prev) => {
                const newData = { ...prev };
                const path = key.split(/\.|\[|\]/).filter(Boolean);
                let current = newData;
                
                // Navigate to the appropriate nested object
                for (let i = 0; i < path.length; i++) {
                    if (!current[path[i]]) break;
                    current = current[path[i]];
                }
                
                if (Array.isArray(current)) {
                    const updatedArray = current.filter((_, i) => i !== index);
                    current.splice(0, current.length, ...updatedArray);
                    
                    // Only notify parent if we're initialized
                    if (didInitializeRef.current) {
                        requestAnimationFrame(() => {
                            onChange(newData);
                        });
                    }
                    
                    return newData;
                }
                
                return prev;
            });
        },
        [onChange]
    );

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