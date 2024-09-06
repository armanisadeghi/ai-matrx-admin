'use client';

import React, { useEffect, useState } from 'react';
import { CrudComponent } from '@/components/crud/CrudComponent';
import {
    RegisteredFunctionBase,
    RegisteredFunctionTypeEnum,
    RegisteredFunctionUnionSchema
} from '@/types/registeredFunctionTypes';
import { useRegisteredFunction } from '../hooks/useRegisteredFunction';

const FunctionManagement: React.FC = () => {
    const {
        items,
        allIdAndNames,
        totalCount,
        loading,
        error,
        fetchOne,
        fetchPaginated,
        deleteOne,
        deleteMany,
        update,
        create,
    } = useRegisteredFunction();

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        fetchPaginated({ featureName: 'registeredFunction', page: currentPage, pageSize: itemsPerPage });
    }, [fetchPaginated, currentPage, itemsPerPage]);

    const handleItemSelect = (id: string) => {
        fetchOne({ featureName: 'registeredFunction', id });
    };

    const handleSearch = (query: string, searchAll: boolean) => {
        // Implement search logic here
    };

    const handleSubmit = (data: RegisteredFunctionBase) => {
        if (data.id) {
            update({ featureName: 'registeredFunction', payload: data });
        } else {
            create({ featureName: 'registeredFunction', payload: data });
        }
        fetchPaginated({ featureName: 'registeredFunction', page: currentPage, pageSize: itemsPerPage });
    };

    const handleDelete = (id: string) => {
        deleteOne({ featureName: 'registeredFunction', id });
        fetchPaginated({ featureName: 'registeredFunction', page: currentPage, pageSize: itemsPerPage });
    };

    const handleDeleteMany = (ids: string[]) => {
        deleteMany({ featureName: 'registeredFunction', ids });
        fetchPaginated({ featureName: 'registeredFunction', page: currentPage, pageSize: itemsPerPage });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (pageSize: number) => {
        setItemsPerPage(pageSize);
    };

    const fields = {
        name: { type: 'text' as const, label: 'Name' },
        modulePath: { type: 'text' as const, label: 'Module Path' },
        className: { type: 'text' as const, label: 'Class Name' },
        description: { type: 'textarea' as const, label: 'Description' },
        returnBroker: { type: 'text' as const, label: 'Return Broker' },
        args: { type: 'text' as const, label: 'Arguments' },
        systemFunction: { type: 'text' as const, label: 'System Function' },
        recipeFunctions: { type: 'text' as const, label: 'Recipe Functions' },
        type: {
            type: 'select' as const,
            label: 'Type',
            options: Object.entries(RegisteredFunctionTypeEnum).map(([key, value]) => ({ value, label: key })),
        },
    };

    return (
        <CrudComponent
            schema={RegisteredFunctionUnionSchema}
            allIdAndNames={allIdAndNames}
            items={Object.values(items)}
            fields={fields}
            getItemId={(item) => item.id}
            getItemName={(item) => item.name}
            onItemSelect={handleItemSelect}
            onSearch={handleSearch}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            onDeleteMany={handleDeleteMany}
            loading={loading}
            error={error}
            totalCount={totalCount}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
        />
    );
};

export default FunctionManagement;
