// SchemaSelect.tsx
import React from 'react';
import { useSchema } from '@/lib/hooks/useSchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SchemaSelectProps {
    onSchemaSelect: (schemaName: string) => void;
    selectedSchema: string | null;
}

const SchemaSelect: React.FC<SchemaSelectProps> = ({ onSchemaSelect, selectedSchema }) => {
    const { registeredSchemas } = useSchema();

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium">Select Table/View</label>
            <Select onValueChange={onSchemaSelect} value={selectedSchema || undefined}>
                <SelectTrigger className="w-full bg-input">
                    <SelectValue placeholder="Select a table/view" />
                </SelectTrigger>
                <SelectContent>
                    {registeredSchemas.map((schemaName) => (
                        <SelectItem key={schemaName} value={schemaName}>
                            {schemaName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default SchemaSelect;
