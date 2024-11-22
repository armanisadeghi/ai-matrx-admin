// page.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import FormField from "./components/FormField";
import { FormVariant, FieldType, DynamicFieldConfig } from './types';

interface FormData {
    name: string;
    rf_id: string;
    description: string;
    file: string;
    datetime: string;
    website: string;
    code: string;
    input_params: string;
    output_options: string;
}

const ExampleForm = () => {
    const [formData, setFormData] = React.useState<FormData>({
        name: '',
        rf_id: '',
        description: '',
        file: '',
        datetime: '',
        website: '',
        code: '',
        input_params: '',
        output_options: ''
    });

    const handleChange = (field: keyof FormData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const parameterFields: DynamicFieldConfig[] = [
        {
            label: "parameter_name",
            type: "varchar",
            description: "Name of the parameter",
            singleLine: true
        },
        {
            label: "parameter_type",
            type: "varchar",
            description: "Type of the parameter",
            variant: "code",
            singleLine: true
        },
        {
            label: "parameter_type2",
            type: "uuid",
            description: "Type of the parameter",
            variant: "code",
            singleLine: true
        },
        {
            label: "parameter_type3",
            type: "text",
            description: "Type of the parameter",
            variant: "code",
            singleLine: true
        }

    ];

    const handleParameterAction = () => {
        console.log("Parameter action triggered");
        // Additional logic if needed
    };


    return (
        <div className="p-6 bg-background text-foreground max-w-2xl">
            <FormField
                label="name"
                type="varchar"
                description="This is a varchar field"
                value={formData.name}
                onChange={handleChange('name')}
                singleLine
            />

            <FormField
                label="rf_id"
                type="uuid"
                description="This is a UUID field"
                value={formData.rf_id}
                onChange={handleChange('rf_id')}
                variant="record"
                singleLine
            />

            <FormField
                label="description"
                type="text"
                description="This is a text field"
                value={formData.description}
                onChange={handleChange('description')}
                variant="edit"
                optional
            />
            <FormField
                label="input_params"
                type="jsonb"
                description="Input parameters configuration"
                value={formData.input_params}
                onChange={handleChange('input_params')}
                variant="json"
                dynamicFields={parameterFields}
                onAction={handleParameterAction}
            />

            <FormField
                label="file"
                type="file"
                description="This is a file field"
                value={formData.file}
                onChange={handleChange('file')}
                variant="file"
                singleLine
            />
            <FormField
                label="input_params"
                type="jsonb"
                description="Input parameters configuration"
                value={formData.input_params}
                onChange={handleChange('input_params')}
                variant="json"
                dynamicFields={parameterFields}
                onAction={handleParameterAction}
            />

            <FormField
                label="datetime"
                type="datetime"
                description="This is a datetime field"
                value={formData.datetime}
                onChange={handleChange('datetime')}
                variant="datetime"
                singleLine
            />

            <FormField
                label="website"
                type="url"
                description="This is a URL field"
                value={formData.website}
                onChange={handleChange('website')}
                variant="url"
                singleLine
            />

            <FormField
                label="code"
                type="text"
                description="This is a code field"
                value={formData.code}
                onChange={handleChange('code')}
                variant="code"
            />

            <FormField
                label="input_params"
                type="jsonb"
                description="This is a JSON field"
                value={formData.input_params}
                onChange={handleChange('input_params')}
                variant="json"
                optional
            />

            <FormField
                label="output_options"
                type="jsonb"
                description="This is a JSON field"
                value={formData.output_options}
                onChange={handleChange('output_options')}
                variant="json"
                optional
            />

            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" className="text-muted-foreground border-border">
                    Cancel
                </Button>
                <Button className="bg-success hover:bg-success/90 text-success-foreground">
                    Save
                </Button>
            </div>
        </div>
    );
};

export default ExampleForm;
