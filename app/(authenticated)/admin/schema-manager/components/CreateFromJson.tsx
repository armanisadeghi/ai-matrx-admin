// components/ui/json/CreateOperation.tsx

'use client';

import React, { useState } from 'react';
import useDatabase from '@/lib/hooks/useDatabase';
import { useSchema } from '@/lib/hooks/useSchema';
import SchemaSelect from './SchemaSelect';
import { SchemaJsonEditor } from '@/components/ui/json';

const CreateOperation: React.FC = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const { create, loading, error } = useDatabase();
    const { getTableSchema } = useSchema();

    const handleCreate = (jsonData: string) => {
        if (selectedSchema) {
            try {
                const parsedData = JSON.parse(jsonData);
                create(selectedSchema, parsedData);
            } catch (e) {
                console.error('Invalid JSON', e);
            }
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Create Operation</h2>
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema} />
            {selectedSchema && (
                <SchemaJsonEditor
                    tableName={selectedSchema}
                    onSave={handleCreate}
                    title={`Create New ${selectedSchema} Record`}
                    className="mt-4"
                />
            )}
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
        </div>
    );
};

export default CreateOperation;
