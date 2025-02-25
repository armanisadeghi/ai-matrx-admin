import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Send, Copy } from "lucide-react";
import { formatJsonForClipboard } from "../utils/json-utils";
import { Schema, SchemaField } from "@/constants/socket-constants";
import FormField, { FieldOverrides } from "./FormField";

interface DynamicFormProps {
    schema: Schema;
    onChange: (data: any) => void;
    initialData?: any;
    onSubmit: (data: any) => void;
    fieldOverrides?: FieldOverrides;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
    schema,
    onChange,
    initialData = {},
    onSubmit,
    fieldOverrides = {},
}) => {
    const [formData, setFormData] = React.useState(initialData);
    const [errors, setErrors] = React.useState<{ [key: string]: boolean }>({});
    const [notices, setNotices] = React.useState<{ [key: string]: string }>({});

    // Function to clean object data from string representation
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

    // Handle form field changes
    const handleChange = (key: string, value: any) => {
        setFormData((prev) => {
            const newData = { ...prev };
            const path = key.split(/\.|\[|\]/).filter(Boolean);
            let current = newData;
            
            for (let i = 0; i < path.length - 1; i++) {
                const segment = path[i];
                if (!current[segment]) {
                    // Create array or object based on next segment
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

    // Validate field on blur
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

    // Submit the form
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

    // Reset the form to default values
    const handleReset = () => {
        const defaultData = Object.fromEntries(
            Object.entries(schema).map(([key, field]) => [key, field.DEFAULT])
        );
        
        setFormData(defaultData);
        setErrors({});
        setNotices({});
        onChange(defaultData);
    };

    // Copy form data to clipboard
    const handleCopyToClipboard = () => {
        const textToCopy = formatJsonForClipboard(formData);
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {})
            .catch((err) => {
                console.error("Failed to copy to clipboard:", err);
            });
    };

    // Handle array item deletion
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

    return (
        <div className="w-full bg-slate-100 dark:bg-slate-800 p-4 pb-0 rounded">
            <div className="w-full space-y-4">
                {Object.entries(schema).map(([key, field]) => (
                    <FormField
                        key={key}
                        fieldKey={key}
                        field={field}
                        path=""
                        value={formData[key] ?? field.DEFAULT}
                        errors={errors}
                        notices={notices}
                        formData={formData}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onDeleteArrayItem={handleDeleteArrayItem}
                        fieldOverrides={fieldOverrides}
                    />
                ))}
            </div>
            
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