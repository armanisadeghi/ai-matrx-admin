"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Send, Copy } from "lucide-react";
import { Schema, SchemaField } from "@/constants/socket-constants";
import FormField, { FieldOverrides } from "./FormField";
import { useDynamicForm } from "./useDynamicForm";

interface FormFieldsProps {
    schema: Schema;
    formData: Record<string, any>;
    errors: Record<string, boolean>;
    notices: Record<string, string>;
    onChange: (key: string, value: any) => void;
    onBlur: (key: string, field: SchemaField, value: any) => void;
    onDeleteArrayItem?: (key: string, index: number) => void;
    fieldOverrides?: FieldOverrides;
}

// FormFields component remains unchanged
const FormFields = React.memo(
    ({ schema, formData, errors, notices, onChange, onBlur, onDeleteArrayItem, fieldOverrides = {} }: FormFieldsProps) => {
        return (
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
                        onChange={onChange}
                        onBlur={onBlur}
                        onDeleteArrayItem={onDeleteArrayItem}
                        fieldOverrides={fieldOverrides}
                    />
                ))}
            </div>
        );
    }
);

FormFields.displayName = "FormFields";

interface DynamicFormProps {
    schema: Schema;
    onChange: (data: Record<string, any>) => void;
    initialData?: Record<string, any>;
    onSubmit: (data: Record<string, any>) => void;
    fieldOverrides?: FieldOverrides;
    minimalSpace?: boolean; // Added new prop
}

const DynamicForm: React.FC<DynamicFormProps> = ({
    schema,
    onChange,
    initialData = {},
    onSubmit,
    fieldOverrides = {},
    minimalSpace = false, // Default to false
}) => {
    const { formData, errors, notices, handleChange, handleBlur, handleSubmit, handleReset, handleCopyToClipboard, handleDeleteArrayItem } =
        useDynamicForm(schema, onChange, initialData, onSubmit);

        


    const actionButtons = useMemo(() => {
        if (minimalSpace) {
            return (
                <div className="mt-3 flex justify-end gap-2">
                    <Button
                        type="submit"
                        variant="default"
                        size="icon"
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-10 h-10"
                        onClick={handleSubmit}
                        title="Submit"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg w-10 h-10"
                        onClick={handleReset}
                        title="Reset"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg w-10 h-10"
                        onClick={handleCopyToClipboard}
                        title="Copy Data"
                    >
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>
            );
        }

        // Original button layout
        return (
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
        );
    }, [handleSubmit, handleReset, handleCopyToClipboard, minimalSpace]);

    return (
        <div className="w-full bg-slate-100 dark:bg-slate-800 p-4 pb-2 rounded">
            <FormFields
                schema={schema}
                formData={formData}
                errors={errors}
                notices={notices}
                onChange={handleChange}
                onBlur={handleBlur}
                onDeleteArrayItem={handleDeleteArrayItem}
                fieldOverrides={fieldOverrides}
            />
            {actionButtons}
        </div>
    );
};

export default React.memo(DynamicForm);