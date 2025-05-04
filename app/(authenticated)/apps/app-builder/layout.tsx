"use client";

import React, { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TabsNavigation from "@/components/ui/tabs-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppBuilderLayoutProps {
    children: ReactNode;
}

export default function AppBuilderLayout({ children }: AppBuilderLayoutProps) {
    const pathname = usePathname();
    const isMobile = useIsMobile();

    // Define main sections for the app builder
    const sections = [
        { id: "Overview", label: "Overview", href: "/apps/app-builder" },
        { id: "Fields", label: "Fields", href: "/apps/app-builder/fields" },
        { id: "Containers", label: "Containers", href: "/apps/app-builder/containers" },
        { id: "Applets", label: "Applets", href: "/apps/app-builder/applets" },
        { id: "Apps", label: "Apps", href: "/apps/app-builder/apps" },
    ];

    // Helper to determine if a path is active
    const isActive = (path: string) => {
        if (path === "/apps/app-builder") {
            return pathname === path;
        }
        return pathname.startsWith(path);
    };

    // Find the active section
    const activeSection = sections.find((section) => isActive(section.href))?.id || "Overview";

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex items-center w-full mb-4 relative">
                {!isMobile && (
                    <h1 className="text-2xl font-bold text-blue-500 absolute left-0 z-10">Matrx Builder</h1>
                )}
                <div className="w-full">
                    <TabsNavigation tabs={sections} activeId={activeSection} centered={true} className="pl-48" />
                </div>
            </div>

            <div className="flex flex-col space-y-6">
                <main className="min-h-[calc(100vh-200px)]">{children}</main>
            </div>
        </div>
    );
}
