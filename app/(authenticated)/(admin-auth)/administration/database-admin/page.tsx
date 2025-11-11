'use client';

import DatabaseAdminDashboard from "@/app/(authenticated)/admin/components/database-admin/DatabaseAdminDashboard";

export default function DatabaseAdminPage() {
    return (
        <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
            <DatabaseAdminDashboard />
        </div>
    );
}

