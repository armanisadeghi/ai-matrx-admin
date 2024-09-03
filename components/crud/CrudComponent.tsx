import React from 'react';
import {z} from 'zod';
import GenericManagement from "@/components/crud/GenericManagement";
import {AdjustableSidebar} from "@/components/crud/AdjustableSidebar";
import {GenericForm} from "@/components/crud/GenericForm";

interface CrudComponentProps<T extends z.ZodType<any, any>> {
    schema: T;
    items: z.infer<T>[];
    fields: Record<string, {
        type: 'text' | 'textarea' | 'select';
        label: string;
        options?: { value: string; label: string }[]
    }>;
    getItemId: (item: z.infer<T>) => string;
    getItemName: (item: z.infer<T>) => string;
    onItemSelect: (id: string) => void;
    onSearch: (query: string, searchAll: boolean) => void;
    onSubmit: (data: z.infer<T>) => void;
    onDelete: (id: string) => void;
    loading: boolean;
    error: string | null;
    title: string;
}

export function CrudComponent<T extends z.ZodType<any, any>>(
    {
        schema,
        items,
        fields,
        getItemId,
        getItemName,
        onItemSelect,
        onSearch,
        onSubmit,
        onDelete,
        loading,
        error,
        title
    }: CrudComponentProps<T>) {
    return (
        <GenericManagement
            items={items}
            schema={schema}
            fields={fields}
            getItemId={getItemId}
            getItemName={getItemName}
            onItemSelect={onItemSelect}
            onSearch={onSearch}
            onSubmit={onSubmit}
            onDelete={onDelete}
            loading={loading}
            error={error}
            title={title}
            SidebarComponent={AdjustableSidebar}
            FormComponent={GenericForm}
        />
    );
}
