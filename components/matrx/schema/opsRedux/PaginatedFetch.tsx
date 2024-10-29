import React, { Suspense, useCallback, useEffect, useState } from "react";
import SchemaSelect from "@/components/matrx/schema/ops/SchemaSelect";
import { MatrxTableLoading } from "@/components/matrx/LoadingComponents";
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";
import { useEntity } from "@/lib/redux/entity/useEntity";
import { EntityKeys } from "@/types/entityTypes"; // Import the type for entity keys
import { useSchemaResolution } from "@/providers/SchemaProvider";

const PaginatedFetchSaga: React.FC = () => {
    const [selectedSchema, setSelectedSchema] = useState<EntityKeys | null>(null); // Ensure correct typing for entity key
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Get list of entities with their pretty names
    const { getAllEntitiesWithPrettyName } = useSchemaResolution();
    const registeredSchemas = getAllEntitiesWithPrettyName(); // Ensure this returns an array of `{ entityKey: EntityKeys, pretty: string }`

    // Initialize the useEntity hook with the selected entityKey for data fetching
    const { data, loading, error, refetch } = useEntity({
        entityKey: selectedSchema as EntityKeys | undefined, // Only pass entityKey if selected
        page,
        pageSize,
    });

    // Handle schema selection
    const handleSchemaSelect = useCallback((schemaKey: EntityKeys) => {
        setSelectedSchema(schemaKey);
        setPage(1); // Reset to the first page when schema changes
    }, []);

    // Refetch data whenever the selected schema, page, or pageSize changes
    useEffect(() => {
        if (selectedSchema) {
            refetch();
        }
    }, [selectedSchema, page, pageSize, refetch]);

    // Handle page change
    const handlePageChange = (newPage: number, newPageSize: number) => {
        setPage(newPage);
        setPageSize(newPageSize);
    };

    return (
        <div className="space-y-4">
            {/* Pass registeredSchemas to SchemaSelect for selection */}
            <SchemaSelect
                onSchemaSelect={handleSchemaSelect}
                selectedSchema={selectedSchema}
                schemas={registeredSchemas.map(({ entityKey, pretty }) => ({
                    value: entityKey,
                    label: pretty,
                }))}
            />
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {data && (
                <Suspense fallback={<MatrxTableLoading />}>
                    <MatrxTable
                        data={data}
                        actions={['view']}
                        onAction={(actionName, rowData) => console.log(actionName, rowData)}
                        truncateAt={50}
                        customModalContent={(rowData) => (
                            <pre>{JSON.stringify(rowData, null, 2)}</pre>
                        )}
                        onPageChange={handlePageChange}
                        currentPage={page}
                        pageSize={pageSize}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default PaginatedFetchSaga;
