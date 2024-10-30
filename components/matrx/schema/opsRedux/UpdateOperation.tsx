import React, {useState} from "react";
// import useDatabase from "@/lib/hooks/useDatabase";
import SchemaSelect from "@/components/matrx/schema/ops/SchemaSelect";
import {Button, Input} from "@/components/ui";

const UpdateOperation = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [id, setId] = useState('');
    const [updateData, setUpdateData] = useState('');
    // const {update, loading, error} = useDatabase();

    const handleUpdate = () => {
        if (selectedSchema && id) {
            try {
                const parsedData = JSON.parse(updateData);
                update(selectedSchema, id, parsedData);
            } catch (e) {
                console.error('Invalid JSON', e);
            }
        }
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            <Input
                placeholder="ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
            />
            <textarea
                className="w-full p-2 border rounded"
                placeholder="Update Data (JSON format)"
                value={updateData}
                onChange={(e) => setUpdateData(e.target.value)}
            />
            <Button onClick={handleUpdate} disabled={loading || !selectedSchema || !id}>
                Update
            </Button>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
        </div>
    );
};

export default UpdateOperation;
