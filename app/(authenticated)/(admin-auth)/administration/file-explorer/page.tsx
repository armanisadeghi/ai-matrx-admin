'use client';

import LocalFileAccess from "@/app/(authenticated)/admin/components/LocalFileAccess";

export default function FileExplorerPage() {
    return (
        <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
            <LocalFileAccess />
        </div>
    );
}

