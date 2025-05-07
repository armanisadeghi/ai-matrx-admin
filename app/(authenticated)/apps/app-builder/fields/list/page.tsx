"use client";

import React from "react";
import { useRouter } from "next/navigation";
import FieldListTable from "@/features/applet/builder/modules/field-builder/FieldListTable";

export default function FieldsListPage() {
    const router = useRouter();
    const handleViewField = (id: string) => {
        router.push(`/apps/app-builder/fields/${id}`);
    };

    const handleEditField = (id: string) => {
        router.push(`/apps/app-builder/fields/${id}/edit`);
    };

    return (
        <>
            <FieldListTable onFieldView={handleViewField} onFieldEdit={handleEditField} />
        </>
    );
}
