'use client';
import React from 'react';
import FormField from "./FormField";
import {DynamicFieldConfig} from "../types";

interface DynamicFieldsProps {
    fields: DynamicFieldConfig[];
    parentValue: string;
    onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const DynamicFields: React.FC<DynamicFieldsProps> = (
    {
        fields,
        parentValue,
        onFieldChange,
    }) => {
    const [dynamicValues, setDynamicValues] = React.useState<Record<string, string>>({});

    const handleDynamicChange = (fieldName: string) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setDynamicValues(prev => ({
            ...prev,
            [fieldName]: e.target.value
        }));
    };

    return (
        <div className="ml-6 border-l-2 border-border pl-4">
            {fields.map((field, index) => (
                <FormField
                    key={`${field.label}-${index}`}
                    label={field.label}
                    type={field.type}
                    description={field.description}
                    variant={field.variant}
                    singleLine={field.singleLine}
                    value={dynamicValues[field.label]}
                    onChange={handleDynamicChange(field.label)}
                />
            ))}
        </div>
    );
};

export default DynamicFields;
