// File Location: features/registered-function/components/FunctionManagement.tsx

'use client';

import React, { useEffect } from 'react';
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
        update,
        create,
    } = useRegisteredFunction();

    useEffect(() => {
        fetchPaginated({ featureName: 'registeredFunction', page: 1, pageSize: 10 });
    }, [fetchPaginated]);

    const handleItemSelect = (id: string) => {
        fetchOne({ featureName: 'registeredFunction', id });
    };

    const handleSearch = (query: string, searchAll: boolean) => {
        if (searchAll) {
            console.log('Searching all with query:', query);
            // Placeholder: implement the search logic that queries all records
        } else {
            console.log('Search specific fields with query:', query);
            // Placeholder: implement the search logic that queries specific fields
        }
    };

    const handleSubmit = (data: RegisteredFunctionBase) => {
        if (data.id) {
            update({ featureName: 'registeredFunction', payload: data });
        } else {
            create({ featureName: 'registeredFunction', payload: data });
        }
        fetchPaginated({ featureName: 'registeredFunction', page: 1, pageSize: 10 });
    };

    const handleDelete = (id: string) => {
        deleteOne({ featureName: 'registeredFunction', id });
        fetchPaginated({ featureName: 'registeredFunction', page: 1, pageSize: 10 });
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
            items={Object.values(items)}
            fields={fields}
            getItemId={(item) => item.id}
            getItemName={(item) => item.name}
            onItemSelect={handleItemSelect}
            onSearch={handleSearch}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            loading={loading}
            error={error}
            title="Function Management"
        />
    );
};

export default FunctionManagement;
