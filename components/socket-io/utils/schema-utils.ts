// File Location: components/socket-io/utils/schema-utils.ts


import { SOCKET_TASKS } from "@/constants/socket-schema";

export interface SchemaField {
    REQUIRED: boolean;
    DEFAULT: any;
    VALIDATION: string | null;
    DATA_TYPE: string | null;
    CONVERSION: string | null;
    REFERENCE: any;
    ICON_NAME?: string;
    COMPONENT?: string;
    COMPONENT_PROPS?: Record<string, any>;
    DESCRIPTION?: string;
    TEST_VALUE?: any;
}

export interface Schema {
    [key: string]: SchemaField;
}



export const getTaskSchema = (taskName: string): Schema | undefined => {
    return SOCKET_TASKS[taskName];
};

export const initializeTaskDataWithDefaults = (taskName: string): Record<string, any> => {
    const taskSchema = getTaskSchema(taskName);
    if (!taskSchema) {
        return {};
    }

    const taskData: Record<string, any> = {};

    Object.entries(taskSchema).forEach(([fieldName, fieldSpec]) => {
        if (fieldSpec.DEFAULT !== undefined) {
            taskData[fieldName] = fieldSpec.DEFAULT;
        }
    });

    return taskData;
};

export const validateTaskData = (taskName: string, taskData: Record<string, any>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const schema = getTaskSchema(taskName);

    if (!schema) {
        return { isValid: false, errors: [`No schema found for task '${taskName}'`] };
    }

    Object.entries(schema).forEach(([fieldName, fieldSpec]) => {
        const providedValue = taskData[fieldName];
        const isProvided = providedValue !== undefined && providedValue !== null;

        if (fieldSpec.REQUIRED && !isProvided) {
            errors.push(`Field '${fieldName}' is required but was not provided.`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

export const getFieldDefinition = (taskName: string, fieldPath: string, traverseNested: boolean = true): SchemaField | undefined => {
    const taskSchema = getTaskSchema(taskName);
    if (!taskSchema) {
        return undefined;
    }

    // Split the field path into parts (e.g., "broker_values.name" -> ["broker_values", "name"])
    const pathParts = fieldPath.split(".");

    // If not traversing nested fields, return the root field directly
    if (!traverseNested || pathParts.length === 1) {
        return taskSchema[pathParts[0]];
    }

    // Traverse the path for nested fields
    let currentSchema: Schema = taskSchema;
    let currentField: SchemaField | undefined;

    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentField = currentSchema[part];
        if (!currentField) {
            return undefined; // Field not found
        }

        // If there's a REFERENCE and more parts to process, switch to the referenced schema
        if (currentField.REFERENCE && i < pathParts.length - 1) {
            if (!currentField.REFERENCE || typeof currentField.REFERENCE !== "object") {
                return undefined; // Invalid REFERENCE
            }
            currentSchema = currentField.REFERENCE as Schema;
        }
    }

    return currentField;
};

export interface FieldPathInfo {
    fieldPath: string;
    definition: SchemaField;
}

export const getAllFieldPaths = (taskName: string): FieldPathInfo[] => {
    const taskSchema = getTaskSchema(taskName);
    if (!taskSchema) {
        return [];
    }

    const fieldPaths: FieldPathInfo[] = [];

    const traverseSchema = (schema: Schema, prefix: string = "") => {
        Object.entries(schema).forEach(([fieldName, fieldSpec]) => {
            const currentPath = prefix ? `${prefix}.${fieldName}` : fieldName;

            fieldPaths.push({
                fieldPath: currentPath,
                definition: fieldSpec,
            });

            if (fieldSpec.REFERENCE && typeof fieldSpec.REFERENCE === "object") {
                traverseSchema(fieldSpec.REFERENCE as Schema, currentPath);
            }
        });
    };

    traverseSchema(taskSchema);
    return fieldPaths;
};