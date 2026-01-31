import { FieldDataOptionsType } from '@/types/AutomationSchemaTypes';
import { FormFieldType } from '@/types/componentConfigTypes';

export function mapFieldDataToFormField(
    fieldDataOption: FieldDataOptionsType
): FormFieldType {
    const mapping: Record<FieldDataOptionsType, FormFieldType> = {
        string: 'text',
        number: 'number',
        boolean: 'checkbox',
        array: 'select',
        object: 'textarea',
        json: 'json',
        uuid: 'text',
        email: 'email',
        url: 'url',
        datetime: 'datetime-local',
        null: 'text',
        undefined: 'text',
        any: 'text',
        function: 'text',
        symbol: 'text',
        union: 'select',
        bigint: 'number',
        date: 'date',
        map: 'textarea',
        set: 'textarea',
        tuple: 'textarea',
        enum: 'select',
        intersection: 'textarea',
        literal: 'text',
        void: 'text',
        never: 'text',
    };

    // Default to 'text' if the type isn't explicitly mapped
    return mapping[fieldDataOption] ?? 'text';
}
