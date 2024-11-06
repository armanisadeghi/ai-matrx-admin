// app/admin/components/entity-browser/EntityBrowser.tsx
'use client';

import {useState, useEffect, Suspense} from 'react';
import {useEntity} from '@/lib/redux/entity/useEntity';
import {EntityKeys} from '@/types/entityTypes';
import {useAppSelector} from "@/lib/redux/hooks";
import {selectFormattedEntityOptions} from "@/lib/redux/schema/globalCacheSelectors";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Loader2} from "lucide-react";
import MatrxTable from '@/app/(authenticated)/tests/matrx-table/components/MatrxTable';

// Separate loading component for better organization
const TableLoadingState = () => (
    <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin"/>
        <span className="ml-2">Loading data...</span>
    </div>
);

// The actual table component that receives entity data
const EntityTableContainer = ({ entityKey }: { entityKey: EntityKeys }) => {
    const entity = useEntity(entityKey);

    const handlePageChange = (pageIndex: number, pageSize: number) => {
        entity.fetchRecords(pageIndex + 1, pageSize);
    };

    useEffect(() => {
        if (entity.entityMetadata) {
            entity.fetchRecords(1, 10);
        }
    }, [entity.entityMetadata]);

    if (!entity.entityMetadata) {
        return <TableLoadingState />;
    }

    const tableData = entity.currentPage.map(record => ({
        ...record,
        id: record[entity.primaryKeyMetadata.fields[0]]
    }));

    const visibleColumns = entity.entityMetadata.fields.map(field => field.name);

    return (
        <MatrxTable
            data={tableData}
            defaultVisibleColumns={visibleColumns}
            loading={entity.loadingState.loading}
            totalCount={entity.paginationInfo.totalCount}
            onPageChange={handlePageChange}
            className="w-full"
        />
    );
};

const EntityBrowser = () => {
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);

    const selectedEntityLabel = selectedEntity
        ? entitySelectOptions.find(option => option.value === selectedEntity)?.label
        : "Entity Browser";



    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>{selectedEntityLabel}</span>
                    <Select
                        value={selectedEntity || ''}
                        onValueChange={(value) => setSelectedEntity(value as EntityKeys)}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Entity" />
                        </SelectTrigger>
                        <SelectContent>
                            {entitySelectOptions.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardTitle>
                <CardDescription>
                    Browse and manage entity data
                </CardDescription>
            </CardHeader>

            <CardContent>
                <Suspense fallback={<TableLoadingState />}>
                    {selectedEntity ? (
                        <EntityTableContainer entityKey={selectedEntity} />
                    ) : (
                         <div className="text-center py-8 text-muted-foreground">
                             Select an entity to view its data
                         </div>
                     )}
                </Suspense>
            </CardContent>
        </Card>
    );
};

export default EntityBrowser;

