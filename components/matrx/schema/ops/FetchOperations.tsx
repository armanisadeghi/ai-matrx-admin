'use client';

import React, { Suspense, useState } from "react";
import { useEntity } from "@/lib/redux/entity/useEntity";
import { Button, Input } from "@/components/ui";
import { MatrxTableLoading } from "@/components/matrx/LoadingComponents";
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";
import { EntityKeys } from '@/types/entityTypes';
import PreWiredEntitySelectName from "@/app/(authenticated)/admin/components/entities/PreWiredEntitySelectName";

// A default/fallback entity key, assuming one exists in EntityKeys
const DEFAULT_ENTITY: EntityKeys = 'systemFunction'; // Replace with an appropriate default entity key

const FetchOperations = () => {
    const [selectedSchema, setSelectedSchema] = useState<EntityKeys>(DEFAULT_ENTITY);
    const [primaryKeyValues, setPrimaryKeyValues] = useState<Record<string, string>>({});

    // Initialize useEntity with a default entity and then update as needed
    const entity = useEntity(selectedSchema);

    const handlePrimaryKeyChange = (field: string, value: string) => {
        setPrimaryKeyValues((prev) => ({ ...prev, [field]: value }));
    };

    const handleFetchOne = () => {
        if (entity && entity.entityMetadata.primaryKeyMetadata.fields.length > 0) {
            entity.fetchOne(primaryKeyValues);
        }
    };

    const handleFetchAll = () => {
        if (entity) {
            entity.fetchAll();
        }
    };

    return (
        <div className="space-y-4">
            {/* Schema Selection */}
            <PreWiredEntitySelectName
                selectedEntity={selectedSchema}
                onValueChange={(schema) => setSelectedSchema(schema)}
            />

            {/* Primary Key Inputs */}
            {entity && entity.entityMetadata.primaryKeyMetadata.fields.map((field) => (
                <Input
                    key={field}
                    placeholder={`Primary Key: ${field}`}
                    value={primaryKeyValues[field] || ''}
                    onChange={(e) => handlePrimaryKeyChange(field, e.target.value)}
                />
            ))}

            <div className="space-x-2">
                {/* Buttons for Fetch Operations */}
                <Button onClick={handleFetchOne} disabled={!selectedSchema || !Object.keys(primaryKeyValues).length}>Fetch One</Button>
                <Button onClick={handleFetchAll} disabled={!selectedSchema}>Fetch All</Button>

                {/* Related Data Placeholder Buttons */}
                {/*<Button onClick={handleFetchFk} disabled={!selectedSchema || !Object.keys(primaryKeyValues).length}>Fetch FK</Button>*/}
                {/*<Button onClick={handleFetchIfk} disabled={!selectedSchema || !Object.keys(primaryKeyValues).length}>Fetch IFK</Button>*/}
                {/*<Button onClick={handleFetchM2M} disabled={!selectedSchema || !Object.keys(primaryKeyValues).length}>Fetch M2M</Button>*/}
            </div>

            {/* Loading/Error States */}
            {entity?.loadingState.loading && <p>Loading...</p>}
            {entity?.error && <p className="text-red-500">Error: {entity.error.message}</p>}

            {/* Data Display */}
            {entity?.currentPage && (
                <Suspense fallback={<MatrxTableLoading />}>
                    <MatrxTable
                        data={entity.currentPage}
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
