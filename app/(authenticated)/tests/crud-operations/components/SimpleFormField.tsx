import React from 'react';
import { Input } from '@/components/ui/input';
import { FieldTooltip } from './helperComponents';

interface SimpleFormFieldFieldProps {
    field: {
        name: string;
        displayName: string;
        description?: string;
        isRequired?: boolean;
        isPrimaryKey?: boolean;
        defaultValue?: string;
        maxLength?: number;
    };
    value: any;
    isReadOnly: boolean;
    onChange: (value: string) => void;
    error?: string;
}

export const SimpleFormField = ({ field, value, isReadOnly, onChange, error }: SimpleFormFieldFieldProps) => (
    <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
            <div className="w-1/4 flex items-center gap-2">
                <span className="text-md font-medium truncate">
                    {field.displayName}
                    {field.isRequired && <span className="text-destructive ml-1">*</span>}
                </span>
                {field.description && <FieldTooltip description={field.description} />}
            </div>
            <div className="flex-1">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={isReadOnly}
                    placeholder={field.defaultValue || ''}
                    maxLength={field.maxLength}
                    className="w-full"
                />
                {error && <span className="text-destructive text-sm mt-1">{error}</span>}
            </div>
        </div>
    </div>
);
