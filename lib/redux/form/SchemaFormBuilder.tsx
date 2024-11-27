// lib/forms/SchemaFormBuilder.tsx
import React from "react";

import {FlexAnimatedFormProps} from "@/types/AnimatedFormTypes";
import {useEntityForm} from "@/lib/redux/form/useEntityForm";
import {useMemo} from "react";
import {FlexAnimatedForm} from "@/components/matrx/AnimatedForm";
import {useSchema} from "@/lib/hooks/useSchema";

interface SchemaFormBuilderProps {
    schemaId: string;
    mode?: 'create' | 'update' | 'view';
    initialData?: Record<string, any>;
    onSubmit?: (data: Record<string, any>) => void;
    layout?: FlexAnimatedFormProps['layout'];
    customComponents?: Record<string, React.ComponentType<any>>;
}

const SchemaFormBuilder: React.FC<SchemaFormBuilderProps> = (
    {
        schemaId,
        mode = 'create',
        initialData,
        onSubmit,
        layout,
        customComponents
    }) => {
    const schema = useSchema(schemaId);
    const form = useEntityForm(schemaId, schema.type === 'entity' ? schema.name : undefined, {
        mode,
        initialValues: initialData,
        metadata: {
            schema,
            mode
        }
    });

    const fields = useMemo(() =>
            schema.fields.map(field => ({
                name: field.fieldName,
                label: field.presentation?.component || field.fieldName,
                type: mapSchemaTypeToFormType(field.dataType),
                section: field.presentation?.layout?.section,
                required: field.isRequired,
                validation: field.presentation?.validation?.client,
                component: field.presentation?.component,
                componentProps: field.presentation?.props,
                // ... other field mappings
            })),
        [schema]
    );

    return (
        <FlexAnimatedForm
            fields={fields}
            formState={form.values}
            onUpdateField={form.setFieldValue}
            onSubmit={form.handleSubmit}
            layout={layout || schema.presentation?.defaultLayout}
            // ... other props
        />
    );
};
