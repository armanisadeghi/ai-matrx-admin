// @ts-nocheck
'use client';

import React, { useState } from 'react';
// import useDatabase from '@/lib/hooks/useDatabase';
import SchemaSelect from './SchemaSelect';
import { SchemaBasedJsonEditor } from '@/components/ui/JsonComponents';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { Input } from "@/components/ui";

const CreateOperationJson: React.FC = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [jsonData, setJsonData] = useState<Record<string, any>>({});
    // const { create, loading, error } = useDatabase();
    const [showUuidPopup, setShowUuidPopup] = useState<boolean>(false);
    const [generatedUuid, setGeneratedUuid] = useState<string>('');

    const handleJsonChange = (newData: object) => {
        setJsonData(newData);
    };

    const handleCreate = () => {
        if (selectedSchema) {
            create(selectedSchema, jsonData);
        }
    };

    const handleGenerateUuid = () => {
        const uuid = uuidv4();
        if (jsonData && jsonData.hasOwnProperty('id')) {
            const updatedData = { ...jsonData, id: uuid };
            setJsonData(updatedData);
        } else {
            setGeneratedUuid(uuid);
            setShowUuidPopup(true);
        }
    };

    const handleClosePopup = () => {
        setShowUuidPopup(false);
        setGeneratedUuid('');
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={(schema) => {
                setSelectedSchema(schema);
            }} selectedSchema={selectedSchema} />
            {selectedSchema && (
                <>
                    <SchemaBasedJsonEditor
                        tableName={selectedSchema}
                        data={jsonData} // Pass jsonData as the controlled prop
                        allowKeyEditing={true}
                        onChange={handleJsonChange}
                    />
                    <Button
                        onClick={handleCreate}
                        disabled={loading}
                        className="mt-4"
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </Button>
                    <Button
                        onClick={handleGenerateUuid}
                        className="mt-4 ml-2"
                    >
                        Get Random UUID
                    </Button>
                </>
            )}
            {error && <p className="text-destructive mt-2">{error.message}</p>}
            {showUuidPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-background bg-opacity-50">
                    <div className="bg-card p-4 rounded shadow-lg">
                        <p>No 'id' field found in the JSON.</p>
                        <p>Generated UUID:</p>
                        <Input
                            type="text"
                            value={generatedUuid}
                            readOnly
                            className="border p-2 w-full mt-2"
                        />
                        <div className="flex justify-end mt-4">
                            <Button onClick={handleClosePopup}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateOperationJson;
