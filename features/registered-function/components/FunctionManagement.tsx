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
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const tableList = ['arg'];

    useEffect(() => {
        fetchPaginated({ featureName: 'registeredFunction', page: currentPage, pageSize: itemsPerPage });
    }, [fetchPaginated, currentPage, itemsPerPage]);

    const handleItemSelect = (id: string) => {
        setSelectedItemId(id);
        setIsEditing(false); // TODO: Fix this because this just turns off editing mode, instead of stopping the update to inform that they will lose their changes. We need to compare the current data with the form data first and take appropriate action.
        fetchOne({ featureName: 'registeredFunction', id , tableList});
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
        setIsEditing(false); // End editing mode after submission
        fetchPaginated({ featureName: 'registeredFunction', page: currentPage, pageSize: itemsPerPage });
    };

    const handleDelete = (id: string) => {
        deleteOne({ featureName: 'registeredFunction', id });
        setSelectedItemId(null); // Clear the selected item.tsx after deletion
        setIsDeleteDialogOpen(false); // Close the delete dialog
        fetchPaginated({ featureName: 'registeredFunction', page: currentPage, pageSize: itemsPerPage });
    };

    const handleDeleteMany = (ids: string[]) => {
        deleteMany({ featureName: 'registeredFunction', ids });
        setSelectedItemId(null); // Clear the selected items after deletion
        setIsDeleteDialogOpen(false); // Close the delete dialog
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
            items={Object.values(items).map(item => ({
                ...item,
                type: item.type || RegisteredFunctionTypeEnum.Base
            }))}
            fields={fields}
            getItemId={(item) => item.id}
            getItemName={(item) => item.name}
            selectedItemId={selectedItemId}
            isEditing={isEditing}
            isDeleteDialogOpen={isDeleteDialogOpen}
            setIsEditing={setIsEditing}
            setSelectedItemId={setSelectedItemId}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
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
