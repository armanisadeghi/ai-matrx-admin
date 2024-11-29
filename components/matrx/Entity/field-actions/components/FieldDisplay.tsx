// components/record-display/FieldDisplay.tsx
import {EntityStateFieldWithValue} from "@/lib/redux/entity/types/stateTypes";
import {ActionConfig} from "@/components/matrx/Entity/field-actions/types";
import React from "react";
import {FieldAction} from "./FieldAction";
import {Label} from '@/components/ui/label';
import {FormattedFieldValue} from "./FormattedFieldValue";

interface FieldDisplayProps {
    field: EntityStateFieldWithValue;
    customComponent?: React.ComponentType<{ field: EntityStateFieldWithValue }>;
    actions?: Record<string, ActionConfig>;
    onChange?: (value: any) => void;
}

export const FieldDisplay: React.FC<FieldDisplayProps> = (
    {
        field,
        customComponent: CustomComponent,
        actions,
        onChange
    }) => {
    if (CustomComponent) {
        return <CustomComponent field={field}/>;
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">
                    {field.displayName}
                </Label>
                {actions && (
                    <div className="flex gap-2">
                        {Object.entries(actions).map(([key, action]) => (
                            <FieldAction
                                key={key}
                                action={action}
                                field={{
                                    id: field.name,
                                    label: field.displayName,
                                    type: field.dataType,
                                }}
                                value={field.value}
                                onChange={(e) => onChange?.(e.target.value)}
                            />
                        ))}
                    </div>
                )}
            </div>
            <FormattedFieldValue
                value={field.value}
                type={field.dataType}
                componentProps={field.componentProps}
            />
        </div>
    );
};
