"use client";

import React from "react";
import ResponsiveModuleHeaderWithProvider from "@/components/matrx/navigation/ResponsiveModuleHeaderWithProvider";
import { filteredPages, MODULE_HOME, MODULE_NAME } from "./config";

export default function Layout({ children }: { children: React.ReactNode }) {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 z-10 bg-matrx-card-background">
                <ResponsiveModuleHeaderWithProvider
                    pages={filteredPages}
                    currentPath={currentPath}
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
            </div>
            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-6">{children}</main>
        </div>
    );
}
