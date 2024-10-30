import React, {useState} from "react";
// import useDatabase from "@/lib/hooks/useDatabase";
import SchemaSelect from "@/components/matrx/schema/ops/SchemaSelect";
import {Button} from "@/components/ui";

const CreateOperation = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [newData, setNewData] = useState('');
    // const {create, loading, error} = useDatabase();

    const handleCreate = () => {
        if (selectedSchema) {
            try {
                const parsedData = JSON.parse(newData);
                create(selectedSchema, parsedData);
            } catch (e) {
                console.error('Invalid JSON', e);
            }
        }
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            <textarea
                className="w-full p-2 border rounded"
                placeholder="New Data (JSON format)"
                value={newData}
                onChange={(e) => setNewData(e.target.value)}
            />
            <Button onClick={handleCreate} disabled={loading || !selectedSchema}>
                Create
            </Button>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
        </div>
    );
};

export default CreateOperation;
