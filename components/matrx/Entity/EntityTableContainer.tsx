// components/matrx/SchemaTable/EntityTableContainer.tsx
'use client';

import {EntityKeys} from "@/types/entityTypes";
import {useEntity} from "@/lib/redux/entity/useEntity";
import {useEffect} from "react";
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import MatrxTable from "@/components/matrx/Entity/table/MatrxTable";

const EntityTableContainer = ({entityKey}: { entityKey: EntityKeys }) => {
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
        return <MatrxTableLoading/>;
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

export default EntityTableContainer;
