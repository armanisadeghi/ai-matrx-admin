// components/matrx/schema/ops/SchemaSelect.tsx
import React from 'react';
import { useSchema } from '@/lib/redux/schema/useSchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {EntityKeys, EntitySelectOption} from '@/types/entityTypes';

interface SchemaSelectProps {
    onSchemaSelect: (schemaName: EntityKeys) => void;
    selectedSchema: string | null;
}

const SchemaSelect: React.FC<SchemaSelectProps> = ({ onSchemaSelect, selectedSchema }) => {
    const { entityNameAndPrettyName } = useSchema();

    const schemaOptions: EntitySelectOption<any>[] = entityNameAndPrettyName.map(({ value, label }) => ({
        value,
        label,
    }));

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium">Select Table/View</label>
            <Select onValueChange={onSchemaSelect} value={selectedSchema || undefined}>
                <SelectTrigger className="w-full bg-input">
                    <SelectValue placeholder="Select a table/view" />
                </SelectTrigger>
                <SelectContent>
                    {schemaOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default SchemaSelect;
