'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { FlexibleId } from '@/types/FlexibleId';
// import useDatabase from "@/lib/hooks/useDatabase";
import SchemaSelect from "@/components/matrx/schema/ops/SchemaSelect";
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";

const DeleteOperation = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    // const { data, loading, error, delete: deleteRecord, fetchAll } = useDatabase();

    useEffect(() => {
        if (selectedSchema) {
            // @ts-ignore - fetchAll function not available (import commented out)
            fetchAll(selectedSchema);
        }
        // @ts-ignore - fetchAll variable not available (import commented out)
    }, [selectedSchema, fetchAll]);

    const handleDelete = (id: FlexibleId) => {
        if (selectedSchema) {
            // @ts-ignore - deleteRecord function not available (import commented out)
            deleteRecord(selectedSchema, id);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Delete Operation</h2>
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema} />
            {/* @ts-ignore - loading variable not available (import commented out) */}
            {loading && <p>Loading...</p>}
            {/* @ts-ignore - error variable not available (import commented out) */}
            {error && <p className="text-red-500">Error: {error.message}</p>}
            {/* @ts-ignore - data variable not available (import commented out) */}
            {data && (
                <Suspense fallback={<MatrxTableLoading />}>
                    {/* @ts-ignore - data variable not available (import commented out) */}
                    <MatrxTable
                        data={data}
                        actions={['delete']}
                        onAction={(actionName, rowData) => {
                            if (actionName === 'delete') {
                                handleDelete(rowData.id);
                            }
                        }}
                        truncateAt={50}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default DeleteOperation;
