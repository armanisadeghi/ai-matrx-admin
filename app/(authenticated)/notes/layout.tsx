import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata with automatic favicon for the Notes route
export const metadata = createRouteMetadata("/notes", {
    title: "Notes",
    description: "Create and manage your notes",
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-[calc(100vh-2.5rem)] flex flex-col bg-textured">
            {/* This layout ensures the scraper page fits within the available viewport height */}
            {/* Account for the fixed header (h-10 = 2.5rem) */}
            <div className="flex-1 flex flex-col min-h-0">
                {children}
            </div>
        </div>
    );
}
