import { EntityKeys } from "@/types";
import { AllEntityFieldOverrides, FieldOverrideName, ProcessedField } from "./overrideTypes";
import { getFieldOverride } from "./entityFieldOverrides";


// Updated interface to include fieldName parameter
export interface CalculatedFieldDefinition {
    key: string;
    defaultValue: any;
    calculate?: (field: Partial<ProcessedField>, fieldName: string) => any;
}

// Registry of calculated fields with correct typing
export const calculatedFields: CalculatedFieldDefinition[] = [
    {
        key: 'name',
        defaultValue: null,
        calculate: (_field: ProcessedField, fieldName: string) => fieldName
    },
    {
        key: 'displayName',
        defaultValue: null,
        calculate: (field: ProcessedField) => field.fieldNameFormats.pretty
    }
];

export function applyCalculatedFields(
    processedField: Partial<ProcessedField>,
    entityName: EntityKeys,
    fieldName: string,
    fieldOverrides: AllEntityFieldOverrides
): Partial<ProcessedField> {
    const enhanced = { ...processedField };

    calculatedFields.forEach(({ key, calculate }) => {
        const override = getFieldOverride(entityName, fieldName, key as FieldOverrideName, fieldOverrides);
        
        if (override !== null && override !== undefined) {
            enhanced[key] = override;
        } else if (calculate) {
            enhanced[key] = calculate(processedField, fieldName);
        }
    });

    return enhanced as ProcessedField
}

export type EnhancedProcessedField = ProcessedField;

// Helper to register new calculated fields
export function registerCalculatedField(definition: CalculatedFieldDefinition): void {
    const existing = calculatedFields.findIndex(def => def.key === definition.key);
    if (existing >= 0) {
        calculatedFields[existing] = definition;
    } else {
        calculatedFields.push(definition);
    }
}