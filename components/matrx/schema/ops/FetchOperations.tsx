import React, {Suspense, useState} from "react";
import useDatabase from "@/lib/hooks/useDatabase";
import SchemaSelect from "@/components/matrx/schema/ops/SchemaSelect";
import {Button, Input} from "@/components/ui";
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";

const FetchOperations = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [id, setId] = useState('');
    const {data, loading, error, fetchOne, fetchAll} = useDatabase();

    const handleFetchOne = () => {
        if (selectedSchema && id) {
            fetchOne(selectedSchema, id);
        }
    };

    const handleFetchAll = () => {
        if (selectedSchema) {
            fetchAll(selectedSchema);
        }
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            <Input
                placeholder="ID (for fetchOne)"
                value={id}
                onChange={(e) => setId(e.target.value)}
            />
            <div className="space-x-2">
                <Button onClick={handleFetchOne} disabled={!selectedSchema || !id}>Fetch One</Button>
                <Button onClick={handleFetchAll} disabled={!selectedSchema}>Fetch All</Button>
            </div>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
            {data && (
                <Suspense fallback={<MatrxTableLoading/>}>
                    <MatrxTable
                        data={data}
                        actions={['view']}
                        onAction={(actionName, rowData) => console.log(actionName, rowData)}
                        truncateAt={50}
                        customModalContent={(rowData) => (
                            <pre>{JSON.stringify(rowData, null, 2)}</pre>
                        )}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default FetchOperations;
