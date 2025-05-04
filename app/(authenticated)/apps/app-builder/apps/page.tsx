"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { SmartAppList } from "@/features/applet/builder/components/smart-parts";
import { CustomAppConfig } from "@/features/applet/builder/builder.types";

export default function AppsListPage() {
    const router = useRouter();

    const handleViewApp = (app: CustomAppConfig) => {
        router.push(`/apps/app-builder/apps/${app.id}`);
    };

    const handleCreateApp = () => {
        router.push("/apps/app-builder/apps/create");
    };

    const handleEditApp = (app: CustomAppConfig) => {
        router.push(`/apps/app-builder/apps/${app.id}/edit`);
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <SmartAppList
                onSelectApp={handleViewApp}
                onCreateApp={handleCreateApp}
                onEditApp={handleEditApp}
            />
        </div>
    );
}
