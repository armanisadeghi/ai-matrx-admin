"use client";

import React from "react";
import { useRouter } from "next/navigation";
import FieldListTable from "@/features/applet/builder/modules/field-builder/table/FieldListTable";

export default function FieldsListPage() {
    const router = useRouter();
    
    const handleViewField = (id: string) => {
        router.push(`/apps/app-builder/fields/${id}`);
    };

    const handleEditField = (id: string) => {
        router.push(`/apps/app-builder/fields/${id}/edit`);
    };
    
    const handleCreateField = () => {
        router.push(`/apps/app-builder/fields/create`);
    };
    
    const handleDeleteField = (id: string) => {
        // In this parent component, we're redirecting back to the list
        // after deletion through the Redux thunk's handling
        router.refresh();
    };

    return (
        <>
            <FieldListTable 
                onFieldView={handleViewField} 
                onFieldEdit={handleEditField}
                onFieldCreate={handleCreateField}
                onFieldDelete={handleDeleteField}
            />
        </>
    );
}
