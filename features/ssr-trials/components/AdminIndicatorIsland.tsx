"use client";

import dynamic from "next/dynamic";

// Dynamically imported so the admin overlay code never enters the initial bundle.
// Only downloaded + mounted after the shell has painted and Redux is hydrated.
const AdminIndicatorWrapper = dynamic(
    () => import("@/components/admin/controls/AdminIndicatorWrapper"),
    { ssr: false, loading: () => null }
);

export default function AdminIndicatorIsland() {
    return <AdminIndicatorWrapper />;
}
