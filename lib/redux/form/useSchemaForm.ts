// lib/hooks/useSchemaForm.ts

import {useEntity} from "@/lib/redux/entity/hooks/useEntity";
import { useEntityFormOld as useEntityForm } from "./useEntityForm";

export const useSchemaForm = (
    schemaId: string,
    options?: {
        mode?: 'create' | 'update' | 'view';
        initialData?: Record<string, any>;
        validation?: boolean;
        transformation?: boolean;
        tracking?: boolean;
    }
) => {
    const schema = useSchema(schemaId);
    const entity = schema.entityType === 'entity' ? useEntity(schema.name) : null;
    const form = useEntityForm(schemaId, schema.type === 'entity' ? schema.name : undefined, {
        mode: options?.mode,
        initialValues: options?.initialData,
        validation: (values) => validateAgainstSchema(values, schema),
    });

    // Combine entity and form capabilities
    return {
        ...form,
        schema,
        entity,
        // Enhanced capabilities
        validate: async () => {
            const clientValidation = await form.validateFields();
            if (schema.type === 'entity' && entity) {
                const serverValidation = await entity.validate(form.values);
                return clientValidation && serverValidation;
            }
            return clientValidation;
        },
        transform: (direction: 'toStorage' | 'toDisplay') =>
            transformData(form.values, schema, direction),
        track: (action: string, data: any) =>
            trackSchemaAction(schema, action, data),
        // Additional utilities
        getFieldComponent: (fieldName: string) =>
            resolveFieldComponent(schema, fieldName),
        getFieldValidation: (fieldName: string) =>
            resolveFieldValidation(schema, fieldName),
        getFieldTransformation: (fieldName: string) =>
            resolveFieldTransformation(schema, fieldName),
    };
};
