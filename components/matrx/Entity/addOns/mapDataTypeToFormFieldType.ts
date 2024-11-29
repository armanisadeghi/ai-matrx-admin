// export type FieldDataOptionsType =
//     | 'string'
//     | 'number'
//     | 'boolean'
//     | 'array'
//     | 'object'
//     | 'json'
//     | 'null'
//     | 'undefined'
//     | 'any'
//     | 'function'
//     | 'symbol'
//     | 'union'
//     | 'bigint'
//     | 'date'
//     | 'map'
//     | 'set'
//     | 'tuple'
//     | 'enum'
//     | 'intersection'
//     | 'literal'
//     | 'void'
//     | 'never';
//
// export type FormFieldType =
//     'text'
//     | 'email'
//     | 'number'
//     | 'select'
//     | 'textarea'
//     | 'checkbox'
//     | 'radio'
//     | 'password'
//     | 'date'
//     | 'time'
//     | 'datetime-local'
//     | 'month'
//     | 'week'
//     | 'tel'
//     | 'url'
//     | 'color'
//     | 'slider'
//     | 'switch'
//     | 'json'
//     | 'file'
//     | 'image'
//     | 'rating';

import {FieldDataOptionsType} from "@/types/AutomationSchemaTypes";
import {FormFieldType} from "@/components/matrx/AnimatedForm/FlexAnimatedForm";
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import {EntityFlexFormField} from "@/components/matrx/Entity/types/entityForm";


export function transformFieldsToFormFields(entityFields: EntityStateField[]): EntityFlexFormField[] {
    if (!entityFields) return [];

    // Helper function to handle additional transformation logic
    const applyFieldLogic = (field: EntityFlexFormField, originalField: EntityStateField): EntityFlexFormField => {
        if (originalField.defaultComponent === 'inline-form:1') {
            field.defaultComponent = 'input';
            field.actionKeys = ['entityQuickSidebar'];
            field.inlineFields = []; // TODO: Need to get the schema from the related table here.
        }
        return field;
    };

    return entityFields.map(field => {
        // Map the base transformation
        const transformedField: EntityFlexFormField = {
            name: field.name,
            label: field.displayName || field.name,
            type: mapFieldDataTypeToFormFieldType(field.dataType) as FormFieldType,
            required: field.isRequired,
            disabled: false,
            defaultValue: field.defaultValue,
            validationFunctions: field.validationFunctions,
            maxLength: field.maxLength,
            subComponent: null,
            actionKeys: [],
            actionProps: {},
        };

        // Apply additional field logic
        return applyFieldLogic(transformedField, field);
    });
}

/**
 * Maps a FieldDataOptionsType to a FormFieldType.
 * Logs the type if no match is found and defaults to 'text'.
 */
export function mapFieldDataTypeToFormFieldType(dataType: FieldDataOptionsType): FormFieldType {
    const typeMapping: Record<FieldDataOptionsType, FormFieldType> = {
        string: 'text',
        number: 'number',
        boolean: 'checkbox',
        array: 'select', // Could be dropdowns, assuming 'select' for now
        object: 'json',   // Treating objects as JSON
        json: 'json',
        uuid: 'text',     // UUIDs typically represented as text
        email: 'email',   // Dedicated 'email' field type
        url: 'url',       // Dedicated 'url' field type
        datetime: 'datetime-local', // HTML5 datetime-local input
        null: 'text',     // Defaulting to 'text'
        undefined: 'text', // Defaulting to 'text'
        any: 'text',      // Defaulting to 'text'
        function: 'text', // Defaulting to 'text' as a fallback
        symbol: 'text',   // Defaulting to 'text'
        union: 'text',    // Defaulting to 'text'
        bigint: 'number', // Mapping bigints to number
        date: 'date',     // Dedicated 'date' field type
        map: 'json',      // Maps can be represented as JSON
        set: 'json',      // Sets can be represented as JSON
        tuple: 'text',    // Defaulting to 'text'
        enum: 'select',   // Assuming enums can be dropdowns
        intersection: 'text', // Defaulting to 'text'
        literal: 'text',  // Defaulting to 'text'
        void: 'text',     // Defaulting to 'text'
        never: 'text',    // Defaulting to 'text'
    };

    // Return the mapped value or default to 'text' if the dataType is not explicitly mapped}

    const formFieldType = typeMapping[dataType];

    if (!formFieldType) {
        console.log(`Unmapped data type: ${dataType}, defaulting to 'text'.`);
        return 'text';
    }

    console.log(`Mapping data type '${dataType}' to form field type '${formFieldType}'.`);
    return formFieldType;
}
