// components/record-display/layouts/FormLayout.tsx
import {EntityStateFieldWithValue} from "@/lib/redux/entity/types/stateTypes";
import {RecordDisplayConfig} from "@/components/matrx/Entity/field-actions/types";
import React from "react";
import {FieldDisplay} from "@/components/matrx/Entity/field-actions/components/FieldDisplay";

interface FormLayoutProps {
    fields: EntityStateFieldWithValue[];
    config: RecordDisplayConfig;
    onChange?: (fieldName: string, value: any) => void;
}

export const FormLayout: React.FC<FormLayoutProps> = ({
                                                          fields,
                                                          config,
                                                          onChange
                                                      }) => {
    const groupedFields = React.useMemo(() => {
        if (!config.groupFields) {
            return { default: fields };
        }

        const groups: Record<string, EntityStateFieldWithValue[]> = {};
        const assigned = new Set<string>();

        Object.entries(config.groupFields).forEach(([groupName, fieldNames]) => {
            groups[groupName] = fields.filter(field => fieldNames.includes(field.name));
            fieldNames.forEach(name => assigned.add(name));
        });

        groups.default = fields.filter(field => !assigned.has(field.name));

        return groups;
    }, [fields, config.groupFields]);

    const handleFieldChange = (field: EntityStateFieldWithValue) => (value: any) => {
        onChange?.(field.name, value);
    };

    return (
        <div className="space-y-6">
            {Object.entries(groupedFields).map(([groupName, groupFields]) => (
                <div key={groupName} className="space-y-4">
                    {groupName !== 'default' && (
                        <h3 className="text-lg font-medium text-foreground">{groupName}</h3>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        {groupFields.map(field => (
                            <FieldDisplay
                                key={field.name}
                                field={field}
                                customComponent={config.customComponents?.[field.name]}
                                actions={(config.actions as any)?.[field.name]}
                                onChange={handleFieldChange(field)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
